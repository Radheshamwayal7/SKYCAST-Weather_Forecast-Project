console.log("JavaScript is connected");
const apiKey = "7d2289effa09983a65e38dbb39eb93db";

const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");

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

searchBtn.addEventListener("click", function () {

    const city = cityInput.value.trim();

    if (city === "") {
        alert("Please enter a city name.");
        return;
    }

    getWeather(city);

});

locationBtn.addEventListener("click", function () {

    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(showPosition);

    } else {

        alert("Geolocation is not supported.");

    }

});

// Press Enter to Search
cityInput.addEventListener("keypress", function(event){

    if(event.key === "Enter"){
        searchBtn.click();
    }

});

async function getWeather(city) {

    const url =
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    try {

        const response = await fetch(url);

        const data = await response.json();
        console.log(data);

        if (response.ok === false) {
        alert(data.message);
        return;
        }

        cityName.innerText = data.name;

        temperature.innerText =
        Math.round(data.main.temp) + "°C";

        condition.innerText =
        data.weather[0].description;

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
    

    catch (error) {

        console.log(error);

        alert("Something went wrong.");

    }

}
getWeather("Pune");
function showPosition(position){

    alert("Location received!");

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    getWeatherByLocation(latitude, longitude);

}
async function getWeatherByLocation(latitude, longitude){

    const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

    try{

        const response = await fetch(url);

        const data = await response.json();

        cityName.innerText = data.name;

        temperature.innerText =
        Math.round(data.main.temp) + "°C";

        condition.innerText =
        data.weather[0].description;

        humidity.innerText =
        data.main.humidity + "%";

        wind.innerText =
        (data.wind.speed * 3.6).toFixed(1) + " km/h";

        pressure.innerText =
        data.main.pressure + " hPa";

        feelsLike.innerText =
        Math.round(data.main.feels_like) + "°C";

        weatherIcon.src =
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;

        const today = new Date();
        dateTime.innerText = today.toLocaleString();

    }

    catch(error){

        console.log(error);

        alert("Unable to get location weather.");

    }

}