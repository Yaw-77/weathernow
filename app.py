import os
from datetime import datetime
from statistics import mean

from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=True)

app = Flask(__name__)

OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
REQUEST_TIMEOUT = 8


class WeatherServiceError(Exception):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def get_api_key():
    return os.getenv("OPENWEATHER_API_KEY", "").strip()


def normalize_visibility(meters):
    if meters is None:
        return "N/A"
    return f"{meters / 1000:.1f} km"


def validate_location_query(args):
    city = args.get("city", "").strip()
    lat = args.get("lat", "").strip()
    lon = args.get("lon", "").strip()

    if city:
        if len(city) > 100:
            raise WeatherServiceError("City name is too long.", 400)
        return {"q": city}

    if lat or lon:
        try:
            latitude = float(lat)
            longitude = float(lon)
        except ValueError as exc:
            raise WeatherServiceError("Latitude and longitude must be valid numbers.", 400) from exc

        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise WeatherServiceError("Latitude or longitude is out of range.", 400)
        return {"lat": latitude, "lon": longitude}

    raise WeatherServiceError("Please enter a city name or use your current location.", 400)


def call_openweather(endpoint, params):
    api_key = get_api_key()
    if not api_key:
        raise WeatherServiceError("Weather service is not configured. Add OPENWEATHER_API_KEY to your .env file.", 500)

    try:
        response = requests.get(
            f"{OPENWEATHER_BASE_URL}/{endpoint}",
            params={**params, "appid": api_key, "units": "metric"},
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise WeatherServiceError("Unable to reach the weather service. Please try again.", 502) from exc

    if response.status_code == 404:
        raise WeatherServiceError("City not found. Please check the spelling.", 404)
    if response.status_code == 401:
        raise WeatherServiceError("Weather service authentication failed. Check the API key.", 500)
    if response.status_code >= 400:
        raise WeatherServiceError("Unable to retrieve weather data. Please try again.", 502)

    try:
        return response.json()
    except ValueError as exc:
        raise WeatherServiceError("Weather service returned an invalid response.", 502) from exc


def weather_icon_url(icon_code):
    return f"https://openweathermap.org/img/wn/{icon_code}@2x.png" if icon_code else ""


def transform_current_weather(data):
    weather = data.get("weather", [{}])[0]
    main = data.get("main", {})
    wind = data.get("wind", {})
    sys = data.get("sys", {})

    return {
        "city": data.get("name", "Unknown location"),
        "country": sys.get("country", ""),
        "temperature": round(main.get("temp", 0)),
        "feels_like": round(main.get("feels_like", 0)),
        "condition": weather.get("main", "Unknown"),
        "description": weather.get("description", "Weather condition unavailable").title(),
        "icon": weather.get("icon", ""),
        "icon_url": weather_icon_url(weather.get("icon")),
        "humidity": main.get("humidity"),
        "wind_speed": round(wind.get("speed", 0) * 3.6, 1),
        "pressure": main.get("pressure"),
        "visibility": normalize_visibility(data.get("visibility")),
        "timestamp": data.get("dt"),
    }


def pick_daily_forecasts(items):
    grouped = {}
    for item in items:
        date_key = datetime.fromtimestamp(item["dt"]).strftime("%Y-%m-%d")
        grouped.setdefault(date_key, []).append(item)

    forecast = []
    today = datetime.now().strftime("%Y-%m-%d")
    for date_key, day_items in grouped.items():
        if date_key == today:
            continue

        representative = min(
            day_items,
            key=lambda entry: abs(datetime.fromtimestamp(entry["dt"]).hour - 12),
        )
        temperatures = [entry["main"]["temp"] for entry in day_items]
        weather = representative.get("weather", [{}])[0]

        forecast.append(
            {
                "date": date_key,
                "day": datetime.fromtimestamp(representative["dt"]).strftime("%a"),
                "temperature": round(mean(temperatures)),
                "min": round(min(entry["main"]["temp_min"] for entry in day_items)),
                "max": round(max(entry["main"]["temp_max"] for entry in day_items)),
                "condition": weather.get("main", "Unknown"),
                "description": weather.get("description", "Weather condition unavailable").title(),
                "icon": weather.get("icon", ""),
                "icon_url": weather_icon_url(weather.get("icon")),
            }
        )

    return forecast[:5]


def transform_forecast(data):
    return pick_daily_forecasts(data.get("list", []))


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/weather")
def get_weather():
    try:
        location_params = validate_location_query(request.args)
        current = call_openweather("weather", location_params)
        forecast = call_openweather("forecast", location_params)
        return jsonify(
            {
                "current": transform_current_weather(current),
                "forecast": transform_forecast(forecast),
            }
        )
    except WeatherServiceError as exc:
        return jsonify({"error": exc.message}), exc.status_code


if __name__ == "__main__":
    app.run(debug=True)
