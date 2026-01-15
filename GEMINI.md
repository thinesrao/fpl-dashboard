# GEMINI.md - FPL Dashboard

## Project Overview

This project is a comprehensive Fantasy Premier League (FPL) analytics dashboard. It provides detailed analytics, awards, and insights for an FPL mini-league.

**Key Technologies:**

- **Backend:** Python, Pandas
- **Frontend:** Streamlit, Plotly
- **Data Storage:** Google Sheets
- **Data Source:** Official FPL API

**Architecture:**

The project consists of two main components:

1.  `data_pipeline.py`: A Python script that fetches data from the FPL API, processes it to calculate various statistics and awards, and then stores the results in a Google Sheet.
2.  `app.py`: A Streamlit application that reads the processed data from the Google Sheet and presents it in an interactive and visually appealing dashboard.

The data pipeline can be run manually or is designed to be run automatically via GitHub Actions to keep the data fresh.

## Building and Running

### 1. Install Dependencies

The project's dependencies are listed in `requirements.txt`. To install them, run:

```bash
pip install -r requirements.txt
```

### 2. Configure Google Sheets API Access

The application requires access to a Google Sheet. You can configure this in one of two ways:

- **Locally:** Create a file at `.streamlit/secrets.toml` with your Google Cloud Platform (GCP) service account credentials.
- **In CI/CD (e.g., GitHub Actions):** Set the `GCP_CREDENTIALS` environment variable with your GCP service account credentials as a JSON string.

### 3. Run the Data Pipeline

To populate the Google Sheet with data, run the data pipeline script:

```bash
python data_pipeline.py
```

### 4. Run the Streamlit Dashboard

To view the dashboard, run the Streamlit application:

```bash
streamlit run app.py
```

## Development Conventions

- **Configuration:** The application uses a combination of hardcoded configuration in `data_pipeline.py` (e.g., league IDs) and external configuration for sensitive information like API keys (via `.streamlit/secrets.toml` or environment variables).
- **Styling:** The Streamlit app injects custom CSS for styling and fonts.
- **Data Handling:** The data pipeline uses the `gspread` and `gspread-dataframe` libraries to interact with Google Sheets. The Streamlit app uses `gspread` and caches the data to improve performance.
- **Error Handling:** The `data_pipeline.py` script includes basic error handling for API requests. The `app.py` script includes error handling for Google Sheets API errors and other exceptions.
- **Player Names:** All player names use "Player (Team)" format (e.g., "Wilson (Fulham)", "Wilson (West Ham)") to ensure uniqueness and handle duplicates. The `_player_names` sheet is auto-generated on each pipeline run and should be used as the source for dropdown data validation in `manual_penalty_data` sheet.
