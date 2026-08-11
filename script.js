console.log("JavaScript is connected");
const apiKey = "7d2289effa09983a65e38dbb39eb93db";

const countrySelect = document.getElementById("country");
const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const card = document.getElementById("weather-card");
const cityListEl = document.getElementById("city-list");

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

// ---------------------------------------------------------------------
// Country scope
//
// India has hundreds of thousands of villages — no static list can
// hold "every city and village", so for India the search reaches the
// full live geocoding database (any city, town, or village). For
// everywhere else, the dropdown itself IS the "most popular only"
// filter: only well-known countries are listed, and once one is
// picked, city search is scoped to just that country via the
// Geocoding API's country-code parameter.
//
// This also fixes the original bug: typing random letters/words won't
// match any real place within the selected country, so nothing gets
// suggested and the search is rejected — no more "random city" results.
// ---------------------------------------------------------------------
const COUNTRIES = [
    { code: "IN", name: "India" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "FR", name: "France" },
    { code: "DE", name: "Germany" },
    { code: "ES", name: "Spain" },
    { code: "IT", name: "Italy" },
    { code: "NL", name: "Netherlands" },
    { code: "AE", name: "UAE" },
    { code: "SG", name: "Singapore" },
    { code: "JP", name: "Japan" },
    { code: "KR", name: "South Korea" },
    { code: "CN", name: "China" },
    { code: "HK", name: "Hong Kong" },
    { code: "TH", name: "Thailand" },
    { code: "MY", name: "Malaysia" },
    { code: "ID", name: "Indonesia" },
    { code: "PH", name: "Philippines" },
    { code: "AU", name: "Australia" },
    { code: "NZ", name: "New Zealand" },
    { code: "CA", name: "Canada" },
    { code: "RU", name: "Russia" },
    { code: "TR", name: "Turkey" },
    { code: "EG", name: "Egypt" },
    { code: "ZA", name: "South Africa" },
    { code: "KE", name: "Kenya" },
    { code: "BR", name: "Brazil" },
    { code: "AR", name: "Argentina" },
    { code: "MX", name: "Mexico" },
    { code: "CH", name: "Switzerland" },
    { code: "AT", name: "Austria" },
    { code: "SE", name: "Sweden" },
    { code: "NO", name: "Norway" },
    { code: "DK", name: "Denmark" },
    { code: "FI", name: "Finland" },
    { code: "IE", name: "Ireland" },
    { code: "BE", name: "Belgium" },
    { code: "PT", name: "Portugal" },
    { code: "GR", name: "Greece" },
    { code: "QA", name: "Qatar" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "IL", name: "Israel" },
    { code: "PK", name: "Pakistan" },
    { code: "BD", name: "Bangladesh" },
    { code: "LK", name: "Sri Lanka" },
    { code: "NP", name: "Nepal" }
];

function populateCountryDropdown() {
    const fragment = document.createDocumentFragment();
    COUNTRIES.forEach(({ code, name }) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = name;
        fragment.appendChild(option);
    });
    countrySelect.appendChild(fragment);
    countrySelect.value = "IN"; // default scope
}
populateCountryDropdown();

function selectedCountry() {
    const country = COUNTRIES.find(c => c.code === countrySelect.value);
    return country || COUNTRIES[0];
}

// Live suggestion cache: label (lowercase) -> { label, lat, lon }
let suggestionMap = new Map();

function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Fetches candidate places for whatever's typed, scoped to the
// currently selected country via the Geocoding API's country code.
async function fetchSuggestions(query, countryCode) {
    const scopedQuery = `${query},${countryCode}`;
    const url =
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(scopedQuery)}&limit=8&appid=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const results = await response.json();

        const suggestions = [];
        const seen = new Set();

        results.forEach(result => {
            // Safety check: only keep results actually in the selected country
            if (result.country !== countryCode) return;

            const { name, state, lat, lon } = result;
            const countryDisplayName = (COUNTRIES.find(c => c.code === countryCode) || {}).name || countryCode;
            const label = state ? `${name}, ${state}, ${countryDisplayName}` : `${name}, ${countryDisplayName}`;

            const key = label.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            suggestions.push({ label, lat, lon });
        });

        return suggestions;
    } catch (error) {
        console.log(error);
        return [];
    }
}

