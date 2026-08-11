console.log("JavaScript is connected");
const apiKey = "7d2289effa09983a65e38dbb39eb93db";

const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const card = document.getElementById("weather-card");
const suggestionsList = document.getElementById("suggestions");

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

// ==========================================================================
// Search suggestions (autocomplete)
// ==========================================================================

let suggestionItems = [];
let activeSuggestionIndex = -1;
let suggestionsRequestId = 0;

function hideSuggestions() {
    suggestionsList.hidden = true;
    suggestionsList.innerHTML = "";
    suggestionItems = [];
    activeSuggestionIndex = -1;
}

function renderSuggestions(items, state) {

    suggestionsList.innerHTML = "";

    if (state === "loading") {
        const li = document.createElement("li");
        li.className = "is-loading";
        li.textContent = "Searching…";
        suggestionsList.appendChild(li);
        suggestionsList.hidden = false;
        return;
    }

    if (items.length === 0) {
        const li = document.createElement("li");
        li.className = "is-empty";
        li.textContent = "No matches — try adding a district or state.";
        suggestionsList.appendChild(li);
        suggestionsList.hidden = false;
        return;
    }

    items.forEach(function (item, index) {

        const li = document.createElement("li");
        li.dataset.index = index;

        const nameSpan = document.createElement("span");
        nameSpan.className = "s-name";
        nameSpan.textContent = item.label;

        li.appendChild(nameSpan);

        if (item.region) {
            const regionSpan = document.createElement("span");
            regionSpan.className = "s-region";
            regionSpan.textContent = item.region;
            li.appendChild(regionSpan);
        }

        li.addEventListener("mousedown", function (event) {
            // mousedown (not click) so it fires before the input's blur event
            event.preventDefault();
            selectSuggestion(item);
        });

        suggestionsList.appendChild(li);

    });

    suggestionsList.hidden = false;

}

function dedupePlaces(places) {
    const seen = new Set();
    const result = [];
    for (const p of places) {
        const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(p);
        }
    }
    return result;
}

