import { createWorker, createScheduler, RecognizeResult, Scheduler, Worker } from 'tesseract.js';
import { CardDetection } from './detector';

// Note: RecognizeResult type is used for typing the return value from scheduler.addJob('recognize', ...)

/**
 * Status of the OCR system.
 */
export type OcrStatus = 'idle' | 'loading' | 'ready' | 'processing' | 'error';

/**
 * Configuration options for OCR processing.
 *
 * @interface OcrOptions
 */
export interface OcrOptions {
  /**
   * Language for OCR recognition.
   *
   * @type {string}
   */
  lang?: string;
  
  /**
   * Whether to apply preprocessing to improve OCR results.
   *
   * @type {boolean}
   */
  preprocess?: boolean;
  
  /**
   * Minimum confidence threshold for recognized text.
   *
   * @type {number}
   */
  confidenceThreshold?: number;
  
  /**
   * Whether to log progress to console.
   *
   * @type {boolean}
   */
  debug?: boolean;
}

/**
 * Result of OCR text recognition.
 *
 * @interface OcrResult
 */
export interface OcrResult {
  /**
   * Extracted text from the image.
   *
   * @type {string}
   */
  text: string;
  
  /**
   * Confidence level of the recognition (0-100).
   *
   * @type {number}
   */
  confidence: number;
  
  /**
   * Individual words detected in the image.
   *
   * @type {string[]}
   */
  words: string[];
  
  /**
   * Processing time in milliseconds.
   *
   * @type {number}
   */
  processingTimeMs: number;
  
  /**
   * Timestamp when recognition was performed.
   *
   * @type {number}
   */
  timestamp: number;
}

/**
 * Singleton class for managing Tesseract.js OCR functionality.
 */
class OcrProcessor {
  private worker: Worker | null = null;
  private scheduler: Scheduler | null = null;
  private status: OcrStatus = 'idle';
  private lastOcrTime = 0;
  private ocrThrottleMs = 2000; // Only run OCR every 2 seconds
  private defaultOptions: OcrOptions = {
    lang: 'eng',
    preprocess: true,
    confidenceThreshold: 60,
    debug: false,
  };
  
  /**
   * Gets the current status of the OCR processor.
   *
   * @returns {OcrStatus} Current OCR status.
   */
  getStatus(): OcrStatus {
    return this.status;
  }
  
  /**
   * Initializes the Tesseract worker and scheduler.
   *
   * @async
   * @param {OcrOptions} [options] - Optional configuration options.
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails.
   */
  async initialize(options?: Partial<OcrOptions>): Promise<void> {
    if (this.worker && this.scheduler) {
      return; // Already initialized
    }
    
    const opts = { ...this.defaultOptions, ...options };
    this.status = 'loading';
    
    try {
      // Create and initialize worker
      this.worker = await createWorker('eng');
      if (opts.debug) {
        console.log('OCR worker created successfully');
      }
      
      // Configure parameters with debug option (false if undefined)
      await this.configureParameters(opts.debug ?? false);
      
      // Create scheduler
      this.scheduler = createScheduler();
      this.scheduler.addWorker(this.worker);
      
      this.status = 'ready';
    } catch (error) {
      this.status = 'error';
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize OCR:', message);
      throw new Error(`OCR initialization failed: ${message}`);
    }
  }
  
  /**
   * Configures OCR parameters for optimal text recognition.
   *
   * @private
   * @async
   * @param {boolean} [debug=false] - Whether to log debug information
   * @returns {Promise<void>}
   * @throws {Error} If parameter configuration fails
   */
  private async configureParameters(debug: boolean = false): Promise<void> {
    if (!this.worker) {
      throw new Error('Cannot configure parameters: worker not initialized');
    }

    try {
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-',
      });
      
