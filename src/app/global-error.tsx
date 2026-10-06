"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body style={{ background: "#000", color: "#f4f6fa", fontFamily: "system-ui, sans-serif", padding: "3rem 1.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: "#8a93a6" }}>Your unsaved entries are kept. Reload to continue.</p>
        <button onClick={() => window.location.reload()}
          style={{ marginTop: 16, height: 44, padding: "0 16px", borderRadius: 12, border: 0, background: "#4d7fff", color: "#fff", fontWeight: 600 }}>
          Reload
        </button>
        <p style={{ marginTop: 24, fontSize: 12, color: "#8a93a6", wordBreak: "break-word" }}>Details: {error.message || "unknown error"}{error.digest ? ` (${error.digest})` : ""}</p>
      </body>
    </html>
  );
}
