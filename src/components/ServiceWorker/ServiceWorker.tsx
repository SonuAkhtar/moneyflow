"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/uiStore";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "v1";
const UPDATE_TITLE = "New version available";

export const ServiceWorker = () => {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let reg: ServiceWorkerRegistration | undefined;

    // Only reload once the user asked for the update, so a deploy never
    // wipes in-progress input.
    let reloadRequested = false;
    let refreshing = false;
    const onControllerChange = () => {
      if (!reloadRequested || refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const promptUpdate = (worker: ServiceWorker) => {
      const { toasts, pushToast } = useUiStore.getState();
      if (toasts.some((t) => t.title === UPDATE_TITLE)) return;
      pushToast({
        variant: "info",
        title: UPDATE_TITLE,
        action: {
          label: "Reload",
          onClick: () => {
            reloadRequested = true;
            // Another tab may have activated this update already.
            if (worker.state === "activated") window.location.reload();
            else worker.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
    };
    // A waiting worker only matters when an older one controls this page.
    const checkWaiting = () => {
      if (reg?.waiting && navigator.serviceWorker.controller) {
        promptUpdate(reg.waiting);
      }
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    const register = () => {
      navigator.serviceWorker
        .register(`/sw.js?v=${BUILD_ID}`)
        .then((registration) => {
          reg = registration;
          checkWaiting();
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed") checkWaiting();
            });
          });
          void registration.update();
        })
        .catch(() => undefined);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      checkWaiting();
      void reg?.update();
    };
    document.addEventListener("visibilitychange", onVisible);

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      window.removeEventListener("load", register);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
};
