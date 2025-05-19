"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { BoundingBox } from "@/components/BoundingBoxCanvas";
import { StatusState } from "@/components/StatusOverlay";
import { cardDetector, CardDetection } from "@/lib/detector";
import { ocrProcessor, OcrResult } from "@/lib/ocr";
import { pokemonIdentifier, PokemonMatch } from "@/lib/pokemon";
import type Webcam from "react-webcam";

/**
 * Possible states of the scanner process.
 */
export type ScannerProcessState = "initializing" | "ready" | "scanning" | "error";

/**
 * Scanner result containing detection, OCR, and identified Pokemon.
 *
 * @interface ScannerResult
 */
export interface ScannerResult {
  /**
   * Current scanning status.
   *
   * @type {StatusState}
   */
  status: StatusState;
  
  /**
   * Detected card bounding boxes.
   *
   * @type {BoundingBox[]}
   */
  detections: BoundingBox[];
  
  /**
   * Extracted OCR text result.
   *
   * @type {OcrResult | null}
   */
  ocrResult: OcrResult | null;
  
  /**
   * Identified Pokemon match.
   *
   * @type {PokemonMatch | null}
   */
  pokemonMatch: PokemonMatch | null;
  
  /**
   * Video dimensions for scaling.
   *
   * @type {object}
   */
  videoDimensions: {
    width: number;
    height: number;
  };
}

/**
 * Hook configuration options.
 *
 * @interface ScannerOptions
 */
interface ScannerOptions {
  /**
   * Confidence threshold for card detection (0-1).
   *
   * @type {number}
   */
  detectionConfidence?: number;
  
  /**
   * Confidence threshold for Pokemon identification (0-1).
   *
   * @type {number}
   */
  identificationConfidence?: number;
  
  /**
   * Whether to enable debugging logs.
   *
   * @type {boolean}
   */
  debug?: boolean;
  
  /**
   * Whether to automatically start scanning.
   *
   * @type {boolean}
   */
  autoStart?: boolean;
}

/**
 * Default options for the scanner.
 */
const DEFAULT_OPTIONS: ScannerOptions = {
  detectionConfidence: 0.5,
  identificationConfidence: 0.7,
  debug: false,
  autoStart: true,
};

/**
 * Custom hook that integrates card detection, OCR, and Pokemon identification.
 *
 * @param {React.RefObject<Webcam | null>} webcamRef - Reference to the webcam component.
 * @param {ScannerOptions} options - Configuration options for the scanner.
 * @returns {[ScannerResult, { startScanning: () => void; stopScanning: () => void }]} The current scanner result and control functions.
 */
