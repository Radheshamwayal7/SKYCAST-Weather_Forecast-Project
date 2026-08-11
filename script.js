console.log("JavaScript is connected");
const apiKey = "7d2289effa09983a65e38dbb39eb93db";

const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const card = document.getElementById("weather-card");

const cityName = document.getElementById("city-name");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const dateTime = document.getElementById("date-time");

const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const feelsLike = document.getElementById("feels-like");
const sunrise = document.getElementById("sunrise");
const sunset = document.getElementById("sunset");
const minTemp = document.getElementById("min-temp");
const maxTemp = document.getElementById("max-temp");
const weatherIcon = document.getElementById("weather-icon");

// Accent color per weather condition — keeps the radar sweep / eyebrow /
// condition text in sync with what's actually happening outside.
const MOOD_COLORS = {
    Clear: { accent: "#FFB454", soft: "rgba(255, 180, 84, 0.16)" },
    Clouds: { accent: "#9CA9C2", soft: "rgba(156, 169, 194, 0.16)" },
    Rain: { accent: "#4FA8D1", soft: "rgba(79, 168, 209, 0.18)" },
    Drizzle: { accent: "#4FA8D1", soft: "rgba(79, 168, 209, 0.18)" },
    Thunderstorm: { accent: "#B084F0", soft: "rgba(176, 132, 240, 0.2)" },
    Snow: { accent: "#DCE8F7", soft: "rgba(220, 232, 247, 0.18)" },
    Mist: { accent: "#8FA0AE", soft: "rgba(143, 160, 174, 0.16)" },
    default: { accent: "#4FD1C5", soft: "rgba(79, 209, 197, 0.16)" }
};

function setMood(weatherMain) {
    const mood = MOOD_COLORS[weatherMain] || MOOD_COLORS.default;
    document.documentElement.style.setProperty("--accent", mood.accent);
    document.documentElement.style.setProperty("--accent-soft", mood.soft);
}

const toastStack = document.getElementById("toast-stack");

function showToast(message, type = "error") {

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.textContent = type === "success" ? "✓" : "⚠";

    const text = document.createElement("span");
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    toastStack.appendChild(toast);

    // Trigger enter transition
    requestAnimationFrame(function () {
        toast.classList.add("is-visible");
    });

    const remove = function () {
        toast.classList.add("is-leaving");
        toast.classList.remove("is-visible");
        toast.addEventListener("transitionend", function () {
            toast.remove();
        }, { once: true });
    };

    setTimeout(remove, 3800);
    toast.addEventListener("click", remove);

}

function setLoading(isLoading) {
    card.classList.toggle("is-loading", isLoading);
    searchBtn.disabled = isLoading;
    locationBtn.disabled = isLoading;
}

searchBtn.addEventListener("click", function () {

    const city = cityInput.value.trim();

    if (city === "") {
        showToast("Please enter a city name.");
        return;
    }

    getWeather(city);

});

locationBtn.addEventListener("click", function () {

    if (navigator.geolocation) {

        setLoading(true);
        showToast("Locating you — this can take a moment outside cities…", "success");

        navigator.geolocation.getCurrentPosition(
            showPosition,
            showLocationError,
            {
                enableHighAccuracy: true, // use real GPS, not coarse cell/Wi-Fi triangulation
                timeout: 15000,           // fail after 15s instead of hanging indefinitely
                maximumAge: 0             // don't reuse a stale cached fix
            }
        );

    } else {

        showToast("Geolocation is not supported.");

    }

});

// Press Enter to Search
cityInput.addEventListener("keypress", function (event) {

    if (event.key === "Enter") {
        searchBtn.click();
    }

});

function renderWeather(data) {

    cityName.innerText = data.name;

    temperature.innerText =
        Math.round(data.main.temp) + "°C";

    condition.innerText =
        data.weather[0].description;

    setMood(data.weather[0].main);

    const today = new Date();
    dateTime.innerText = today.toLocaleString();

    humidity.innerText =
        data.main.humidity + "%";

    wind.innerText =
        (data.wind.speed * 3.6).toFixed(1) + " km/h";

    pressure.innerText =
        data.main.pressure + " hPa";

    feelsLike.innerText =
        Math.round(data.main.feels_like) + "°C";

    minTemp.innerText =
        Math.round(data.main.temp_min) + "°C";

    maxTemp.innerText =
        Math.round(data.main.temp_max) + "°C";

    const sunriseTime = new Date(data.sys.sunrise * 1000);
    const sunsetTime = new Date(data.sys.sunset * 1000);

    sunrise.innerText =
        sunriseTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

    sunset.innerText =
        sunsetTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

    const icon = data.weather[0].icon;

    weatherIcon.src =
        `https://openweathermap.org/img/wn/${icon}@4x.png`;

}

async function getWeather(city) {

    setLoading(true);

    try {

        // Step 1: resolve the place name to coordinates using the
        // Geocoding API — this has far better coverage of small
        // villages/towns than the old q= city-name lookup below.
        const geoUrl =
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;

        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (geoResponse.ok === false || geoData.length === 0) {
            showToast(`Couldn't find "${city}". Try adding the district/state, e.g. "${city}, Maharashtra".`);
            return;
        }

        const { lat, lon, name, state } = geoData[0];

        // Step 2: fetch the actual weather for those coordinates.
        const url =
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

        const response = await fetch(url);

        const data = await response.json();
        console.log(data);

        if (response.ok === false) {
            showToast(data.message || "Something went wrong.");
            return;
        }

        // Prefer the geocoder's resolved name (e.g. village + state)
        // since it's often more precise than what the weather API returns.
        data.name = state ? `${name}, ${state}` : name;

        renderWeather(data);
        showToast(`Forecast updated for ${data.name}`, "success");

    }

    catch (error) {

        console.log(error);

        showToast("Something went wrong.");

    }

    finally {

        setLoading(false);

    }

}
getWeather("Pune");

function showPosition(position) {

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    getWeatherByLocation(latitude, longitude);

}

function showLocationError(error) {

    setLoading(false);

    if (error.code === error.PERMISSION_DENIED) {
        showToast("Location access was denied. Please allow location access or search by city instead.");
    } else if (error.code === error.TIMEOUT) {
        showToast("GPS is taking too long — weak signal here. Try again or search by city.");
    } else if (error.code === error.POSITION_UNAVAILABLE) {
        showToast("Couldn't determine your position. Try again in open sky, or search by city.");
    } else {
        showToast("Unable to retrieve your location.");
    }

}

async function getWeatherByLocation(latitude, longitude) {

    const url =
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

    try {

        const response = await fetch(url);

        const data = await response.json();

        if (response.ok === false) {
            showToast(data.message || "Unable to get location weather.");
            return;
        }

        renderWeather(data);
        showToast(`Forecast updated for ${data.name}`, "success");

    }

    catch (error) {

        console.log(error);

        showToast("Unable to get location weather.");

    }

    finally {

        setLoading(false);

    }

}