"use client";
import { useState } from "react";

export function PublishButton() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function publish() {
    setState("busy");
    const res = await fetch("/api/publish", { method: "POST" });
    setState(res.ok ? "done" : "error");
  }
  return (
    <div className="flex items-center gap-3">
      {state === "done" && <span className="text-xs text-[--accent]">Started — live in ~2 min</span>}
      {state === "error" && <span className="text-xs text-[--live]">Failed — try again</span>}
      <button onClick={publish} disabled={state === "busy"}
        className="rounded-lg bg-[--accent] px-4 py-2 font-semibold text-[#06231a] disabled:opacity-60">
        {state === "busy" ? "Publishing…" : "Publish now"}
      </button>
    </div>
  );
}
