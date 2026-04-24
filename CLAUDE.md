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
  app.js                – Router, global state, localStorage, init, modals, workout CRUD, autoSyncOnStart hook
  komoot.js             – Komoot API: login, tour fetching, route data management, surface helpers
  routen.js             – Routen tab UI: Letzte Fahrten (Strava→Komoot match), route list, filters, detail view, ratings, ride log
  training.js           – Training views: calendar (with intervals.icu sync), week view, roadmap
  analyse.js            – Analyse: form curve, volume chart (soll/ist), stats, perf trends
  ernaehrung.js         – Ernährung: static nutrition data from AI coach, day-type toggle
  mehr.js               – Mehr: settings page, Sync-All section, profile, data export, intervals.icu/Komoot/Strava connection UI
  strava.js             – Strava OAuth 2.0, activity fetching, recent rides cache
  intervals.js          – intervals.icu API: event sync (silent mode), Strava auto-log, plan upload
  sync.js               – Sync-Orchestrator: Strava + intervals.icu + Komoot in einem Flow, Timestamps, autoSyncOnStart
  weather.js            – Open-Meteo weather API
manifest.json           – PWA manifest
icon-192.png, icon-512.png – App icons
training.json           – Example training plan for import
TRAINING_PLAN_SPEC.md   – Format guide for creating training plans
index_old.html          – Backup of previous single-file version (v1)
```

### App Structure (5 Tabs + Bottom Nav)

| Tab | File | Sub-Views | Description |
|-----|------|-----------|-------------|
| **Training** | training.js | Kalender, Woche, Roadmap | Monatskalender (intervals.icu-Style), Wochenansicht mit Soll/Ist, Roadmap bis Harzquerfahrt |
| **Ernährung** | ernaehrung.js | — | AI Coach Daten (Frühstück, Mittag, Snacks) mit Tagestyp-Toggle und Einkaufsliste |
| **Analyse** | analyse.js | — | Formkurve, Wochenvolumen Soll/Ist, Statistiken, Leistungsdaten-Trends |
| **Routen** | routen.js + komoot.js + sync.js | — | **Letzte Fahrten** (Strava-Aktivitäten mit Auto-Match zu Komoot-Routen), klappbare Komoot-Routenliste mit Bewertungen, Filter, Fahrten-Log, Oberflächen-Analyse |
| **Mehr** | mehr.js | — | **Sync-Sektion** (Alles synchronisieren), Profil, FTP, Strava, intervals.icu, Komoot, Plan-Import, Daten-Export, Reset |

**Navigation Flow:**
- Bottom-Nav: 5 Tabs, onclick-Handler direkt im HTML + JS-Listener
- Training Sub-Nav: 3 Buttons (Kalender/Woche/Roadmap) umschalten via `switchTrainingView()`
- Workout Detail: Fullscreen-View (`#workout-detail-view`), öffnet via `openWorkoutDetail(id)`
- Route Detail: Fullscreen-View (`#route-detail-view`), öffnet via `openRouteDetail(id)`
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
| (komoot.js) | `komoot-config` | Komoot credentials: email, password, userId, displayName |
| (komoot.js) | `komoot-routes` | Array of route objects with ratings, notes, ride log |
| (strava.js) | `strava-recent-rides` | Gecachte letzte Strava-Fahrten (1h TTL): `{ timestamp, rides[] }` |
| (routen.js) | `gravel-ride-assignments` | Map: Strava-Activity-ID → `{ status: 'assigned'\|'skipped', routeId?, rideLogEntryId? }` |
| (sync.js) | `sync-timestamps` | Map: `{ strava: ms, intervals: ms, komoot: ms }` für relative Sync-Anzeige und 24h-Threshold |

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
- **DOMContentLoaded Init:** lädt Daten/Tokens/Configs, rendert initiale Training-View, hängt Event-Listener an, und ruft `setTimeout(autoSyncOnStart, 500)` für nicht-blockierenden Background-Sync

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

