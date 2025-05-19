"use client";

import React from "react";
import { clsx } from "clsx";

/**
 * Possible status states for the Pokemon Scanner application.
 */
export type StatusState = 
  | "no-card" 
  | "card-detected" 
  | "identifying" 
  | "identified" 
  | "identification-failed";

/**
 * Props for the StatusOverlay component.
 *
 * @interface StatusOverlayProps
 */
interface StatusOverlayProps {
  /**
   * Current status state of the Pokemon Scanner.
   *
   * @type {StatusState}
   */
  status: StatusState;
  
  /**
   * Optional Pokemon name when status is "identified".
   *
   * @type {string}
   */
  pokemonName?: string;
  
  /**
   * Optional CSS class name to apply to the component.
   *
   * @type {string}
   */
  className?: string;
}

/**
 * StatusOverlay component that displays the current scanner status in the top-left corner.
 *
 * @returns A floating status box with current application state.
 */
const StatusOverlay: React.FC<StatusOverlayProps> = ({ 
  status, 
  pokemonName = "", 
  className = "" 
}) => {
  /**
   * Get status message based on the current state.
   *
   * @returns {string} Human-readable status message.
   */
  const getStatusMessage = (): string => {
    switch (status) {
      case "no-card":
        return "No Card Detected";
      case "card-detected":
        return "Card Detected";
      case "identifying":
        return "Identifying Pokemon...";
      case "identified":
        return `Identified as ${pokemonName}`;
      case "identification-failed":
        return "Could not identify Pokemon";
      default:
        return "Scanning...";
    }
  };

  /**
   * Get status color based on the current state.
   *
   * @returns {string} Tailwind CSS color class.
   */
  const getStatusColor = (): string => {
    switch (status) {
      case "no-card":
        return "text-bones-yellow";
      case "card-detected":
        return "text-bones-cyan";
      case "identifying":
        return "text-bones-magenta";
      case "identified":
        return "text-bones-lightsteelblue";
      case "identification-failed":
        return "text-bones-red";
      default:
        return "text-bones-white";
    }
  };

  return (
    <div 
      className={clsx(
        "fixed top-4 left-4 z-10 max-w-xs rounded-lg bg-bones-black/80 p-3 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <div 
            className={clsx(
              "h-3 w-3 rounded-full animate-pulse", 
              status === "identifying" ? "bg-bones-magenta" : getStatusColor()
            )} 
          />
          <h2 className="text-sm font-bold uppercase tracking-wider text-bones-white">
            Status
          </h2>
        </div>
        <p className={clsx("text-base font-medium", getStatusColor())}>
          {getStatusMessage()}
        </p>
      </div>
    </div>
  );
};

export default StatusOverlay;

