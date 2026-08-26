"use client";
import { useEffect } from "react";
import type { DashboardData } from "@/lib/types";
import { managerProfile } from "@/lib/story";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[--line] bg-[--panel] px-2.5 py-1 text-[11px] text-[--muted]">
      {children}
    </span>
  );
}

export function ManagerProfile({
  data,
  name,
  onClose,
}: {
  data: DashboardData;
  name: string;
  onClose: () => void;
}) {
  const p = managerProfile(data, name);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const maxForm = p && p.form.length > 0 ? Math.max(...p.form, 1) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[--line] bg-gradient-to-br from-[--panel2] to-[--panel] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {p === null ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[--muted]">No data for this manager yet</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-xl text-[--muted]"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3.5 flex items-start justify-between gap-3">
              <h2 className="font-display text-xl uppercase">{p.name}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-xl text-[--muted]"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Chip>Rank {p.classicRank}</Chip>
              <Chip>🏆 {p.trophies.length} trophies</Chip>
              <Chip>Best GW {p.bestGw}</Chip>
              <Chip>Worst GW {p.worstGw}</Chip>
            </div>

            {p.trophies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.trophies.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-[--line] bg-[--panel] px-2.5 py-1 text-[11px] font-semibold text-[--ink]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {p.form.length > 0 && (
              <div
                data-testid="profile-form"
                className="mt-4 flex h-[46px] items-end gap-1"
              >
                {p.form.map((v, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-sm bg-[--lime] opacity-85"
                    style={{ height: `${Math.max((v / maxForm) * 100, 4)}%` }}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 flex items-end justify-between gap-4 border-t border-[--line] pt-4">
              <span className="text-xs text-[--muted]">H2H {p.h2hTotal}</span>
              <div className="text-right">
                <div className="font-display text-3xl">{p.classicTotal}</div>
                <div className="text-[11px] font-semibold text-[--muted]">total pts</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