function renderSuggestions(suggestions) {
    suggestionMap = new Map(suggestions.map(s => [s.label.toLowerCase(), s]));

    cityListEl.innerHTML = "";
    const fragment = document.createDocumentFragment();
    suggestions.forEach(s => {
        const option = document.createElement("option");
        option.value = s.label;
        fragment.appendChild(option);
    });
    cityListEl.appendChild(fragment);
}

const handleTyping = debounce(async function () {
    const typed = cityInput.value.trim();

    if (typed.length < 2) {
        renderSuggestions([]);
        return;
    }

    const suggestions = await fetchSuggestions(typed, selectedCountry().code);
    renderSuggestions(suggestions);
}, 350);

cityInput.addEventListener("input", handleTyping);

// Re-run suggestions (and clear stale ones) whenever the country changes
countrySelect.addEventListener("change", function () {
    suggestionMap = new Map();
    cityListEl.innerHTML = "";
    if (cityInput.value.trim().length >= 2) {
        handleTyping();
    }
});

// Resolves whatever's currently typed to a real place within the
// selected country. Prefers an exact match against the live suggestion
// cache (fast path); falls back to a fresh lookup if the user typed
// fast and hit Search before the debounce fired.
async function resolveTypedLocation(rawInput) {
    const typed = rawInput.trim();
    if (typed === "") return { status: "empty" };

    const cached = suggestionMap.get(typed.toLowerCase());
    if (cached) return { status: "ok", location: cached };

    const countryCode = selectedCountry().code;
    const suggestions = await fetchSuggestions(typed, countryCode);

    if (suggestions.length === 0) {
        return { status: "not_found" };
    }

    const exact = suggestions.find(s =>
        s.label.toLowerCase() === typed.toLowerCase() ||
        s.label.split(",")[0].trim().toLowerCase() === typed.toLowerCase()
    );
    if (exact) return { status: "ok", location: exact };

    if (suggestions.length > 1) {
        renderSuggestions(suggestions);
        return { status: "ambiguous" };
    }

    return { status: "ok", location: suggestions[0] };
}

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
    countrySelect.disabled = isLoading;
}

searchBtn.addEventListener("click", async function () {

    const typed = cityInput.value.trim();

    if (typed === "") {
        showToast("Please enter a city or village name.");
        return;
    }

    setLoading(true);
    const result = await resolveTypedLocation(typed);
    setLoading(false);

    const countryName = selectedCountry().name;

    if (result.status === "not_found") {
        showToast(`No results found for "${typed}" in ${countryName}. Please check the spelling and try again.`);
        return;
    }

    if (result.status === "ambiguous") {
        showToast(`Multiple places match "${typed}" — please select one from the dropdown suggestions.`);
        return;
    }

    getWeather(result.location);

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

// Takes a resolved { label, lat, lon } location — already validated
// against the selected country — and fetches its weather directly by
// coordinates (no extra geocoding round-trip needed).
async function getWeather(location) {

    setLoading(true);

    try {

        const url =
            `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`;

        const response = await fetch(url);
        const data = await response.json();
        console.log(data);

        if (response.ok === false) {
            showToast(data.message || "Something went wrong.");
            return;
        }

        // Use our own resolved label so display stays consistent
        // (e.g. "Kasauli, Himachal Pradesh, India" rather than whatever
        // the weather API happens to return for that station).
        data.name = location.label;

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

// Initial default view on page load
getWeather({ label: "Pune, Maharashtra, India", lat: 18.5204, lon: 73.8567 });

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

// Geolocation ("My Location") queries by exact GPS coordinates — that's
// not free-text input, so it's unaffected by the country dropdown and
// always reflects the user's real position, wherever that is.
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