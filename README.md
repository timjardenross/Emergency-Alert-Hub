# Emergency Alert Hub

Static GitHub Pages dashboard for bushfire forward risk and public site-list planning.

## What it includes

- state summary cards
- searchable and filterable site list
- rating badges for High / Moderate / Watch / Low
- executive caveat and methodology notes

## Local preview

Open `index.html` in a browser, or serve the folder with any static file server.

## Data model

The app is driven by standalone CSV files:

- `data/states.csv` for state summaries
- `data/sites.csv` for the live site list
- `data/sites.sample.csv` as a downloadable template
- `data.js` is retained as a local fallback/sample source for file:// preview

## Editing the site list

- edit `data/sites.csv` in a spreadsheet or text editor
- edit `data/states.csv` if you want to change the state cards
- keep the header order unchanged
- use one row per site
- wrap any field containing commas in double quotes
- reload the page to see the updated list

## CSV workflow

- click `Download sample` to get a template copy
- paste or upload CSV into the import area
- click `Apply CSV` to validate and load it
- validation errors are shown in the panel under the CSV format note
