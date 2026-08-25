"use client";
export default function Error() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-24 text-center">
      <h1 className="font-display text-2xl">Couldn&apos;t load the dashboard</h1>
      <p className="mt-2 text-[--muted]">The data feed is temporarily unavailable. Please refresh in a minute.</p>
    </main>
  );
}
