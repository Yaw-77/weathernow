const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const locationButton = document.querySelector("#location-button");
const statusEl = document.querySelector("#status");
const currentWeatherEl = document.querySelector("#current-weather");
const forecastListEl = document.querySelector("#forecast-list");
const forecastMetaEl = document.querySelector("#forecast-meta");
const localTimeEl = document.querySelector("#local-time");

const weatherClasses = [
    "weather-clear",
    "weather-clouds",
    "weather-rain",
    "weather-drizzle",
    "weather-thunderstorm",
    "weather-snow",
    "weather-night",
];

function setStatus(message = "", type = "info") {
    statusEl.textContent = message;
    statusEl.className = "status";
    if (type === "error") statusEl.classList.add("is-error");
    if (type === "loading") statusEl.classList.add("is-loading");
}

function setLoading(isLoading) {
    const buttons = searchForm.querySelectorAll("button");
    buttons.forEach((button) => {
        button.disabled = isLoading;
    });
}

let currentTzOffset = null;

function updateClock() {
    if (currentTzOffset !== null) {
        // Calculate the city's current time
        const now = new Date();
        const utc = now.getTime() + now.getTimezoneOffset() * 60000;
        const cityTime = new Date(utc + currentTzOffset * 1000);
        
        localTimeEl.textContent = new Intl.DateTimeFormat([], {
            hour: "2-digit",
            minute: "2-digit",
        }).format(cityTime);
    } else {
        localTimeEl.textContent = new Intl.DateTimeFormat([], {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date());
    }
}

function setWeatherTheme(current) {
    document.body.classList.remove(...weatherClasses);
    const condition = (current.condition || "clear").toLowerCase();
    const isNight = current.icon && current.icon.endsWith("n");
    const className = isNight ? "weather-night" : `weather-${condition}`;
    document.body.classList.add(weatherClasses.includes(className) ? className : "weather-clear");
}

function detailItem(label, value) {
    return `
        <div class="detail-item">
            <span class="detail-label">${label}</span>
            <span class="detail-value">${value}</span>
        </div>
    `;
}

function renderCurrent(current) {
    currentWeatherEl.classList.remove("is-empty");
    currentWeatherEl.innerHTML = `
        <div class="current-main">
            <div>
                <p class="location">${current.city}${current.country ? `, ${current.country}` : ""}</p>
                <div class="temperature-row">
                    <div class="temperature">${current.temperature}°C</div>
                    <img class="weather-icon" src="${current.icon_url}" alt="${current.description}">
                </div>
                <p class="condition">${current.description}</p>
                <p class="feels-like">Feels like ${current.feels_like}°C</p>
            </div>
        </div>
        <div class="detail-grid">
            ${detailItem("Humidity", `${current.humidity}%`)}
            ${detailItem("Wind", `${current.wind_speed} km/h`)}
            ${detailItem("Pressure", `${current.pressure} hPa`)}
            ${detailItem("Visibility", current.visibility)}
        </div>
    `;
}

function renderForecast(forecast) {
    if (!forecast.length) {
        forecastListEl.innerHTML = "";
        forecastMetaEl.textContent = "No forecast available";
        return;
    }

    forecastMetaEl.textContent = `${forecast.length} day outlook`;
    forecastListEl.innerHTML = forecast
        .map(
            (day) => `
                <article class="forecast-card">
                    <div class="forecast-day">${day.day}</div>
                    <img src="${day.icon_url}" alt="${day.description}">
                    <div class="forecast-temp">${day.temperature}°C</div>
                    <div class="forecast-condition">${day.description}</div>
                    <div class="forecast-range">Min ${day.min}° · Max ${day.max}°</div>
                </article>
            `,
        )
        .join("");
}

async function fetchWeather(params) {
    const query = new URLSearchParams(params);
    const response = await fetch(`/api/weather?${query.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Unable to retrieve weather data. Please try again.");
    }

    return data;
}

async function loadWeather(params) {
    setStatus("Loading weather...", "loading");
    setLoading(true);

    try {
        const data = await fetchWeather(params);
        renderCurrent(data.current);
        renderForecast(data.forecast);
        setWeatherTheme(data.current);
        
        if (typeof data.current.timezone_offset === 'number') {
            currentTzOffset = data.current.timezone_offset;
            updateClock();
        }
        
        setStatus(`Updated weather for ${data.current.city}.`);
    } catch (error) {
        setStatus(error.message, "error");
    } finally {
        setLoading(false);
    }
}

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const city = cityInput.value.trim();

    if (!city) {
        setStatus("Please enter a city name.", "error");
        cityInput.focus();
        return;
    }

    loadWeather({ city });
});

locationButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
        setStatus("Your browser does not support location search. Please search for a city instead.", "error");
        return;
    }

    setStatus("Requesting your location...", "loading");
    navigator.geolocation.getCurrentPosition(
        (position) => {
            loadWeather({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
            });
        },
        () => {
            setStatus("Location access was denied. Please search for a city instead.", "error");
        },
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000,
        },
    );
});

updateClock();
setInterval(updateClock, 60000);
