import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { BoundingBox } from "@/components/BoundingBoxCanvas";

/**
 * Detector status states.
 */
export type DetectorStatus = "idle" | "loading" | "ready" | "error";

/**
 * Card detection result with additional metadata.
 *
 * @interface CardDetection
 * @extends {BoundingBox}
 */
export interface CardDetection extends BoundingBox {
  /**
   * Class/label of the detected object.
   *
   * @type {string}
   */
  class: string;
  
  /**
   * Confidence score of the detection (0-1).
   *
   * @type {number}
   */
  confidence: number;
  
  /**
   * Timestamp of the detection.
   *
   * @type {number}
   */
  timestamp: number;
}

/**
 * Classes in COCO-SSD model that can represent a card-like object.
 */
const CARD_CLASSES = ["book", "cell phone", "remote", "mouse"];

/**
 * Singleton class for managing the TensorFlow.js COCO-SSD model.
 */
class CardDetector {
  private model: cocoSsd.ObjectDetection | null = null;
  private status: DetectorStatus = "idle";
  private loadPromise: Promise<cocoSsd.ObjectDetection> | null = null;
  private lastDetectionTime = 0;
  private detectionThrottleMs = 100; // Throttle detection frequency
  
  /**
   * Gets the current status of the detector.
   *
   * @returns {DetectorStatus} Current detector status.
   */
  getStatus(): DetectorStatus {
    return this.status;
  }
  
  /**
   * Loads the COCO-SSD model if it hasn't been loaded yet.
   *
   * @async
   * @returns {Promise<cocoSsd.ObjectDetection>} The loaded model.
   * @throws {Error} If model loading fails.
   */
  async loadModel(): Promise<cocoSsd.ObjectDetection> {
    // Return existing model if already loaded
    if (this.model) {
      return this.model;
    }
    
    // Return existing promise if already loading
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    // Update status and initialize model
    this.status = "loading";
    
    try {
      // Load TensorFlow.js
      await tf.ready();
      
      // Create promise for model loading
      this.loadPromise = cocoSsd.load({
        base: "lite_mobilenet_v2", // Faster, smaller model
      });
      
      // Wait for model to load
      this.model = await this.loadPromise;
      this.status = "ready";
      return this.model;
    } catch (error) {
      this.status = "error";
      this.loadPromise = null;
      throw new Error(`Failed to load COCO-SSD model: ${error}`);
    }
  }
  
  /**
   * Detects card-like objects in a video element.
   *
   * @async
   * @param {HTMLVideoElement} videoElement - The video element to detect objects in.
   * @param {number} [confidenceThreshold=0.5] - Minimum confidence score for detections.
   * @returns {Promise<CardDetection[]>} Array of card detections.
   * @throws {Error} If detection fails or model is not loaded.
   */
  async detectCards(
    videoElement: HTMLVideoElement,
    confidenceThreshold = 0.5
  ): Promise<CardDetection[]> {
    // Check if we should throttle detection
    const now = Date.now();
    if (now - this.lastDetectionTime < this.detectionThrottleMs) {
      return [];
    }
    
    this.lastDetectionTime = now;
    
    try {
      // Ensure model is loaded
      if (!this.model) {
        await this.loadModel();
      }
      
      if (!this.model) {
        throw new Error("Model failed to load");
      }
      
      // Get predictions from model
      const predictions = await this.model.detect(videoElement);
      
      // Filter for card-like objects and apply confidence threshold
      const cardDetections = predictions
        .filter(
          (pred) =>
            CARD_CLASSES.includes(pred.class) && 
            pred.score >= confidenceThreshold
        )
        .map((pred) => ({
          x: pred.bbox[0],
          y: pred.bbox[1],
          width: pred.bbox[2],
          height: pred.bbox[3],
          class: pred.class,
          confidence: pred.score,
          timestamp: now,
        }));
      
      return cardDetections;
    } catch (error) {
      console.error("Card detection failed:", error);
      return [];
    }
  }
  
  /**
   * Disposes of the model and frees memory.
   */
  dispose(): void {
    if (this.model) {
      // No direct dispose method in COCO-SSD, but we can clear the reference
      this.model = null;
      this.status = "idle";
      this.loadPromise = null;
      
      // Clean up any tensors in memory
      tf.disposeVariables();
      // Clear backend (safer alternative to purgeUnusedTensors)
      tf.tidy(() => {}); // Run garbage collection
    }
  }
  
  /**
   * Sets the detection throttle time in milliseconds.
   *
   * @param {number} ms - Throttle time in milliseconds.
   */
  setThrottleTime(ms: number): void {
    this.detectionThrottleMs = ms;
  }
}

// Export singleton instance
export const cardDetector = new CardDetector();

