// @vitest-environment node
import { expect, test } from "vitest";
import OpengraphImage, { size, contentType } from "./opengraph-image";

test("exports the standard 1200x630 link-preview metadata", () => {
  expect(size).toEqual({ width: 1200, height: 630 });
  expect(contentType).toBe("image/png");
});

test("renders a PNG link-preview from the sample dashboard", async () => {
  const res = await OpengraphImage();
  expect(res.headers.get("content-type")).toContain("image/png");

  const buf = new Uint8Array(await res.arrayBuffer());
  expect(buf.byteLength).toBeGreaterThan(1000);
  expect(Array.from(buf.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
}, 30_000);
