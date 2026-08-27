"use client";
import { useState } from "react";

const ENDPOINT = "/api/highlight";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

/**
 * ⤓ on the Verdict hero. Fetches the auto-generated highlight PNG and either
 * opens the native share sheet (mobile — lets the user pick WhatsApp) or falls
 * back to a plain download (desktop / no Web Share). A cancelled share sheet is
 * not an error.
 */
export function ShareHighlight({ gameweek }: { gameweek: number }) {
  const [busy, setBusy] = useState(false);

  async function saveViaDownload(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(`highlight ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], `peproulette-gw${gameweek}.png`, { type: "image/png" });

      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        try {
          await navigator.share({
            files: [file],
            title: "PepRoulette",
            text: `Gameweek ${gameweek} highlights`,
          });
        } catch (err) {
          // User dismissed the share sheet — not a failure, and no fallback.
          if ((err as Error)?.name === "AbortError") return;
          await saveViaDownload(file);
        }
      } else {
        await saveViaDownload(file);
      }
    } catch {
      // Network/generation failure: nothing to download. Swallow quietly (no
      // console noise); the button simply returns to its idle state below.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Share gameweek highlight"
      className="inline-flex items-center gap-1.5 rounded-full border border-[--line] bg-[--panel] px-3 py-1.5 text-xs font-bold text-[--ink] transition-colors hover:border-[--lime] hover:text-[--lime] disabled:opacity-60"
    >
      <DownloadIcon />
      {busy ? "Preparing…" : "Share"}
    </button>
  );
}
