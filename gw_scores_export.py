"""Build the per-manager, per-gameweek total-points wide sheet for the frontend."""
import pandas as pd


def build_gw_scores_wide(records: list, manager_name_by_id: dict) -> pd.DataFrame:
    """records: [{gameweek, manager_id, score}]; returns Manager + GW{n} columns."""
    if not records:
        return pd.DataFrame(columns=["Manager"])
    df = pd.DataFrame(records)
    wide = df.pivot_table(index="manager_id", columns="gameweek", values="score", aggfunc="first").fillna(0)
    wide.columns = [f"GW{int(c)}" for c in wide.columns]
    wide = wide.reset_index()
    wide["Manager"] = wide["manager_id"].map(manager_name_by_id)
    gw_cols = sorted([c for c in wide.columns if c.startswith("GW")], key=lambda c: int(c[2:]))
    out = wide[["Manager"] + gw_cols].copy()
    for c in gw_cols:
        out[c] = out[c].astype(int)
    return out
