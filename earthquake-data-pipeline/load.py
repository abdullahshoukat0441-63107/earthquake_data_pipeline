# load.py
# Step 3 of the ETL: save the clean data.
# It goes to a CSV (for the EDA) and to a small JSON file (for the web app).

import json
import os
from datetime import datetime, timezone

import pandas as pd

from config import API_URL, CLEAN_CSV_FILE, DATA_FOLDER, WEB_DATA_FILE


def save_csv(df):
    os.makedirs(DATA_FOLDER, exist_ok=True)
    df.to_csv(CLEAN_CSV_FILE, index=False)
    print("Saved clean CSV to", CLEAN_CSV_FILE)


def save_for_web(df):
    # The browser wants time as a number of milliseconds, so convert it here.
    web = df[["id", "place", "region", "magnitude", "depth_km",
              "latitude", "longitude", "time", "tsunami"]].copy()
    web["time"] = pd.to_datetime(web["time"]).dt.tz_localize("UTC").map(
        lambda t: int(t.timestamp() * 1000)
    )

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": API_URL,
        "earthquakes": web.to_dict("records"),
    }

    os.makedirs(os.path.dirname(WEB_DATA_FILE), exist_ok=True)
    with open(WEB_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    print("Saved web data to", WEB_DATA_FILE)


def load(df):
    save_csv(df)
    save_for_web(df)
