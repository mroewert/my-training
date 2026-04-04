# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Röwert - Gravel Coach** is a Progressive Web App (PWA) for ultra-endurance gravel cycling training plan management with Strava integration. The UI is entirely in German. Mobile-first design optimized for Samsung S22.

## Architecture

**Multi-file vanilla JS PWA** — no build system, no npm, no frameworks. Pure HTML/CSS/JS for maximum portability.

### File Structure

```
index.html          – App shell: header, bottom-nav, modals
css/
  base.css          – CSS variables, reset, fonts, shared components
  nav.css           – Bottom navigation styles
  training.css      – Training tab styles (calendar, week, roadmap, detail)
js/
  app.js            – Router, global state, localStorage persistence, init
  training.js       – Training views (calendar, week, roadmap)
  strava.js         – Strava OAuth 2.0, activity fetching
  weather.js        – Open-Meteo weather API
manifest.json       – PWA manifest
icon-*.png          – App icons
training.json       – Example training plan for import
index_old.html      – Backup of previous single-file version
```

### App Structure

The app uses a **tab-based navigation** with bottom nav:
- **Training** (3 sub-views: Kalender, Woche, Roadmap)
- **Ernährung** (planned: displays MD content from AI nutrition coach)
- **Analyse** (planned: form curve, volume charts, trends)
- **Mehr** (planned: settings, FTP, Strava, import/export)

### State Management

All state is global variables in `app.js`, synced to `localStorage`:

- `workouts` → `localStorage['gravel-workouts']`
- `ftp` → `localStorage['gravel-ftp']`
- `completed` → `localStorage['gravel-completed']`
- `activityLogs` → `localStorage['gravel-activities']`
- Strava tokens → `localStorage['strava-tokens']`

### Key Functions by File

**app.js:** `loadData()`, `saveData()`, `switchTab()`, `openWorkoutDetail()`, `openLog()`, `saveLog()`, `openEdit()`, `saveEdit()`, `handleImport()`

**training.js:** `renderCalendar()`, `renderWeekView()`, `renderRoadmap()`, `switchTrainingView()`, `initTraining()`

**strava.js:** `connectStrava()`, `handleStravaCallback()`, `fetchStravaActivities()`, `loadStravaActivitiesForLog()`

**weather.js:** `fetchWeather()`, `getWeatherIcon()`, `getWeatherWarning()`

### Workout Data Model

```json
{
  "id": "string",
  "date": "YYYY-MM-DD",
  "title": "string",
  "duration": "1h / 90m",
  "desc": "string",
  "intervals": "multiline string",
  "nutrition": "string",
  "technique": "string",
  "video_url": "YouTube URL",
  "coach_notes": "string",
  "done": false
}
```

## Development

**No build/lint/test commands exist.** To develop:

1. Serve via HTTP (e.g., `python -m http.server` or VS Code Live Server) — required because of multi-file JS imports
2. For Strava OAuth, the redirect URI must match the served URL
3. Use browser DevTools for debugging — all state is inspectable in `localStorage`

## Conventions

- **CSS:** Custom properties in `:root`, kebab-case class names, modals use `#modal-{name}` IDs
- **JS:** camelCase functions and variables, each file has a clear responsibility
- **Dates:** ISO 8601 `YYYY-MM-DD` strings, displayed with `de-DE` locale
- **Fonts:** Outfit (display, 400–800), JetBrains Mono (monospace for intervals)
- **Colors:** Dark theme with orange primary (`#E8944C`) and teal secondary (`#4ECDC4`)

## External APIs

- **Strava API:** OAuth 2.0 flow, client credentials in `strava.js`. Endpoints: authorize, token exchange, athlete activities.
- **Open-Meteo:** Free weather API, no key required (Bremen coordinates).

## Security Note

Strava client secret is exposed in client-side code (`strava.js`). This is a known trade-off of the no-backend architecture.
