"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { getTurnstileSiteKey } from "@/lib/turnstileClient";

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  onTokenChange: (token: string | null) => void;
  onExpire?: () => void;
  onError?: () => void;
};

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onTokenChange, onExpire, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenChangeRef = useRef(onTokenChange);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);
    const siteKey = getTurnstileSiteKey();

    useEffect(() => {
      onTokenChangeRef.current = onTokenChange;
      onExpireRef.current = onExpire;
      onErrorRef.current = onError;
    });

    const reset = useCallback(() => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      onTokenChangeRef.current(null);
    }, []);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    useEffect(() => {
      if (!siteKey || !containerRef.current) {
        return;
      }

      let cancelled = false;

      const renderWidget = () => {
        if (
          cancelled ||
          !containerRef.current ||
          !window.turnstile ||
          widgetIdRef.current
        ) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenChangeRef.current(token),
          "expired-callback": () => {
            onTokenChangeRef.current(null);
            onExpireRef.current?.();
          },
          "error-callback": () => {
            onTokenChangeRef.current(null);
            onErrorRef.current?.();
          },
        });
      };

      const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
      if (window.turnstile) {
        renderWidget();
      } else if (existingScript) {
        existingScript.addEventListener("load", renderWidget, { once: true });
      } else {
        const script = document.createElement("script");
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [siteKey]);

    if (!siteKey) {
      return null;
    }

    return <div ref={containerRef} className="min-h-[65px]" />;
  },
);

export default TurnstileWidget;
