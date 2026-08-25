"use client";
import { useState } from "react";

export type TabItem = { key: string; label: string; content: React.ReactNode };

export function Tabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.key);
  const current = items.find((t) => t.key === active) ?? items[0];
  return (
    <div>
      <div className="my-4 flex flex-wrap gap-2">
        {items.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={
                "rounded-full border px-4 py-2 text-sm font-semibold transition " +
                (on
                  ? "border-[--accent] bg-[--accent] text-[#06231a]"
                  : "border-[--line] bg-[--panel] text-[--muted]")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
