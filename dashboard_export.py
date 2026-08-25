"""Serialize the pipeline's computed worksheets into a single dashboard.json.

This is the handoff artifact the Next.js frontend reads. Kept pure (no I/O
beyond write_dashboard_json) so it is trivially testable.
"""
import json


def build_dashboard_payload(worksheets: dict) -> dict:
    sheets = {
        name: json.loads(df.to_json(orient="records", date_format="iso"))
        for name, df in worksheets.items()
    }
    metadata = {}
    meta_df = worksheets.get("metadata")
    if meta_df is not None and not meta_df.empty:
        metadata = json.loads(meta_df.head(1).to_json(orient="records", date_format="iso"))[0]
    return {"sheets": sheets, "generated_from_metadata": metadata}


def write_dashboard_json(payload: dict, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, allow_nan=False)
