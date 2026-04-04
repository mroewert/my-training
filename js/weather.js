// ============================================
// WEATHER.JS – Open-Meteo API Integration
// ============================================

let weatherCache = {};
let weatherFetchFailed = false;

async function fetchWeather(dateStr) {
    if (weatherFetchFailed) return null;
    if (weatherCache[dateStr]) return weatherCache[dateStr];

    try {
        const lat = 53.0793;
        const lon = 8.8017;
        const date = new Date(dateStr);
        const today = new Date();
        const daysAhead = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

        if (daysAhead < 0 || daysAhead > 7) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_probability_max,weathercode&timezone=Europe/Berlin`,
            { signal: controller.signal }
        );

        clearTimeout(timeoutId);
        if (!response.ok) { weatherFetchFailed = true; return null; }

        const data = await response.json();
        if (data.daily) {
            for (let i = 0; i < data.daily.time.length; i++) {
                weatherCache[data.daily.time[i]] = {
                    temp: Math.round(data.daily.temperature_2m_max[i]),
                    rainProb: data.daily.precipitation_probability_max[i],
                    code: data.daily.weathercode[i]
                };
            }
        }
        return weatherCache[dateStr] || null;
    } catch (e) {
        weatherFetchFailed = true;
        return null;
    }
}

function getWeatherIcon(code) {
    if (code <= 1) return '\u2600\uFE0F';
    if (code <= 3) return '\u26C5';
    if (code <= 48) return '\uD83C\uDF2B\uFE0F';
    if (code <= 67) return '\uD83C\uDF27\uFE0F';
    if (code <= 77) return '\uD83C\uDF28\uFE0F';
    if (code <= 82) return '\uD83C\uDF27\uFE0F';
    if (code <= 86) return '\uD83C\uDF28\uFE0F';
    if (code <= 99) return '\u26C8\uFE0F';
    return '\uD83C\uDF24\uFE0F';
}

function getWeatherWarning(weather) {
    if (!weather) return null;
    if (weather.rainProb > 70) return { type: 'rain', text: 'Hohe Regenwahrscheinlichkeit - Indoor-Alternative?' };
    if (weather.temp < 0) return { type: 'cold', text: 'Frost - Warm anziehen oder Indoor' };
    if (weather.temp > 30) return { type: 'heat', text: 'Hitze - Fr\u00FCh morgens fahren' };
    return null;
}
