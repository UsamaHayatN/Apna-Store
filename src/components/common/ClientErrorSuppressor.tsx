"use client";

import { useEffect } from "react";

/**
 * ClientErrorSuppressor:
 * Suppresses known benign browser warnings in development/iframe preview
 * such as "ResizeObserver loop completed with undelivered notifications."
 */
export function ClientErrorSuppressor() {
  useEffect(() => {
    // Safe iframe fallbacks for alert and confirm to avoid DOMException crashes
    if (typeof window !== "undefined") {
      const originalAlert = window.alert?.bind(window);
      const originalConfirm = window.confirm?.bind(window);

      window.alert = (message?: string) => {
        try {
          if (originalAlert) originalAlert(message);
        } catch {
          console.warn("[App Alert in Sandboxed Environment]:", message);
        }
      };

      window.confirm = (message?: string) => {
        try {
          if (originalConfirm) return originalConfirm(message);
          return true;
        } catch {
          console.warn("[App Confirm in Sandboxed Environment]:", message);
          return true;
        }
      };
    }

    const handleWindowError = (e: ErrorEvent) => {
      const msg = e.message || "";
      if (
        msg.includes("ResizeObserver loop") ||
        msg.includes("ResizeObserver loop completed with undelivered notifications") ||
        msg.includes("ResizeObserver loop limit exceeded") ||
        msg.includes("Blocked a call to")
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    window.addEventListener("error", handleWindowError);
    return () => window.removeEventListener("error", handleWindowError);
  }, []);

  return null;
}
