"""Read the manual penalty events (the only human input) from Supabase.

Replaces the former `manual_penalty_data` Google Sheet read. Returns a
DataFrame shaped exactly like the old sheet read so downstream award logic
is unchanged.
"""
import os

import pandas as pd

TABLE = "manual_penalty_events"
COLUMNS = ["Gameweek", "Player_Name", "Event_Type"]


def fetch_penalty_events(client) -> pd.DataFrame:
    """Return penalty events as a DataFrame with columns COLUMNS.

    `Gameweek` is coerced to numeric and NaN rows are dropped. An empty
    result yields an empty DataFrame that still has COLUMNS.
    """
    rows = client.table(TABLE).select("*").execute().data or []
    if not rows:
        return pd.DataFrame(columns=COLUMNS)

    df = pd.DataFrame(rows)
    df = df.rename(columns={
        "gameweek": "Gameweek",
        "player_name": "Player_Name",
        "event_type": "Event_Type",
    })
    df["Gameweek"] = pd.to_numeric(df["Gameweek"], errors="coerce")
    df = df.dropna(subset=["Gameweek"])
    df["Gameweek"] = df["Gameweek"].astype(int)
    return df[COLUMNS].reset_index(drop=True)


def get_supabase_client():
    """Build a service-role Supabase client from the environment."""
    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)
