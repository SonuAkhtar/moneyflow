"use client";

import { useEffect } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "v1";

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

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange,
      );
    }

    const register = () => {
      navigator.serviceWorker
        .register(`/sw.js?v=${BUILD_ID}`)
        .then((registration) => {
          reg = registration;
          void registration.update();
        })
        .catch(() => undefined);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void reg?.update();
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
