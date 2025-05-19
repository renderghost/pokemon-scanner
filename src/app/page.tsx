"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Webcam from "react-webcam";

import StatusOverlay from "@/components/StatusOverlay";
import BoundingBoxCanvas from "@/components/BoundingBoxCanvas";
import useScanner from "@/hooks/useScanner";

// Import CameraFeed with SSR disabled (to avoid SSR webcam errors)
const CameraFeed = dynamic(() => import("@/components/CameraFeed"), {
  ssr: false,
});

/**
 * Loading spinner component.
 *
 * @returns {JSX.Element} A loading spinner.
 */
const LoadingSpinner = () => (
  <div style={{ 
    position: 'fixed', 
    inset: 0, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center'
  }}>
    <div style={{
      width: '3rem',
      height: '3rem',
      borderRadius: '50%',
      border: '4px solid gold',
      borderTopColor: 'transparent',
      animation: 'spin 1s linear infinite'
    }} />
  </div>
);

/**
 * Main application page component for the Pokemon Scanner.
 *
 * @returns {JSX.Element} The main page component.
 */
export default function PokemonScannerPage() {
  // Reference to the webcam component
  const webcamRef = useRef<Webcam>(null);
  
  // Initialize scanner with the webcam reference
  const [scannerResult, { startScanning, stopScanning }] = useScanner(webcamRef, {
    debug: process.env.NODE_ENV === "development",
    detectionConfidence: 0.5,
    identificationConfidence: 0.7,
    autoStart: true,
  });
  
  const { 
    status, 
    detections, 
    pokemonMatch, 
    videoDimensions 
  } = scannerResult;
  
  return (
    <main style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Suspense fallback={<LoadingSpinner />}>
        {/* Camera feed component */}
        <CameraFeed ref={webcamRef} />
        
        {/* Bounding box overlay */}
        {detections.length > 0 && videoDimensions.width > 0 && (
          <BoundingBoxCanvas
            boxes={detections}
            sourceWidth={videoDimensions.width}
            sourceHeight={videoDimensions.height}
            lineColor="gold"
          />
        )}
        
        {/* Status overlay */}
        <StatusOverlay 
          status={status} 
          pokemonName={pokemonMatch?.pokemon.name || ""} 
        />
        
        {/* Camera control buttons */}
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '1rem',
          zIndex: 30
        }}>
          <button 
            onClick={startScanning} 
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'linen',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Start Scanning
          </button>
          <button 
            onClick={stopScanning} 
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'red',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Stop Scanning
          </button>
        </div>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="debug-overlay">
            <p>Status: {status}</p>
            <p>Detections: {detections.length}</p>
            {pokemonMatch && (
              <p>
                Pokemon: {pokemonMatch.pokemon.name} (
                {Math.round(pokemonMatch.confidence * 100)}%)
              </p>
            )}
          </div>
        )}
      </Suspense>
    </main>
  );
}