      if (debug) {
        console.log('OCR parameters configured successfully');
      }
    } catch (error) {
      // For OCR to function even with parameter errors, we'll log but not throw
      // This makes our app more resilient to Tesseract.js API changes
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Parameter configuration warning: ${message}`);
      
      if (debug) {
        console.warn('Using default OCR parameters instead');
      }
    }
  }
  
  /**
   * Creates a canvas with an image for OCR processing.
   *
   * @private
   * @param {HTMLVideoElement} videoElement - The video element to capture from.
   * @param {CardDetection} [detection] - Optional detection to crop to.
   * @returns {HTMLCanvasElement} A canvas with the image for OCR.
   */
  private createCanvas(
    videoElement: HTMLVideoElement,
    detection?: CardDetection
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context for OCR');
    }
    
    if (detection) {
      // Extract just the card region
      canvas.width = detection.width;
      canvas.height = detection.height;
      
      ctx.drawImage(
        videoElement,
        detection.x,
        detection.y,
        detection.width,
        detection.height,
        0,
        0,
        detection.width,
        detection.height
      );
    } else {
      // Use the entire video frame
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
    }
    
    return canvas;
  }
  
  /**
   * Preprocesses an image to improve OCR results.
   *
   * @private
   * @param {HTMLCanvasElement} canvas - The canvas with the image to preprocess.
   * @returns {HTMLCanvasElement} The preprocessed canvas.
   */
  private preprocessImage(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale and increase contrast
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Apply threshold to increase contrast
      const threshold = 128;
      const value = gray > threshold ? 255 : 0;
      
      // Set RGB values to the new value
      data[i] = data[i + 1] = data[i + 2] = value;
    }
    
    // Put the modified image data back on the canvas
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
  }
  
  /**
   * Extracts text from a video element, optionally from a specific region.
   *
   * @async
   * @param {HTMLVideoElement} videoElement - The video element to extract text from.
   * @param {CardDetection} [detection] - Optional detection to extract text from.
   * @param {Partial<OcrOptions>} [options] - Optional OCR configuration.
   * @returns {Promise<OcrResult | null>} The extracted text and metadata, or null if throttled.
   * @throws {Error} If OCR processing fails.
   */
  async extractText(
    videoElement: HTMLVideoElement,
    detection?: CardDetection,
    options?: Partial<OcrOptions>
  ): Promise<OcrResult | null> {
    // Check if we should throttle OCR processing
    const now = Date.now();
    if (now - this.lastOcrTime < this.ocrThrottleMs) {
      return null;
    }
    
    this.lastOcrTime = now;
    const startTime = now;
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Ensure OCR is initialized
      if (!this.worker || !this.scheduler) {
        await this.initialize(opts);
      }
      
      if (!this.scheduler) {
        throw new Error('OCR scheduler is not available');
      }
      
      this.status = 'processing';
      
      // Create canvas with image for OCR
      let canvas = this.createCanvas(videoElement, detection);
      
      // Preprocess the image if enabled
      if (opts.preprocess) {
        canvas = this.preprocessImage(canvas);
      }
      
      // Log before OCR if debug is enabled
      if (opts.debug) {
        console.log('Starting OCR processing...');
      }
      
      // Perform OCR
      const result: RecognizeResult = await this.scheduler.addJob('recognize', canvas);
      
      // Log after OCR if debug is enabled
      if (opts.debug) {
        console.log('OCR processing completed');
      }
      
      // Process results - extract words from the text as the words property structure has changed
      const words = Array.from(
        new Set(
          result.data.text
            .split('\n')
            .flatMap(line => line.split(/\s+/))
            .map(word => word.trim())
            .filter(word => word.length > 2) // Filter out very short words
            .filter(word => {
              // Basic filtering
              return word.length > 0 && /^[A-Za-z]+$/.test(word); // Only keep alphabetic words for Pokemon names
            })
        )
      );
      
      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;
      
      this.status = 'ready';
      
      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence || 0, // Use 0 as fallback if confidence is undefined
        words,
        processingTimeMs,
        timestamp: now,
      };
    } catch (error) {
      this.status = 'error';
      console.error('OCR processing failed:', error);
      return null;
    }
  }
  
  /**
   * Terminates the Tesseract worker and releases resources.
   *
   * @async
   * @returns {Promise<void>}
   */
  async terminate(): Promise<void> {
    try {
      if (this.scheduler) {
        await this.scheduler.terminate();
        this.scheduler = null;
      }
      
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }
      
      this.status = 'idle';
    } catch (error) {
      console.error('Error terminating OCR resources:', error);
    }
  }
  
  /**
   * Sets the OCR throttle time in milliseconds.
   *
   * @param {number} ms - Throttle time in milliseconds.
   */
  setThrottleTime(ms: number): void {
    this.ocrThrottleMs = ms;
  }
}

// Export singleton instance
export const ocrProcessor = new OcrProcessor();