**komoot.js (Komoot API & Data):**
- `loadKomootConfig()`, `saveKomootConfig()` – credentials persistence in localStorage
- `isKomootConnected()`, `connectKomoot(email, password)`, `disconnectKomoot()` – connection management
- `fetchKomootTours()` – fetch all tours (paginated, 100 per page), returns planned + recorded
- `fetchKomootTourDetail(tourId)` – fetch single tour with surfaces, way types, difficulty
- `syncKomootRoutes(progressCallback)` – main sync: fetch planned tours, load details, merge with existing user data (ratings, notes, ride log), apply Excel import data for new routes, count recorded rides
- `guessRegion(route)` – auto-assign region based on GPS coordinates (Bremen, Harz, Fehmarn, Müritz, Nordsee)
- `loadRoutes()`, `saveRoutes()`, `updateRoute()` – route data CRUD in localStorage
- `addRideLogEntry()`, `deleteRideLogEntry()` – ride log management
- Surface/way type helpers: `getSurfaceLabel()`, `getSurfaceClass()`, `getSurfaceColor()`, `getWayTypeLabel()`, `getSportLabel()`, `getDifficultyLabel()`, `formatDurationRoute()`
- `EXCEL_IMPORT_DATA` – pre-existing ratings from Fahrradrouten.xlsx (10 routes), applied on first sync

**routen.js (Routen Tab UI):**
- `renderRouten()` – main render: header (mit Sync-All-Button), Letzte-Fahrten-Sektion, klappbarer „Alle Komoot-Routen" Block mit search/filters/sort/list
- `renderRouteCard(route, rideCount)` – card with name, sport badge, stats, surface bar, tags, stars
- `openRouteDetail(routeId)` – fullscreen view with stats grid, surface detail, way types, rating section (star input, toggles), notes textarea, ride log with add/delete
- `closeRouteDetail()` – close and re-render list
- `setRouteRating(routeId, field, value)` – set/toggle star rating (rating or difficultyRating)
- `toggleRouteFlag(routeId, field, value)` – toggle wetSuitable/pendelTauglich
- `saveRouteNotes(routeId, notes)` – save notes on blur
- `showAddRideForm()`, `saveRideLogEntry()`, `deleteRide()` – ride log UI actions
- `handleKomootSync()` – legacy nur-Komoot-Sync-Handler (intern noch verfügbar)
- `handleSyncAllFromRouten()` – Header-Button „Sync All", ruft `syncAll()` mit Fortschrittsanzeige
- `toggleAllRoutes()`, `toggleRecentRidesMore()` – Klapp-Logik für „Alle Komoot-Routen" und „Weitere Fahrten"
- Filter state: `routenSearchQuery`, `routenSportFilter`, `routenRegionFilter`, `routenSortBy`, `routenSortDir`, `routenSpecialFilter`, `routenAllRoutesCollapsed`, `recentRidesMoreCollapsed`

**routen.js – Letzte Fahrten / Strava→Komoot Match:**
- `renderRecentRidesSection(routes, isLoading)` – top-of-tab Sektion: zeigt 3 Karten + klappbarer Block für 12 weitere
- `renderRecentRideCard(ride, routes, assignment)` – Karte mit Auto-Match-Badge (✅ assigned / 🔍 suggest / 🚴 Spontanfahrt / ❓ unknown) und Action-Buttons
- `loadRecentRidesAsync()`, `refreshRecentRides()` – Lazy-Load mit/ohne Force-Refresh, rendert Sektion neu
- `haversineMeters(lat1, lng1, lat2, lng2)` – GPS-Distanz in Metern für Match-Score
- `isSportCompatible(stravaType, komootSport)` – Strava sport_type → kompatible Komoot-Sports
- `scoreRouteMatch(activity, route)` – Score 0–125: GPS-Start (≤500m=50, ≤1.5km=25, ≤3km=10), Distanz (±2km=30, ±5km=15, ±10km=5), Höhenmeter-Diff (≤30%=10, ≤60%=5), Sport-Match=10, Name-Overlap=25
- `matchRideToRoutes(activity, routes)` – returns `{ best, alternatives, all }`. `best` nur wenn Score ≥40
- `loadRideAssignments()`, `saveRideAssignments()`, `setRideAssignment(activityId, data)` – Persistence in `gravel-ride-assignments`
- `confirmRideMatch(activityId, routeId)` – legt RideLog-Eintrag aus Strava-Daten an, speichert Assignment, öffnet Routen-Detail
- `unassignRide(activityId)` – entfernt Assignment + zugehörigen RideLog-Eintrag
- `skipRide(activityId)` – markiert als Spontanfahrt
- `openRidePicker(activityId)`, `closeRidePicker()`, `confirmRideMatchFromPicker()`, `filterPickerList(q)` – manuelles Routen-Picker UI (Top 5 nach Score + alphabetische Liste mit Filter)

