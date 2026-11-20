# transform.py
# Step 2 of the ETL: turn the raw JSON into a clean, validated table.

import json

import pandas as pd
from pydantic import ValidationError

from config import RAW_JSON_FILE
from models import Earthquake

FIELDS = ["id", "place", "magnitude", "depth_km", "latitude", "longitude", "time", "tsunami"]


def read_raw_json():
    with open(RAW_JSON_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def make_dataframe(data):
    rows = []
    for feature in data["features"]:
        props = feature["properties"]
        lon, lat, depth = feature["geometry"]["coordinates"]   # GeoJSON order is lon, lat, depth
        rows.append({
            "id": feature["id"],
            "place": props["place"],
            "magnitude": props["mag"],
            "time": props["time"],            # milliseconds since 1970
            "tsunami": props["tsunami"],
            "longitude": lon,
            "latitude": lat,
            "depth_km": depth,
        })
    return pd.DataFrame(rows)


def clean_data(df):
    print("Rows before cleaning:", len(df))

    df = df.drop_duplicates(subset="id")
    df = df.dropna(subset=["place", "magnitude", "depth_km", "time"]).copy()

    df["time"] = pd.to_datetime(df["time"], unit="ms")    # UTC
    df["date"] = df["time"].dt.date

    # "10 km N of Ridgecrest, CA" -> "CA". Places with no comma
    # (like "Fiji region") just keep the whole text.
    df["region"] = df["place"].str.split(",").str[-1].str.strip()

    print("Rows after cleaning: ", len(df))
    return df


def validate_data(df):
    good = []
    skipped = 0

    for row in df.to_dict("records"):
        try:
            quake = Earthquake(**{name: row[name] for name in FIELDS})
        except ValidationError:
            skipped += 1
            continue
        record = quake.model_dump()
        record["date"] = row["date"]
        record["region"] = row["region"]
        good.append(record)

    print("Rows that passed validation:", len(good))
    print("Rows thrown out:", skipped)
    return pd.DataFrame(good)


def transform():
    data = read_raw_json()
    df = make_dataframe(data)
    df = clean_data(df)
    return validate_data(df)


if __name__ == "__main__":
    transform()
