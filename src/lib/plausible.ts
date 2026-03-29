export interface PlausibleEventProps {
  tool_name?: string;
  theme?: string;
  file_count?: number;
  error_message?: string;
  [key: string]: any;
}

/**
 * Tracks a custom event using Plausible Analytics.
 * Requires the Plausible script to be loaded in index.html.
 */
export const trackEvent = (eventName: string, props?: PlausibleEventProps) => {
  if (typeof window !== 'undefined' && 'plausible' in window) {
    (window as any).plausible(eventName, { props });
  } else if (import.meta.env.DEV) {
    // Log in development for debugging
    console.log(`[Plausible Event] ${eventName}`, props || {});
  }
};
