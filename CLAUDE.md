# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Röwert - Gravel Coach** is a Progressive Web App (PWA) for ultra-endurance gravel cycling training plan management with Strava integration and AI-powered nutrition coaching. The UI is entirely in German. Mobile-first design optimized for Samsung S22.

**Ziel:** Harzquerfahrt 27.06.2026 · 155 km · 1.700 hm

**Hosted:** GitHub Pages → https://mroewert.github.io/my-training/

## Architecture

**Multi-file vanilla JS PWA** — no build system, no npm, no frameworks. Pure HTML/CSS/JS for maximum portability. Deployed via GitHub Pages, synced via Google Drive.

### File Structure

```
index.html              – App shell: header, bottom-nav, modals
css/
  base.css              – CSS variables, reset, fonts, shared components (modals, forms, badges)
  nav.css               – Bottom navigation styles
  training.css          – Training tab (calendar, week, roadmap, workout detail, intervals.icu styles)
  analyse.css           – Analyse tab (form curve, volume chart, stats, performance)
  ernaehrung.css        – Ernährungs tab (day-type toggle, meal cards, shopping list)
  mehr.css              – Mehr/Einstellungen tab (settings sections, profile, FTP)
  routen.css            – Routen tab (route cards, filters, detail view, ratings, ride log)
js/
  app.js                – Router, global state, localStorage, init, modals, workout CRUD
  komoot.js             – Komoot API: login, tour fetching, route data management, surface helpers
  routen.js             – Routen tab UI: route list, filters, detail view, ratings, ride log
  training.js           – Training views: calendar (with intervals.icu sync), week view, roadmap
  analyse.js            – Analyse: form curve, volume chart (soll/ist), stats, perf trends
  ernaehrung.js         – Ernährung: static nutrition data from AI coach, day-type toggle
  mehr.js               – Mehr: settings page, profile, data export, intervals.icu connection UI
  strava.js             – Strava OAuth 2.0, activity fetching
  intervals.js          – intervals.icu API: event sync, Strava auto-log, plan upload
  weather.js            – Open-Meteo weather API
manifest.json           – PWA manifest
icon-192.png, icon-512.png – App icons
training.json           – Example training plan for import
TRAINING_PLAN_SPEC.md   – Format guide for creating training plans
index_old.html          – Backup of previous single-file version (v1)
```

### App Structure (4 Tabs + Bottom Nav)

| Tab | File | Sub-Views | Description |
|-----|------|-----------|-------------|
| **Training** | training.js | Kalender, Woche, Roadmap | Monatskalender (intervals.icu-Style), Wochenansicht mit Soll/Ist, Roadmap bis Harzquerfahrt |
| **Ernährung** | ernaehrung.js | — | AI Coach Daten (Frühstück, Mittag, Snacks) mit Tagestyp-Toggle und Einkaufsliste |
| **Analyse** | analyse.js | — | Formkurve, Wochenvolumen Soll/Ist, Statistiken, Leistungsdaten-Trends |
| **Routen** | routen.js + komoot.js | — | Komoot-Routen mit Bewertungen, Filter, Fahrten-Log, Oberflächen-Analyse |
| **Mehr** | mehr.js | — | Profil, FTP, Strava, intervals.icu, Komoot, Plan-Import, Daten-Export, Reset |

**Navigation Flow:**
- Bottom-Nav: 4 Tabs, onclick-Handler direkt im HTML + JS-Listener
- Training Sub-Nav: 3 Buttons (Kalender/Woche/Roadmap) umschalten via `switchTrainingView()`
- Workout Detail: Fullscreen-View (kein Modal), öffnet via `openWorkoutDetail(id)`
- Modals: Import (`#modal-import`), Log (`#modal-log`), Edit (`#modal-edit`)

### State Management

All state is global variables in `app.js`, synced to `localStorage`:

| Variable | localStorage Key | Content |
|----------|-----------------|---------|
| `workouts` | `gravel-workouts` | Array of workout objects |
| `ftp` | `gravel-ftp` | Functional Threshold Power (Watt) |
| `completed` | `gravel-completed` | Object: workoutId → boolean |
| `activityLogs` | `gravel-activities` | Object: workoutId → log data |
| `stravaTokens` | `strava-tokens` | Strava OAuth tokens + athlete info |
| `intervalsConfig` | `intervals-config` | intervals.icu API-Key + Athlete-ID |
| `intervalsEvents` | `intervals-events` | Cached events (planned workouts) from intervals.icu |