**mehr.js (Settings):**
- `renderMehr()` – settings page: **Sync-Sektion ganz oben** (Status pro Quelle + „Alles synchronisieren"-Button), profile, FTP, Strava, intervals.icu, Komoot, import, export
- `handleSyncAll()` – orchestriert vollen Sync via `syncAll()` mit Button-Progress
- `handleKomootConnect()` – Komoot login from Mehr tab (email + password form)
- `exportData()` – download backup as JSON file

**intervals.js (intervals.icu Integration):**
- `loadIntervalsConfig()`, `saveIntervalsConfig()` – credentials persistence (auto-connects with defaults)
- `isIntervalsConnected()`, `connectIntervals()`, `disconnectIntervals()` – connection management
- `fetchIntervalsEvents(oldest, newest)` – fetch planned workouts from intervals.icu Events API
- `syncIntervalsToCalendar(silent = false)` – main sync: pull events, update workout dates, auto-log Strava activities. `silent=true` unterdrückt Alerts (für Auto-Sync)
- `uploadPlanToIntervals()` – push future workouts to intervals.icu calendar
- `loadCachedIntervalsActivities()` – restore cached events from localStorage

**strava.js:**
- Connection: `connectStrava()`, `disconnectStrava()`, `handleStravaCallback()`, `refreshStravaToken()`, `loadStravaTokens()`, `saveStravaTokens()`, `isStravaConnected()`, `updateStravaUI()`
- Activities: `fetchStravaActivities()` (per_page=30), `formatStravaActivity()` – mappt jetzt zusätzlich `startLat`, `startLng`, `elevation`, `sportType` für Match-Logik
- Recent Rides Cache: `fetchRecentRides(forceRefresh = false)` mit 1h-TTL in `strava-recent-rides`, filtert nur Cycling-Aktivitäten (Ride/VirtualRide/GravelRide/MountainBikeRide/EBikeRide)
- Workout-Logging: `loadStravaActivitiesForLog()`, `selectStravaActivity()`

**sync.js (Sync-Orchestrator):**
- `loadSyncTimestamps()`, `saveSyncTimestamp(source)`, `getLastSyncMs(source)` – Timestamps in `sync-timestamps`
- `formatRelativeTime(ms)` – „vor 12 Min", „vor 3 Std", „vor 2 Tagen"
- `syncStravaOnly()`, `syncIntervalsOnly()`, `syncKomootOnly(progressCallback)` – Wrapper mit Timestamp-Update und Result-Objekt `{ ok, count?, error?, skipped?, reason? }`
- `syncAll(options)` – Orchestriert alle drei sequentiell. Options: `includeKomoot` (default true), `silent` (default false), `progressCallback(step, info)`. Zeigt am Ende Alert mit Zusammenfassung wenn nicht silent
- `autoSyncOnStart()` – wird 500 ms nach DOMContentLoaded gerufen. Strava + intervals.icu immer, Komoot nur wenn `Date.now() - lastKomoot > 24h`. Immer silent
- Konstanten: `SYNC_TIMESTAMPS_KEY`, `KOMOOT_AUTO_SYNC_INTERVAL_MS`

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

### Route Data Model (in komoot.js → localStorage `komoot-routes`)

```json
{
  "id": "string (Komoot tour ID)",
  "name": "string",
  "sport": "racebike | touringbicycle | mtb_easy | mtb",
  "distance": 65.2,
  "elevationUp": 1300,
  "elevationDown": 1280,
  "duration": 15638,
  "startPoint": { "lat": 53.07, "lng": 8.80, "alt": 5.0 },
  "date": "ISO 8601 string",
  "link": "https://www.komoot.com/de-de/tour/{id}",
  "surfaces": [
    { "type": "sb#asphalt", "amount": 0.25 },
    { "type": "sb#compacted", "amount": 0.42 },
    { "type": "sb#unpaved", "amount": 0.19 }
  ],
  "wayTypes": [
    { "type": "wt#way", "amount": 0.56 },
    { "type": "wt#trail", "amount": 0.14 },
    { "type": "wt#street", "amount": 0.13 }
  ],
  "difficulty": { "grade": "moderate", "explanation_technical": "db#t1", "explanation_fitness": "d#c2" },
  "constitution": 3,
  "recordedCount": 5,
  "lastRidden": "ISO 8601 string or null",
  "rating": 0,
  "difficultyRating": 0,
  "wetSuitable": false,
  "pendelTauglich": false,
  "notes": "string",
  "region": "Umgebung | Harz | Fehmarn | Müritz | Nordsee | Sonstige",
  "rideLog": [
    {
      "id": "timestamp string",
      "date": "YYYY-MM-DD",
      "feeling": 3,
      "weather": "sonnig | bewölkt | regen | wind | kalt",
      "duration": 120,
      "notes": "string"
    }
  ]
}
```

**Felder automatisch von Komoot:** id, name, sport, distance, elevationUp/Down, duration, startPoint, date, link, surfaces, wayTypes, difficulty, constitution, recordedCount, lastRidden

**Felder manuell vom Benutzer:** rating (1-5 Sterne Spass), difficultyRating (1-5 Sterne), wetSuitable, pendelTauglich, notes, region (initial automatisch geraten), rideLog

### Ride Log Entry

Jede Route kann beliebig viele Fahrten-Log-Einträge haben. Pro Fahrt:
- **Datum** – Wann gefahren
- **Gefühl** (1-5) – 😫 😕 😐 🙂 💪
- **Wetter** – sonnig/bewölkt/regen/wind/kalt
- **Dauer** (Minuten) – optional
- **Notizen** – Freitext

### Surface Types (Komoot API)

| API-Code | Label | Farbe | Beschreibung |
|----------|-------|-------|-------------|
| `sb#asphalt` | Asphalt | Blau (#3B82F6) | Asphaltierte Strassen |
| `sb#compacted` | Verdichtet | Gelb (#EAB308) | Verdichtete Erde/Kies |
| `sb#unpaved` | Unbefestigt | Orange (#F97316) | Unbefestigte Wege |
| `sb#cobbles` | Kopfstein | Rot (#EF4444) | Kopfsteinpflaster |
| `sb#paved` | Befestigt | Grün (#22C55E) | Sonstige befestigte Oberfläche |
| `sf#unknown` | Unbekannt | Grau (#64748B) | Keine Daten |

### Way Types (Komoot API)

| API-Code | Label |
|----------|-------|
| `wt#cycleway` | Radweg |
| `wt#street` | Strasse |
| `wt#minor_road` | Nebenstrasse |
| `wt#trail` | Trail |
| `wt#way` | Weg |
| `wt#path` | Pfad |
| `wt#state_road` | Landstrasse |

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
4. **Cache-Busting:** All CSS/JS includes in index.html use `?v=N` query params. Increment version after changes to force browser reload. Bei neuen JS-Files (z.B. `sync.js`) auch das `<script>`-Tag in `index.html` ergänzen — Reihenfolge wichtig (Abhängigkeiten zuerst).

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
- **Komoot API:** Inoffizielle API, HTTP Basic Auth (E-Mail + Passwort), credentials in localStorage (`komoot-config`). User-ID: `1130745446386`. Details siehe Komoot Sync Flow unten.
- **Open-Meteo:** Free weather API, no key required. Coordinates: Bremen (53.0793, 8.8017). 7-day forecast with WMO weather codes.

### Combined Sync Flow (sync.js)

`syncAll()` orchestriert die drei Quellen sequentiell mit Fortschritts-Callback und Timestamp-Tracking pro Quelle.

**Auslöser:**
- **Auto beim App-Start:** `autoSyncOnStart()` läuft 500 ms nach `DOMContentLoaded`. Strava + intervals.icu *immer*, Komoot *nur wenn* `Date.now() - sync-timestamps.komoot > 24h`. Immer `silent: true`.
- **Manuell „Alles synchronisieren":** Button im Mehr-Tab oben (`handleSyncAll()`).
- **Manuell „Sync All":** Button im Routen-Tab Header (`handleSyncAllFromRouten()`).

**Reihenfolge in `syncAll()`:**
1. **Strava** (`syncStravaOnly`) – `fetchRecentRides(true)` invalidiert Cache, refreshed Letzte-Fahrten-Sektion live
2. **intervals.icu** (`syncIntervalsOnly`) – ruft `syncIntervalsToCalendar(true)` (silent)
3. **Komoot** (`syncKomootOnly`) – nur wenn `includeKomoot: true`. Ruft `syncKomootRoutes()` mit Progress-Callback `(cur, total) => "Komoot N/M..."`

Pro erfolgreichem Step wird `saveSyncTimestamp(source)` aufgerufen. Am Ende (wenn nicht silent) Alert mit Zusammenfassung pro Quelle (`describeResult`).

**Sync-Status im Mehr-Tab:** Zeigt `formatRelativeTime(ts)` pro Quelle (`gerade eben` / `vor X Min` / `vor X Std` / `vor X Tagen` / `noch nie`).

**Konkurrenzschutz:** `syncAllRunning` Flag verhindert parallele Calls.

### intervals.icu Sync Flow

1. **Auslöser:** Auto-Sync via `syncAll()`, „Sync All"-Button (Mehr/Routen) oder einzelner Sync-Button im Mehr-Tab. Funktion: `syncIntervalsToCalendar(silent = false)`
2. **Events abrufen:** `GET /athlete/{id}/events?oldest=...&newest=...` – liefert geplante Workouts
3. **Kalender aktualisieren:** Workouts per Name matchen, Datum + Dauer anpassen falls auf intervals.icu verschoben
4. **Neue Workouts importieren:** Events ohne lokales Match werden als neue Workouts angelegt
5. **Strava Auto-Log:** `fetchStravaActivities()` holt letzte 30 Aktivitäten, Rad-Aktivitäten werden tagesgenau ungloggten Workouts zugeordnet (bei mehreren: beste Dauer-Übereinstimmung)
6. **Plan-Upload:** `uploadPlanToIntervals()` sendet zukünftige Workouts als Events via `POST /athlete/{id}/events/bulk`

**`silent` Parameter:** Bei `silent=true` werden alle `alert()`-Calls unterdrückt (für Hintergrund-Sync). Errors werden nur in die Konsole geloggt, der Aufrufer erhält die Exception via `throw`.

**Einschränkung:** Strava-gesourcte Aktivitäten liefern über die intervals.icu Activities API keine Details (`_note: "STRAVA activities are not available via the API"`). Deshalb werden Aktivitätsdaten direkt über die Strava API geholt.

### Letzte Fahrten / Strava → Komoot Match Flow

Anzeige der letzten Strava-Aktivitäten oben im Routen-Tab mit automatischer Zuordnung zur passenden Komoot-Route.

1. **Quelle:** `fetchRecentRides()` in `strava.js` – holt 30 Aktivitäten via `GET /athlete/activities?per_page=30`, filtert auf Cycling (Ride/VirtualRide/GravelRide/MountainBikeRide/EBikeRide). Cache 1h in `strava-recent-rides`
2. **Anzeige:** Erste 3 Fahrten direkt sichtbar, weitere 12 in einklappbarem Block („Weitere Fahrten")
3. **Match-Score** (`scoreRouteMatch`): Pro Komoot-Route wird ein Score 0–125 berechnet:
   - GPS-Startpunkt (Haversine): ≤500m=50, ≤1.5km=25, ≤3km=10
   - Distanz-Differenz: ±2km=30, ±5km=15, ±10km=5
   - Höhenmeter-Diff (relativ): ≤30%=10, ≤60%=5
   - Sport-Kompatibilität (Strava sport_type → Komoot-Sport-Liste): +10
   - Name-Overlap (Strava-Name ⊂ Routen-Name oder umgekehrt): +25
4. **Threshold:** Bester Match wird als Vorschlag angezeigt wenn Score ≥40, sonst „❓ Keine Route erkannt"
5. **User-Aktionen pro Karte:**
   - **✓ Bestätigen** → `confirmRideMatch()`: legt RideLog-Eintrag an (`id: 'strava-{activityId}'`, Datum/Dauer aus Strava, Default-Feeling 3, Notiz „Aus Strava: {Name}"), speichert Assignment, öffnet Routen-Detail zum Sterne-Bewerten
   - **Andere Route / Route zuordnen** → `openRidePicker()`: Fullscreen-Picker mit Top-5 nach Score + alphabetischer Liste mit Suchfilter
   - **Spontanfahrt** → `skipRide()`: markiert als `status: 'skipped'`, blendet Vorschlag aus
   - **Zuordnung lösen** (auf assigned card): entfernt Assignment + RideLog-Eintrag
6. **Persistenz:** `gravel-ride-assignments` map: `{ "<stravaActivityId>": { status, routeId?, rideLogEntryId? } }`

**Sport-Mapping (`isSportCompatible`):**
- `Ride` → racebike, touringbicycle, mtb_easy
- `GravelRide` → mtb_easy, touringbicycle, racebike, mtb
- `MountainBikeRide` → mtb, mtb_easy
- `EBikeRide` → touringbicycle, racebike, mtb_easy
- `VirtualRide` → keine (Indoor)

**Warum Strava statt Komoot-Recordings als Quelle?** Strava-API ist offiziell und versioniert, liefert reichere Felder (`start_latlng`, `total_elevation_gain`, `sport_type`). Komoot-API ist inoffiziell und langsamer (jede Tour-Detail einzeln). Wahoo schreibt eh in beide Systeme, daher kein Datenverlust.

### Komoot Sync Flow

1. **Login:** `GET https://api.komoot.de/v006/account/email/{email}/` mit Basic Auth → liefert `username` (User-ID) und `displayname`
2. **Touren laden:** `GET https://api.komoot.de/v007/users/{userId}/tours/?page=N&limit=100` – paginiert, liefert alle Touren (geplant + aufgezeichnet)
3. **Geplante Touren filtern:** Nur `type === 'tour_planned'` werden als Routen importiert (das sind die gespeicherten/geplanten Routen)
4. **Tour-Details laden:** `GET https://api.komoot.de/v007/tours/{tourId}` – für jede geplante Tour einzeln (liefert Oberflächen, Wegtypen, Schwierigkeit). 150ms Delay zwischen Requests (Rate Limiting)
5. **Aufgezeichnete Fahrten zählen:** Recorded tours werden per Name-Match oder Distanz-Match (±3 km + gleicher Sport) den geplanten Routen zugeordnet → `recordedCount` und `lastRidden`
6. **Benutzer-Daten mergen:** Bestehende Bewertungen, Notizen, Fahrten-Log aus localStorage werden beibehalten. Neue Routen erhalten ggf. Daten aus `EXCEL_IMPORT_DATA` (einmalige Migration aus Fahrradrouten.xlsx)
7. **Region automatisch erraten:** GPS-Koordinaten des Startpunkts werden Regionen zugeordnet (Bremen/Umgebung, Harz, Fehmarn, Müritz, Nordsee)

**Hinweis:** Die Komoot API ist **inoffiziell** und nicht öffentlich dokumentiert. Sie kann jederzeit von Komoot geändert werden. Endpunkte wurden über Reverse-Engineering (Python-Library `komPYoot`) ermittelt.

**Statistiken (Stand April 2026):** 318 Touren gesamt – 83 geplant, 235 aufgezeichnet. Sportarten: Rennrad (214), Trekking (50), Gravel/MTB (49), MTB (5).

### Excel Import (Einmalige Migration)

Die Datei `../komoot-routen/Fahrradrouten.xlsx` enthielt 12 bereits dokumentierte Routen mit Bewertungen. Diese wurden als `EXCEL_IMPORT_DATA` in `komoot.js` eingebettet und werden beim ersten Sync automatisch auf die passenden Komoot-Touren angewendet.

**Bewertungs-Konvertierung:** Excel nutzte Schulnoten (1=beste, 6=schlechteste). Konvertiert zu 5-Sterne-System: `Sterne = 6 - Schulnote` (1→5, 2→4, 3→3, 4→2, 5→1).

## Security Note

Strava client secret, intervals.icu API key, and Komoot credentials are exposed in client-side code / localStorage. This is a known trade-off of the no-backend architecture. Komoot credentials (`komoot-config` in localStorage) include the plain-text password, required for Basic Auth API calls.

## Nutrition Coach Integration

AI nutrition coach MD files are stored in `../ai-nutrition-coach/` (outside this repo). Currently 3 files:
- `ernaehrung-fruehstueck.md` – Frühstück (Carb Cycling, Vollkorn, Belag-Priorisierung)
- `ernaehrung-mittagessen.md` – Mittagessen (Skyr-Base, Müsli-Vergleich, Beeren vs. Banane)
- `ernaehrung-snacks-nachmittag.md` – Snacks (Ruhetag/Milon/Rad-Tag differenziert)

When new MD files arrive, update `nutritionData` and `shoppingData` in `js/ernaehrung.js`.
