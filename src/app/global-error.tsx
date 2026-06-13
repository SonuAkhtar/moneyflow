"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0b0f14",
          color: "#e6edf3",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Something went wrong</h2>
        <p style={{ margin: 0, maxWidth: "28rem", opacity: 0.75 }}>
          The app hit an unexpected error. Your data is safe, try reloading.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "#4ece6e",
            color: "#06210f",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
