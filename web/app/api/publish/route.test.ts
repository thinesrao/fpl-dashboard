import { dispatchPipeline } from "@/lib/github";

test("dispatchPipeline calls the correct GitHub workflow dispatch endpoint with auth + ref", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;

  const res = await dispatchPipeline("tok_123", fakeFetch);
  expect(res.status).toBe(204);
  expect(calls[0].url).toBe(
    "https://api.github.com/repos/thinesrao/fpl-dashboard/actions/workflows/run_fpl_pipeline.yml/dispatches"
  );
  const headers = calls[0].init.headers as Record<string, string>;
  expect(headers.Authorization).toBe("Bearer tok_123");
  expect(JSON.parse(String(calls[0].init.body))).toEqual({ ref: "main" });
});
