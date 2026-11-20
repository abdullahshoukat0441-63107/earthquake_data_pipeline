# main.py
# Run this one file and the whole pipeline goes: extract -> transform -> load -> EDA.

from eda import run_eda
from extract import extract
from load import load
from transform import transform


def main():
    print("== Step 1: extract ==")
    extract()

    print("\n== Step 2: transform ==")
    clean_df = transform()

    print("\n== Step 3: load ==")
    load(clean_df)

    print("\n== Step 4: EDA ==")
    run_eda()

    print("\nDone. Open web/index.html through a local server to see the dashboard.")


if __name__ == "__main__":
    main()
