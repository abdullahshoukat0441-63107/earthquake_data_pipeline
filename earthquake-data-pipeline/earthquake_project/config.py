# config.py
# Every setting lives here, so if a link or a file name changes
# I only have to edit one place.

# USGS feed: every earthquake from the last 30 days
API_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"

DATA_FOLDER = "data"
CHARTS_FOLDER = "charts"

RAW_JSON_FILE = "data/raw_earthquakes.json"      # exactly what the API sent back
CLEAN_CSV_FILE = "data/earthquakes_clean.csv"    # cleaned + validated table
WEB_DATA_FILE = "web/data/earthquakes.json"      # copy of the clean data for the web app
