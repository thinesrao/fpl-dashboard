// @vitest-environment node
import { expect, test } from "vitest";
import { GET } from "./route";

test("renders a PNG image response from the sample dashboard", async () => {
  const res = await GET();
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("image/png");

  const buf = new Uint8Array(await res.arrayBuffer());
  // Non-trivial body...
  expect(buf.byteLength).toBeGreaterThan(1000);
  // ...and a valid PNG signature.
  expect(Array.from(buf.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
}, 30_000);
