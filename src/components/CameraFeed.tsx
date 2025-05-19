"use client";

import React, { forwardRef, useCallback, useEffect, useState } from "react";
import Webcam from "react-webcam";

/**
 * Props for the CameraFeed component.
 *
 * @interface CameraFeedProps
 */
interface CameraFeedProps {
  /**
   * Optional CSS class name to apply to the component.
   *
   * @type {string}
   */
  className?: string;
}

/**
 * Camera permission states.
 */
type CameraPermissionState = "pending" | "granted" | "denied" | "error";

/**
 * CameraFeed component for accessing and displaying the device's camera feed.
 *
 * @async
 * @returns Full-screen camera feed with permission handling.
 */
const CameraFeed = forwardRef<Webcam, CameraFeedProps>(
  ({ className = "" }, ref) => {
    const [permissionState, setPermissionState] =
      useState<CameraPermissionState>("pending");

    // Optimal camera constraints for Pokemon card detection
    const videoConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      facingMode: "environment", // Use back camera on mobile devices
    };

    /**
     * Handle camera errors and update permission state.
     *
     * @param {Error} error - The error that occurred.
     */
    const handleCameraError = useCallback((error: string | DOMException) => {
      console.error("Camera error:", error);
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setPermissionState("denied");
      } else {
        setPermissionState("error");
      }
    }, []);

    /**
     * Handle successful camera initialization.
     */
    const handleCameraSuccess = useCallback(() => {
      setPermissionState("granted");
    }, []);

    // Request camera permissions when component mounts
    useEffect(() => {
      const checkCameraPermissions = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          // Clean up the test stream immediately
          stream.getTracks().forEach((track) => track.stop());
          setPermissionState("granted");
        } catch (err) {
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setPermissionState("denied");
          } else {
            setPermissionState("error");
          }
        }
      };

      checkCameraPermissions();
    }, []);

    return (
      <div 
        className={className}
        style={{ 
          position: 'relative', 
          height: '100vh', 
          width: '100vw', 
          overflow: 'hidden', 
          backgroundColor: 'black' 
        }}
      >
        {permissionState === "pending" && (
          <div style={{ 
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'black',
            color: 'white'
          }}>
            <p style={{ fontSize: '1.125rem' }}>Requesting camera permission...</p>
          </div>
        )}

        {permissionState === "denied" && (
          <div style={{ 
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'black',
            color: 'white'
          }}>
            <div style={{ 
              maxWidth: '28rem', 
              padding: '1rem', 
              textAlign: 'center' 
            }}>
              <p style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                color: 'red',
                marginBottom: '1rem'
              }}>
                Camera Access Denied
              </p>
              <p>
                This app needs camera access to detect Pokemon cards. Please
                enable camera access in your browser settings and reload the
                page.
              </p>
            </div>
          </div>
        )}

        {permissionState === "error" && (
          <div style={{ 
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'black',
            color: 'white'
          }}>
            <div style={{ 
              maxWidth: '28rem', 
              padding: '1rem', 
              textAlign: 'center' 
            }}>
              <p style={{ 
                fontSize: '1.25rem', 
                fontWeight: 'bold', 
                color: 'red',
                marginBottom: '1rem'
              }}>
                Camera Error
              </p>
              <p>
                Unable to access the camera. Please ensure your device has a working
                camera and try again.
              </p>
            </div>
          </div>
        )}

        {permissionState === "granted" && (
          <Webcam
            ref={ref}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            onUserMediaError={handleCameraError}
            onUserMedia={handleCameraSuccess}
            style={{ height: '100%', width: '100%', objectFit: 'cover' }}
            mirrored={false} // Don't mirror to make text readable
          />
        )}
      </div>
    );
  }
);

// Display name for debugging and React DevTools
CameraFeed.displayName = "CameraFeed";

export default CameraFeed;