async function fetchSuggestionCandidates(query) {

    const results = [];

    // OpenWeatherMap geocoding — good for cities/towns, fast.
    try {
        const owmUrl =
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`;
        const owmResponse = await fetch(owmUrl);
        const owmData = await owmResponse.json();

        if (owmResponse.ok) {
            owmData.forEach(function (place) {
                results.push({
                    lat: place.lat,
                    lon: place.lon,
                    label: place.name,
                    region: [place.state, place.country].filter(Boolean).join(", ")
                });
            });
        }
    } catch (error) {
        console.log(error);
    }

    // OpenStreetMap Nominatim — better coverage of small villages.
    // Only bother calling it if OWM came back thin, to respect Nominatim's
    // strict rate limit (~1 request/sec) for this free public service.
    if (results.length < 3) {
        try {
            const nomUrl =
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
            const nomResponse = await fetch(nomUrl);
            const nomData = await nomResponse.json();

            nomData.forEach(function (match) {
                const addr = match.address || {};
                const place = addr.village || addr.town || addr.city || addr.hamlet || match.display_name.split(",")[0];
                const region = [addr.state, addr.country].filter(Boolean).join(", ");

                results.push({
                    lat: parseFloat(match.lat),
                    lon: parseFloat(match.lon),
                    label: place,
                    region
                });
            });
        } catch (error) {
            console.log(error);
        }
    }

    return dedupePlaces(results).slice(0, 6);

}

function selectSuggestion(item) {

    cityInput.value = item.label;
    hideSuggestions();

    fetchWeatherForPlace({ lat: item.lat, lon: item.lon, name: item.region ? `${item.label}, ${item.region.split(",")[0]}` : item.label });

}

function updateActiveSuggestion(newIndex) {

    const children = Array.from(suggestionsList.children);
    children.forEach(function (child) {
        child.classList.remove("is-active");
    });

    if (newIndex >= 0 && newIndex < suggestionItems.length) {
        activeSuggestionIndex = newIndex;
        children[newIndex].classList.add("is-active");
        children[newIndex].scrollIntoView({ block: "nearest" });
    } else {
        activeSuggestionIndex = -1;
    }

}

const debouncedSuggest = debounce(async function (query) {

    const requestId = ++suggestionsRequestId;

    renderSuggestions([], "loading");

    const items = await fetchSuggestionCandidates(query);

    if (requestId !== suggestionsRequestId) return; // a newer keystroke superseded this request

    suggestionItems = items;
    activeSuggestionIndex = -1;
    renderSuggestions(items);

}, 350);

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(function () {
            fn(...args);
        }, delay);
    };
}

cityInput.addEventListener("input", function () {

    const query = cityInput.value.trim();

    if (query.length < 2) {
        hideSuggestions();
        return;
    }

    debouncedSuggest(query);

});

cityInput.addEventListener("keydown", function (event) {

    if (suggestionsList.hidden) return;

    if (event.key === "ArrowDown") {
        event.preventDefault();
        updateActiveSuggestion(Math.min(activeSuggestionIndex + 1, suggestionItems.length - 1));
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        updateActiveSuggestion(Math.max(activeSuggestionIndex - 1, 0));
    } else if (event.key === "Escape") {
        hideSuggestions();
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
        event.preventDefault();
        selectSuggestion(suggestionItems[activeSuggestionIndex]);
    }

});

cityInput.addEventListener("blur", function () {
    // slight delay so a mousedown-selected suggestion still registers
    setTimeout(hideSuggestions, 100);
});

document.addEventListener("click", function (event) {
    if (!event.target.closest(".input-wrap")) {
        hideSuggestions();
    }
});

searchBtn.addEventListener("click", function () {

    const city = cityInput.value.trim();

    if (city === "") {
        showToast("Please enter a city name.");
        return;
    }

    hideSuggestions();
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

// Press Enter to Search (falls through only when no suggestion is highlighted)
cityInput.addEventListener("keypress", function (event) {

    if (event.key === "Enter" && activeSuggestionIndex < 0) {
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

// Resolves a place name to coordinates.
// 1) Try OpenWeatherMap's Geocoding API first (fast, good for towns/cities).
// 2) If that finds nothing, fall back to OpenStreetMap's Nominatim geocoder,
//    which is built on community-mapped data and covers small Indian
//    villages (like Awasari Khurd / Awasari Budruk) far more reliably.
async function resolvePlace(city) {

    const owmUrl =
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;

    const owmResponse = await fetch(owmUrl);
    const owmData = await owmResponse.json();

    if (owmResponse.ok && owmData.length > 0) {
        const { lat, lon, name, state } = owmData[0];
        return { lat, lon, name: state ? `${name}, ${state}` : name };
    }

    // Fallback: Nominatim
    const nominatimUrl =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=1`;

    const nomResponse = await fetch(nominatimUrl);

    if (!nomResponse.ok) return null;

    const nomData = await nomResponse.json();

    if (nomData.length === 0) return null;

    const match = nomData[0];
    const addr = match.address || {};
    const place = addr.village || addr.town || addr.city || addr.hamlet || match.display_name.split(",")[0];
    const state = addr.state;

    return {
        lat: parseFloat(match.lat),
        lon: parseFloat(match.lon),
        name: state ? `${place}, ${state}` : place
    };

}

async function fetchWeatherForPlace(place) {

    setLoading(true);

    try {

        const { lat, lon, name } = place;

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
        data.name = name;

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

async function getWeather(city) {

    setLoading(true);

    const place = await resolvePlace(city).catch(function (error) {
        console.log(error);
        return null;
    });

    if (!place) {
        setLoading(false);
        showToast(`Couldn't find "${city}". Try adding the district/state, e.g. "${city}, Maharashtra".`);
        return;
    }

    await fetchWeatherForPlace(place);

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