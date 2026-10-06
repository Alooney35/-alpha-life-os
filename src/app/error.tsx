"use client";
import { useEffect } from "react";

// Errors that mean "the phone has an older copy of the app than the server" — a reload fixes them
const STALE = /Server Action|ChunkLoad|Loading chunk|Failed to fetch|dynamically imported module|unexpected response/i;

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const last = Number(sessionStorage.getItem("alpha:auto-reload") ?? 0);
    // Reload once automatically; unsaved workout and purchase entries are restored from autosave
    if (STALE.test(error.message) && Date.now() - last > 15_000) {
      sessionStorage.setItem("alpha:auto-reload", String(Date.now()));
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="space-y-4 pt-10">
      <h1 className="font-display text-4xl font-bold">Something went wrong</h1>
      <p className="text-muted">Your unsaved entries are kept. Reload to pick up where you left off.</p>
      <div className="flex gap-2">
        <button onClick={() => window.location.reload()} className="h-11 rounded-xl bg-accent px-4 font-semibold text-white">Reload</button>
        <button onClick={reset} className="h-11 rounded-xl border border-line px-4 font-semibold">Try again</button>
      </div>
      <p className="break-words text-xs text-muted">Details: {error.message || "unknown error"}{error.digest ? ` (${error.digest})` : ""}</p>
    </div>
  );
}
