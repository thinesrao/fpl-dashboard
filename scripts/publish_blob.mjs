// Uploads the pipeline's dashboard.json to Vercel Blob at a stable public URL.
// Requires env BLOB_READ_WRITE_TOKEN. Run: node scripts/publish_blob.mjs
import { readFile } from "node:fs/promises";
import { put } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is not set");
  process.exit(1);
}

const body = await readFile("dashboard.json");
const blob = await put("dashboard.json", body, {
  access: "public",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
  cacheControlMaxAge: 60,
  token,
});

console.log(blob.url);