### Key Functions by File

**app.js (Router & Core):**
- `loadData()`, `saveData()` – localStorage persistence
- `switchTab(tabName)` – router, triggers tab rendering
- `openWorkoutDetail(id)`, `closeWorkoutDetail()` – fullscreen workout view
- `openLog(id)`, `saveLog()` – workout logging modal
- `openEdit(id)`, `saveEdit()`, `deleteWorkoutFromEdit()` – workout editing
- `toggleComplete(id)` – mark workout done/undone
- `handleImport()` – JSON plan import (replace/merge)
- `saveFtp()` – save FTP value
- `exportData()` – download all data as JSON (in mehr.js)
- Helpers: `getWeekNumber()`, `formatDate()`, `parseDuration()`, `getIntensityClass()`, `getPlanPhases()`, `getPhaseForWeekNum()`, `estimateTSS()`

**training.js (3 Views):**
- `initTraining()` – find current week, initial render
- `switchTrainingView(view)` – toggle calendar/week/roadmap
- `renderCalendar(container)` – month grid with workout blocks
- `renderWeekView(container)` – week detail with cards
- `renderRoadmap(container)` – timeline with phases and countdown
- `goToWeek(idx)` – navigate from roadmap to week view

**analyse.js (4 Sections):**
- `renderAnalyse()` – orchestrates all sections
- `renderFormCurveSection()` – 8-week load bars with status
- `renderVolumeChartSection()` – all weeks soll/ist overlay
- `renderStatsSection()` – stats grid + intensity distribution
- `renderPerformanceSection()` – power/HR trend charts

**ernaehrung.js (Nutrition Display):**
- `renderErnaehrung()` – orchestrates day-type toggle + meal cards
- `switchDayType(type)` – toggle rest/milon/training
- `renderMealCard(mealKey)` – expandable meal card with macros
- `renderShoppingList()` – expandable shopping list with checkboxes
- `nutritionData` – static object with all AI coach data
- `shoppingData` – static array with all Edeka products

**mehr.js (Settings):**
- `renderMehr()` – settings page with profile, FTP, Strava, intervals.icu, import, export
- `exportData()` – download backup as JSON file

**intervals.js (intervals.icu Integration):**
- `loadIntervalsConfig()`, `saveIntervalsConfig()` – credentials persistence (auto-connects with defaults)
- `isIntervalsConnected()`, `connectIntervals()`, `disconnectIntervals()` – connection management
- `fetchIntervalsEvents(oldest, newest)` – fetch planned workouts from intervals.icu Events API
- `syncIntervalsToCalendar()` – main sync: pull events, update workout dates, auto-log Strava activities
- `uploadPlanToIntervals()` – push future workouts to intervals.icu calendar
- `loadCachedIntervalsActivities()` – restore cached events from localStorage

**strava.js:** `connectStrava()`, `disconnectStrava()`, `handleStravaCallback()`, `refreshStravaToken()`, `fetchStravaActivities()`, `loadStravaActivitiesForLog()`, `selectStravaActivity()`

**weather.js:** `fetchWeather(dateStr)`, `getWeatherIcon(code)`, `getWeatherWarning(weather)`

### Workout Data Model

```json
{
  "id": "string (YYYY-MM-DD_type)",
  "date": "YYYY-MM-DD",
  "title": "string",
  "duration": "1h / 90m / 2.5h",
  "desc": "string",
  "intervals": "multiline string (markdown-like)",
  "nutrition": "string",
  "technique": "string",
  "video_url": "YouTube URL",
  "coach_notes": "string",
  "done": false,
  "intervalsEventId": "number (optional, set by intervals.icu sync)"
}
```

### Nutrition Data Model (in ernaehrung.js)

Nutrition data is **statically embedded** from AI coach MD files in `../ai-nutrition-coach/`. When new MD files are provided, the `nutritionData` and `shoppingData` objects in `ernaehrung.js` must be manually updated.

Structure per meal:
```javascript
{
  icon: '🥐',
  title: 'Frühstück',
  training: { subtitle, kcal, protein, carbs, fat, components[], tips[], drink },
  rest:     { subtitle, kcal, protein, carbs, fat, components[], tips[], drink },
  milon:    { ... } // or null (falls back to training)
}
```

### Plan Phases (Harzquerfahrt)

