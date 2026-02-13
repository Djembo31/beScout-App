"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ background: "#0a0a0a", color: "white", fontFamily: "system-ui", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "1rem" }}>Etwas ist schiefgelaufen</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "1.5rem" }}>Ein unerwarteter Fehler ist aufgetreten.</p>
          <button
            onClick={reset}
            style={{ background: "#FFD700", color: "black", border: "none", padding: "0.75rem 2rem", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer" }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
