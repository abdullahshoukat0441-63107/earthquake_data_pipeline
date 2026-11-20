# Earthquake Data ETL Pipeline, EDA and Web App

I pull a month of worldwide earthquake data from the USGS API, clean and validate it
with pandas and Pydantic, save it to CSV, explore it with matplotlib and seaborn,
and show the results in a small web dashboard.

**Data source:** https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson

## How it fits together

    USGS API -> extract.py -> transform.py -> load.py -> eda.py
                 raw JSON      clean + check    CSV + JSON   charts
                                                    |
                                                    +--> web/ (dashboard)

| File | What it does |
|------|--------------|
| `config.py` | URLs and file paths in one place |
| `extract.py` | Calls the API and keeps a raw JSON copy |
| `models.py` | Pydantic model with the rules each earthquake must pass |
| `transform.py` | Cleans the data with pandas, then validates every row |
| `load.py` | Writes the clean CSV and a JSON file for the web app |
| `eda.py` | Prints a summary and saves 5 charts |
| `main.py` | Runs everything in order |
| `web/` | The dashboard (plain HTML, CSS and JavaScript) |

## Run the pipeline

    pip install -r requirements.txt
    python main.py

Outputs: `data/earthquakes_clean.csv`, `charts/*.png` and `web/data/earthquakes.json`.

## Run the web app

The site is static, so any simple server works:

    cd web
    python -m http.server 8000

then open http://localhost:8000. The page uses `web/data/earthquakes.json` when it
exists (made by the pipeline). If the file is missing, it loads the live USGS feed instead,
and the **Reload live data** button always fetches fresh data.

## Deploy on Vercel

1. Push this folder to GitHub (commit `web/data/earthquakes.json` if you want the site to show the pipeline's output).
2. In Vercel choose **Add New > Project** and import the repo.
3. Leave the framework as "Other". `vercel.json` already points the output to `web/`, so there is no build step.

## What the dashboard shows

Magnitude distribution, top regions, earthquakes per day, depth vs magnitude,
a world map of every earthquake, and a table of the strongest ones with a tsunami filter.

**Technologies:** Python, Requests, Pandas, Pydantic, CSV, Matplotlib, Seaborn, HTML/CSS/JavaScript, Chart.js