export function useScanner(
  webcamRef: React.RefObject<Webcam | null>,
  options: ScannerOptions = {}
): [ScannerResult, { startScanning: () => void; stopScanning: () => void }] {
  // Merge provided options with defaults
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State for scanner process
  const [processState, setProcessState] = useState<ScannerProcessState>("initializing");
  
  // State for scan results
  const [result, setResult] = useState<ScannerResult>({
    status: "no-card",
    detections: [],
    ocrResult: null,
    pokemonMatch: null,
    videoDimensions: { width: 0, height: 0 },
  });
  
  // Animation frame reference for cleanup
  const animationFrameRef = useRef<number | null>(null);
  
  // Refs to track last detection time for throttling
  const lastDetectionTime = useRef<number>(0);
  const lastOcrTime = useRef<number>(0);
  const lastIdentificationTime = useRef<number>(0);
  
  /**
   * Initializes all required services.
   *
   * @async
   */
  const initializeServices = useCallback(async () => {
    try {
      // Initialize card detector
      await cardDetector.loadModel();
      
      // Initialize OCR processor
      await ocrProcessor.initialize();
      
      // Initialize Pokemon identifier
      await pokemonIdentifier.initialize();
      
      setProcessState("ready");
    } catch (error) {
      console.error("Failed to initialize scanner services:", error);
      setProcessState("error");
    }
  }, []);
  
  /**
   * Main scanning process function.
   */
  const scanFrame = useCallback(async () => {
    // Get the video element from the webcam ref
    // Use optional chaining to safely access properties even if webcamRef.current is null
    const video = webcamRef.current?.video;
    
    // Skip processing and schedule next frame if video isn't ready or process isn't ready
    if (!video || !video.readyState || video.readyState < 2 || processState !== "ready") {
      // Schedule next frame if we're not ready yet
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    
    try {
      // Get video dimensions for scaling
      const videoDimensions = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      
      // 1. Detect cards
      const now = Date.now();
      const detectionThrottleMs = 100;
      let detections: CardDetection[] = [];
      
      if (now - lastDetectionTime.current > detectionThrottleMs) {
        lastDetectionTime.current = now;
        // Ensure video element exists before passing to detector
        if (video) {
          detections = await cardDetector.detectCards(video, opts.detectionConfidence);
        }
      } else {
        detections = result.detections as CardDetection[];
      }
      
      // Update status based on detections
      let status: StatusState = "no-card";
      let ocrResult = result.ocrResult;
      let pokemonMatch = result.pokemonMatch;
      
      if (detections.length > 0) {
        // Card detected, update status
        status = "card-detected";
        
        // 2. Perform OCR on the detected card region
        const ocrThrottleMs = 2000;
        if (now - lastOcrTime.current > ocrThrottleMs) {
          lastOcrTime.current = now;
          status = "identifying";
          
          const largestDetection = detections.reduce(
            (largest, current) => {
              const largestArea = largest.width * largest.height;
              const currentArea = current.width * current.height;
              return currentArea > largestArea ? current : largest;
            },
            detections[0]
          );
          
          // Ensure video element exists before passing to OCR processor
          if (video) {
            ocrResult = await ocrProcessor.extractText(video, largestDetection);
          }
          
          // 3. Identify Pokemon from OCR result
          if (ocrResult) {
            const identificationThrottleMs = 2000;
            if (now - lastIdentificationTime.current > identificationThrottleMs) {
              lastIdentificationTime.current = now;
              
              pokemonMatch = await pokemonIdentifier.identifyPokemon(
                ocrResult.text,
                ocrResult.words,
                opts.identificationConfidence
              );
              
              // Update status based on Pokemon identification
              status = pokemonMatch ? "identified" : "identification-failed";
            }
          }
        }
      } else {
        // No card detected, reset OCR and identification results
        if (ocrResult || pokemonMatch) {
          ocrResult = null;
          pokemonMatch = null;
        }
      }
      
      // Update the result state
      setResult({
        status,
        detections,
        ocrResult,
        pokemonMatch,
        videoDimensions,
      });
      
      // Debug logging if enabled
      if (opts.debug) {
        if (detections.length > 0) {
          console.log(
            `Detected ${detections.length} cards, status: ${status}`
          );
        }
        if (ocrResult) {
          console.log(`OCR result: ${JSON.stringify(ocrResult)}`);
        }
      }
    } catch (error) {
      console.error("Error in scanning process:", error);
    }
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [webcamRef, processState, result, opts.detectionConfidence, opts.identificationConfidence, opts.debug]);
  
  /**
   * Starts the scanning process.
   */
  const startScanning = useCallback(() => {
    if (processState === "ready" && !animationFrameRef.current) {
      setProcessState("scanning");
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }
  }, [processState, scanFrame]);
  
  /**
   * Stops the scanning process.
   */
  const stopScanning = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setProcessState("ready");
  }, []);
  
  // Initialize services when component mounts
  useEffect(() => {
    initializeServices();
    
    // Cleanup function for releasing resources
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initializeServices]);
  
  // Auto-start scanning if enabled
  useEffect(() => {
    if (processState === "ready" && opts.autoStart) {
      startScanning();
    }
  }, [processState, opts.autoStart, startScanning]);
  
  return [result, { startScanning, stopScanning }];
}

export default useScanner;

