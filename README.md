# WeatherNow

WeatherNow is a responsive Flask weather application. Users can search for a city, view current conditions, see a short forecast, or request weather for their current location.

## Features

- City weather search powered by OpenWeatherMap
- Current temperature, feels-like temperature, humidity, wind speed, pressure, visibility, and condition
- Short multi-day forecast
- Browser geolocation support
- Loading, empty, and friendly error states
- Subtle dynamic background based on weather conditions
- Responsive layout for phones, tablets, laptops, and desktops
- Flask backend keeps the API key out of frontend JavaScript

## Technologies

- Python
- Flask
- Gunicorn
- python-dotenv
- requests
- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API
- pytest

## Project Structure

```text
weather/
├── app.py
├── .python-version
├── requirements.txt
├── render.yaml
├── .env
├── .env.example
├── .gitignore
├── README.md
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── images/
└── tests/
    └── test_app.py
```

## Setup

Create and activate a virtual environment:

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Linux/macOS:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## API Key

Create a free OpenWeatherMap API key from your OpenWeather account.

Copy `.env.example` to `.env` if needed, then add your key:

```bash
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
```

The `.env` file is ignored by Git and should not be committed.

## Run the App

```bash
python app.py
```

Open the local Flask URL shown in the terminal, usually:

```text
http://127.0.0.1:5000
```

## Run Tests

```bash
pytest
```

The tests mock OpenWeatherMap responses, so they do not require a live API call.

## Deploy on Render

This project includes `render.yaml` for Render's free web service plan.

1. Push this project to a GitHub repository.
2. Sign in to Render and create a new Blueprint or Web Service from that repository.
3. Use these settings if creating the web service manually:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
   - Plan: `Free`
4. Add an environment variable in Render:

```text
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
```

5. Deploy the service. Render will provide a public `onrender.com` URL.

Free Render services may spin down after inactivity and take about a minute to wake up.

## Possible Version 2 Improvements

- Unit toggle for Celsius and Fahrenheit
- Saved favorite cities in local storage
- Hourly forecast view
- Air quality information
- More detailed severe-weather states
- Better city disambiguation for duplicate city names
