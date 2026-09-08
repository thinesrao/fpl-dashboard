const DISPATCH_URL =
  "https://api.github.com/repos/thinesrao/fpl-dashboard/actions/workflows/run_fpl_pipeline.yml/dispatches";

export async function dispatchPipeline(
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  return fetchImpl(DISPATCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    // Admin Publish means "the manual penalties are reviewed" — advance the
    // finalised marker to the current gameweek (see pipeline_meta.py).
    body: JSON.stringify({ ref: "main", inputs: { penalties_reviewed: "true" } }),
  });
}
