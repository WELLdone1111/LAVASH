import { isTauri } from "@tauri-apps/api/core";
import { listen, type Event, type EventCallback, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

/**
 * Subscribe to Tauri events with automatic unlisten on unmount.
 */
export function useTauriEvent<T>(event: string, handler: EventCallback<T>) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!isTauri()) return;

    let unlistenFn: UnlistenFn | null = null;
    let isMounted = true;

    const setup = async () => {
      try {
        const fn = await listen<T>(event, (e: Event<T>) => {
          if (isMounted && handlerRef.current) {
            handlerRef.current(e);
          }
        });
        if (isMounted) {
          unlistenFn = fn;
        } else {
          fn();
        }
      } catch (error) {
        console.error(`[useTauriEvent] Failed to listen to event: ${event}`, error);
      }
    };

    void setup();

    return () => {
      isMounted = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [event]);
}
