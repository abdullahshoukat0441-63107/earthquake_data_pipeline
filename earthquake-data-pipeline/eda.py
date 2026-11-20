# eda.py
# Exploratory data analysis: read the clean CSV, print what stands out,
# and save one chart for each question I wanted to answer.

import os

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from config import CHARTS_FOLDER, CLEAN_CSV_FILE

sns.set_theme(style="whitegrid", context="notebook")
BLUE = "#3f86a8"


def load_clean_data():
    df = pd.read_csv(CLEAN_CSV_FILE)
    df["time"] = pd.to_datetime(df["time"])
    return df


def print_summary(df):
    print("\n--- Quick summary ---")
    print("Earthquakes:", len(df))
    print(df[["magnitude", "depth_km"]].describe().round(2))

    strongest = df.loc[df["magnitude"].idxmax()]
    print(f"\nStrongest: magnitude {strongest['magnitude']} - {strongest['place']}")
    print(f"Share below magnitude 3: {(df['magnitude'] < 3).mean():.0%}")
    print(f"Correlation of depth and magnitude: {df['depth_km'].corr(df['magnitude']):.2f}")


def save(name):
    plt.tight_layout()
    plt.savefig(f"{CHARTS_FOLDER}/{name}", dpi=150)
    plt.close()


def magnitude_chart(df):
    # Q1: how big are most earthquakes?
    plt.figure(figsize=(8, 5))
    sns.histplot(df["magnitude"], bins=30, color=BLUE)
    plt.title("Most earthquakes are small")
    plt.xlabel("Magnitude")
    plt.ylabel("Number of earthquakes")
    save("1_magnitude_distribution.png")


def region_chart(df):
    # Q2: where do they happen the most?
    top = df["region"].value_counts().head(10)
    plt.figure(figsize=(8, 5))
    sns.barplot(x=top.values, y=top.index, color=BLUE)
    plt.title("Top 10 regions by number of earthquakes")
    plt.xlabel("Number of earthquakes")
    plt.ylabel("")
    save("2_top_regions.png")


def time_chart(df):
    # Q3: is the daily count steady?
    per_day = df.groupby("date").size()
    plt.figure(figsize=(10, 5))
    per_day.plot(kind="line", color=BLUE, marker="o", markersize=3)
    plt.title("Earthquakes per day")
    plt.xlabel("Date")
    plt.ylabel("Number of earthquakes")
    plt.xticks(rotation=45)
    save("3_earthquakes_per_day.png")


def depth_chart(df):
    # Q4: do deeper earthquakes hit harder?
    plt.figure(figsize=(8, 5))
    sns.scatterplot(data=df, x="depth_km", y="magnitude", alpha=0.4, color=BLUE)
    plt.title("Depth vs magnitude")
    plt.xlabel("Depth (km)")
    plt.ylabel("Magnitude")
    save("4_depth_vs_magnitude.png")


def tsunami_chart(df):
    # Q5: how many came with a tsunami warning?
    counts = df["tsunami"].map({0: "No warning", 1: "Tsunami warning"}).value_counts()
    print("\nTsunami warnings:")
    print(counts.to_string())

    plt.figure(figsize=(6, 5))
    ax = sns.barplot(x=counts.index, y=counts.values, color=BLUE)
    ax.bar_label(ax.containers[0])
    plt.title("Earthquakes with a tsunami warning")
    plt.xlabel("")
    plt.ylabel("Number of earthquakes")
    save("5_tsunami_events.png")


def run_eda():
    os.makedirs(CHARTS_FOLDER, exist_ok=True)
    df = load_clean_data()

    print_summary(df)
    magnitude_chart(df)
    region_chart(df)
    time_chart(df)
    depth_chart(df)
    tsunami_chart(df)

    print("\nCharts saved in", CHARTS_FOLDER)


if __name__ == "__main__":
    run_eda()
