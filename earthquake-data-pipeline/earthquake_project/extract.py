# extract.py
# Step 1 of the ETL: ask the USGS API for data and keep a raw copy.

import json
import os

import requests

from config import API_URL, DATA_FOLDER, RAW_JSON_FILE


def get_data_from_api():
    print("Asking the USGS API for the last 30 days of earthquakes...")
    response = requests.get(API_URL, timeout=30)
    response.raise_for_status()   # stop here if the site returned an error
    return response.json()


def save_raw_json(data):
    # Keeping the untouched response means I can re-run the transform
    # later without hitting the API again.
    os.makedirs(DATA_FOLDER, exist_ok=True)
    with open(RAW_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f)
    print("Saved raw JSON to", RAW_JSON_FILE)


def extract():
    data = get_data_from_api()
    save_raw_json(data)
    print("Records received:", len(data["features"]))
    return data


if __name__ == "__main__":
    extract()
