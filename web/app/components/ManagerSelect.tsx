"use client";
export function ManagerSelect({
  managers, value, onChange,
}: { managers: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <select
      aria-label="Highlight a manager"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-sm text-[--ink]"
    >
      <option value="">Highlight a manager…</option>
      {managers.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  );
}
