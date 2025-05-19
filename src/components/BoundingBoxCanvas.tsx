"use client";

import React, { useRef, useEffect } from "react";

/**
 * BoundingBox interface defining a detection rectangle.
 *
 * @interface BoundingBox
 */
export interface BoundingBox {
  /**
   * X-coordinate of the top-left corner.
   *
   * @type {number}
   */
  x: number;
  
  /**
   * Y-coordinate of the top-left corner.
   *
   * @type {number}
   */
  y: number;
  
  /**
   * Width of the bounding box.
   *
   * @type {number}
   */
  width: number;
  
  /**
   * Height of the bounding box.
   *
   * @type {number}
   */
  height: number;
  
  /**
   * Optional confidence score of the detection.
   *
   * @type {number}
   */
  confidence?: number;
  
  /**
   * Optional class/label of the detected object.
   *
   * @type {string}
   */
  class?: string;
}

/**
 * Props for the BoundingBoxCanvas component.
 *
 * @interface BoundingBoxCanvasProps
 */
interface BoundingBoxCanvasProps {
  /**
   * Array of bounding boxes to draw.
   *
   * @type {BoundingBox[]}
   */
  boxes: BoundingBox[];
  
  /**
   * Width of the original detection source.
   *
   * @type {number}
   */
  sourceWidth: number;
  
  /**
   * Height of the original detection source.
   *
   * @type {number}
   */
  sourceHeight: number;
  
  /**
   * Optional CSS class name to apply to the component.
   *
   * @type {string}
   */
  className?: string;
  
  /**
   * Optional line color for the bounding box.
   *
   * @type {string}
   */
  lineColor?: string;
  
  /**
   * Optional line width for the bounding box.
   *
   * @type {number}
   */
  lineWidth?: number;
}

/**
 * BoundingBoxCanvas component that overlays and draws detection boxes on the camera feed.
 *
 * @returns A canvas element positioned above the camera feed for drawing bounding boxes.
 */
const BoundingBoxCanvas: React.FC<BoundingBoxCanvasProps> = ({
  boxes,
  sourceWidth,
  sourceHeight,
  className = "",
  lineColor = "#F6D200", // bones-gold
  lineWidth = 3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  /**
   * Draws bounding boxes on the canvas with proper scaling.
   *
   * @async
   * @throws {Error} If canvas context cannot be obtained.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Size canvas to fill the container
    const resizeCanvas = () => {
      // Safety check: ensure canvas still exists
      if (!canvas) return;
      
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        
        // After resize, redraw boxes
        drawBoxes();
      }
    };
    
    // Handle window resize for responsive drawing
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    
    /**
     * Draw all bounding boxes with scaling applied.
     */
    function drawBoxes() {
      // Safety check: ensure canvas and context still exist
      if (!canvas || !ctx) return;
      
      // Calculate scale factor between source dimensions and canvas dimensions
      const scaleX = canvas.width / sourceWidth;
      const scaleY = canvas.height / sourceHeight;
      
      // Clear canvas before redrawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw each box
      boxes.forEach((box) => {
        // Scale box coordinates to canvas size
        const scaledX = box.x * scaleX;
        const scaledY = box.y * scaleY;
        const scaledWidth = box.width * scaleX;
        const scaledHeight = box.height * scaleY;
        
        // Set drawing styles
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        // Draw the rectangle
        ctx.beginPath();
        ctx.rect(scaledX, scaledY, scaledWidth, scaledHeight);
        ctx.stroke();
        
        // Add corner highlights for better visibility
        const cornerSize = Math.min(20, scaledWidth * 0.2, scaledHeight * 0.2);
        
        // Function to draw corner highlights
        const drawCorner = (x: number, y: number, xDir: number, yDir: number) => {
          ctx.beginPath();
          ctx.moveTo(x, y + yDir * cornerSize);
          ctx.lineTo(x, y);
          ctx.lineTo(x + xDir * cornerSize, y);
          ctx.stroke();
        };
        
        // Draw corners
        drawCorner(scaledX, scaledY, 1, 1); // Top-left
        drawCorner(scaledX + scaledWidth, scaledY, -1, 1); // Top-right
        drawCorner(scaledX, scaledY + scaledHeight, 1, -1); // Bottom-left
        drawCorner(scaledX + scaledWidth, scaledY + scaledHeight, -1, -1); // Bottom-right
        
        // Draw confidence if available
        if (box.confidence !== undefined) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(scaledX, scaledY - 20, 70, 20);
          ctx.fillStyle = lineColor;
          ctx.font = "12px sans-serif";
          ctx.fillText(
            `${Math.round(box.confidence * 100)}%`,
            scaledX + 5,
            scaledY - 5
          );
        }
      });
    }
    
    // Initial draw
    drawBoxes();
    
    // Cleanup resize listener
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [boxes, sourceWidth, sourceHeight, lineColor, lineWidth]);
  
  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-0 left-0 h-full w-full z-20 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default BoundingBoxCanvas;