| Phase | KW | Focus |
|-------|-----|-------|
| FTP-Test | KW 9 | Baseline |
| Base Rebuild | KW 10–13 | Aerobe Basis, Sweet Spot |
| Build + Climbing | KW 14–17 | Threshold, Climbing-Kraft |
| Peak | KW 18–21 | Event-spezifisch, lange Ausfahrten |
| Recovery + Taper | KW 22–25 | Regeneration, Formerhalt |
| Harzquerfahrt | KW 26 | 155 km / 1.700 hm |

## Development

**No build/lint/test commands exist.** To develop:

1. Serve via HTTP (e.g., `python -m http.server` or VS Code Live Server) — required because of multi-file JS structure
2. For Strava OAuth, the redirect URI must match the served URL
3. Use browser DevTools for debugging — all state is inspectable in `localStorage`
4. **Cache-Busting:** All CSS/JS includes in index.html use `?v=N` query params. Increment version after changes to force browser reload.

### Deployment

Push to `main` branch → GitHub Pages auto-deploys to https://mroewert.github.io/my-training/

After pushing, users should hard-refresh (Ctrl+Shift+R) or wait for cache expiry.

## Conventions

- **Language:** German UI, German variable names for nutrition/domain concepts, English for technical code
- **CSS:** Custom properties in `:root`, kebab-case class names, one CSS file per tab
- **JS:** camelCase functions and variables, one JS file per tab, global functions (no modules)
- **HTML:** Modals use `#modal-{name}` IDs, tab content uses `#tab-{name}` IDs, `onclick` handlers inline
- **Dates:** ISO 8601 `YYYY-MM-DD` strings, displayed with `de-DE` locale
- **Fonts:** Outfit (display, weights 400–800), JetBrains Mono (monospace for intervals/numbers)
- **Colors:** Dark theme — orange primary (`#E8944C`), teal secondary (`#4ECDC4`), deep backgrounds (`#0A0E17` → `#232D42`)
- **Intensity Colors:** Recovery=green, Endurance=blue, Sweetspot=orange, Threshold=red, VO2max=purple

## External APIs

- **Strava API:** OAuth 2.0 flow, client credentials in `strava.js`. Endpoints: authorize, token exchange, athlete activities.
- **intervals.icu API:** HTTP Basic Auth (`API_KEY:<key>`), credentials in `intervals.js`. Athlete-ID: `i408428`. Endpoints: events (planned workouts), events/bulk (upload), activities (limited for Strava-sourced).
- **Open-Meteo:** Free weather API, no key required. Coordinates: Bremen (53.0793, 8.8017). 7-day forecast with WMO weather codes.

### intervals.icu Sync Flow

1. **Sync-Button** im Kalender-Header oder Mehr-Tab löst `syncIntervalsToCalendar()` aus
2. **Events abrufen:** `GET /athlete/{id}/events?oldest=...&newest=...` – liefert geplante Workouts
3. **Kalender aktualisieren:** Workouts per Name matchen, Datum + Dauer anpassen falls auf intervals.icu verschoben
4. **Neue Workouts importieren:** Events ohne lokales Match werden als neue Workouts angelegt
5. **Strava Auto-Log:** `fetchStravaActivities()` holt letzte 30 Aktivitäten, Rad-Aktivitäten werden tagesgenau ungloggten Workouts zugeordnet (bei mehreren: beste Dauer-Übereinstimmung)
6. **Plan-Upload:** `uploadPlanToIntervals()` sendet zukünftige Workouts als Events via `POST /athlete/{id}/events/bulk`

**Einschränkung:** Strava-gesourcte Aktivitäten liefern über die intervals.icu Activities API keine Details (`_note: "STRAVA activities are not available via the API"`). Deshalb werden Aktivitätsdaten direkt über die Strava API geholt.

## Security Note

Strava client secret and intervals.icu API key are exposed in client-side code (`strava.js`, `intervals.js`). This is a known trade-off of the no-backend architecture.

## Nutrition Coach Integration

AI nutrition coach MD files are stored in `../ai-nutrition-coach/` (outside this repo). Currently 3 files:
- `ernaehrung-fruehstueck.md` – Frühstück (Carb Cycling, Vollkorn, Belag-Priorisierung)
- `ernaehrung-mittagessen.md` – Mittagessen (Skyr-Base, Müsli-Vergleich, Beeren vs. Banane)
- `ernaehrung-snacks-nachmittag.md` – Snacks (Ruhetag/Milon/Rad-Tag differenziert)

When new MD files arrive, update `nutritionData` and `shoppingData` in `js/ernaehrung.js`.
