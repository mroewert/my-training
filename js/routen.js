// ============================================
// ROUTEN.JS – Routen Tab UI
// ============================================

let routenSearchQuery = '';
let routenSportFilter = 'all';
let routenRegionFilter = 'all';
let routenSortBy = 'name';
let routenSortDir = 'asc';
let routenSpecialFilter = 'all'; // all, rated, unrated, pendel, wet
let routenAllRoutesCollapsed = true;
let recentRidesCache = null; // populated async on first render
let recentRidesLoading = false;
let pendingPickerActivityId = null; // for manual route picker

// ---- Main Render ----
function renderRouten() {
    const container = document.getElementById('routen-content');
    const routes = loadRoutes();
    const connected = isKomootConnected();

    if (!connected && routes.length === 0) {
        container.innerHTML = `
            <div class="routen-empty">
                <div class="empty-icon">🗺️</div>
                <div class="empty-text">Noch keine Routen vorhanden</div>
                <div class="empty-text" style="font-size:13px;">Verbinde Komoot im Tab "Mehr", um deine Routen zu importieren.</div>
            </div>`;
        return;
    }

    // Get unique regions and sports for filters
    const regions = [...new Set(routes.map(r => r.region).filter(Boolean))].sort();
    const sports = [...new Set(routes.map(r => r.sport).filter(Boolean))].sort();

    // Filter routes
    let filtered = routes.filter(r => {
        if (routenSearchQuery) {
            const q = routenSearchQuery.toLowerCase();
            if (!r.name.toLowerCase().includes(q) &&
                !(r.region || '').toLowerCase().includes(q) &&
                !(r.notes || '').toLowerCase().includes(q)) return false;
        }
        if (routenSportFilter !== 'all' && r.sport !== routenSportFilter) return false;
        if (routenRegionFilter !== 'all' && r.region !== routenRegionFilter) return false;
        if (routenSpecialFilter === 'rated' && !r.rating) return false;
        if (routenSpecialFilter === 'unrated' && r.rating) return false;
        if (routenSpecialFilter === 'pendel' && !r.pendelTauglich) return false;
        if (routenSpecialFilter === 'wet' && !r.wetSuitable) return false;
        return true;
    });

    // Sort routes
    filtered.sort((a, b) => {
        let cmp = 0;
        switch (routenSortBy) {
            case 'name': cmp = a.name.localeCompare(b.name); break;
            case 'distance': cmp = a.distance - b.distance; break;
            case 'elevation': cmp = a.elevationUp - b.elevationUp; break;
            case 'rating': cmp = (b.rating || 0) - (a.rating || 0); break;
            case 'difficulty': cmp = (b.difficultyRating || 0) - (a.difficultyRating || 0); break;
            case 'rides': cmp = (b.rideLog?.length || 0) - (a.rideLog?.length || 0); break;
        }
        return routenSortDir === 'desc' ? -cmp : cmp;
    });

    // Pin routes ridden today at the top (most recent first), regardless of active sort
    const todayRoutes = filtered.filter(isRiddenToday).sort((a, b) => getLastRiddenTime(b) - getLastRiddenTime(a));
    if (todayRoutes.length > 0) {
        const todaySet = new Set(todayRoutes.map(r => r.id));
        filtered = [...todayRoutes, ...filtered.filter(r => !todaySet.has(r.id))];
    }

    let html = `
        <div class="routen-header">
            <div>
                <h2>Routen</h2>
                <span class="route-count">${filtered.length} von ${routes.length} Routen</span>
            </div>
            ${connected ? `<button class="btn-sync-komoot" onclick="handleKomootSync()">Komoot Sync</button>` : ''}
        </div>

        <div id="recent-rides-section">${renderRecentRidesSection(routes)}</div>

        <div class="all-routes-toggle">
            <button class="all-routes-toggle-btn" onclick="toggleAllRoutes()">
                <span>${routenAllRoutesCollapsed ? '▶' : '▼'}</span>
                Alle Komoot-Routen (${routes.length})
            </button>
        </div>

        <div class="routen-collapsible" style="${routenAllRoutesCollapsed ? 'display:none;' : ''}">

        <div class="routen-filters">
            <input type="text" class="routen-search" placeholder="Route suchen..."
                   value="${routenSearchQuery}" oninput="routenSearchQuery = this.value; renderRouten();">

            <div class="routen-filter-row">
                <button class="filter-chip ${routenSportFilter === 'all' ? 'active' : ''}"
                        onclick="routenSportFilter='all'; renderRouten();">Alle</button>
                ${sports.map(s => `
                    <button class="filter-chip ${routenSportFilter === s ? 'active' : ''}"
                            onclick="routenSportFilter='${s}'; renderRouten();">${getSportLabel(s)}</button>
                `).join('')}
            </div>

            <div class="routen-filter-row">
                <button class="filter-chip ${routenSpecialFilter === 'all' ? 'active' : ''}"
                        onclick="routenSpecialFilter='all'; renderRouten();">Alle</button>
                <button class="filter-chip ${routenSpecialFilter === 'pendel' ? 'active' : ''}"
                        onclick="routenSpecialFilter='pendel'; renderRouten();">Pendel</button>
                <button class="filter-chip ${routenSpecialFilter === 'wet' ? 'active' : ''}"
                        onclick="routenSpecialFilter='wet'; renderRouten();">Bei Nässe</button>
                <button class="filter-chip ${routenSpecialFilter === 'rated' ? 'active' : ''}"
                        onclick="routenSpecialFilter='rated'; renderRouten();">Bewertet</button>
                <button class="filter-chip ${routenSpecialFilter === 'unrated' ? 'active' : ''}"
                        onclick="routenSpecialFilter='unrated'; renderRouten();">Unbewertet</button>
                ${regions.map(r => `
                    <button class="filter-chip ${routenRegionFilter === r ? 'active' : ''}"
                            onclick="routenRegionFilter='${r}'; renderRouten();">${r}</button>
                `).join('')}
            </div>
        </div>

        <div class="routen-sort">
            <label>Sortieren:</label>
            <select class="sort-select" onchange="routenSortBy=this.value; renderRouten();">
                <option value="name" ${routenSortBy === 'name' ? 'selected' : ''}>Name</option>
                <option value="distance" ${routenSortBy === 'distance' ? 'selected' : ''}>Distanz</option>
                <option value="elevation" ${routenSortBy === 'elevation' ? 'selected' : ''}>Höhenmeter</option>
                <option value="rating" ${routenSortBy === 'rating' ? 'selected' : ''}>Bewertung</option>
                <option value="difficulty" ${routenSortBy === 'difficulty' ? 'selected' : ''}>Schwierigkeit</option>
                <option value="rides" ${routenSortBy === 'rides' ? 'selected' : ''}>Fahrten</option>
            </select>
            <button class="filter-chip" onclick="routenSortDir = routenSortDir === 'asc' ? 'desc' : 'asc'; renderRouten();">
                ${routenSortDir === 'asc' ? '↑' : '↓'}
            </button>
        </div>

        <div class="routen-list">`;

    if (filtered.length === 0) {
        html += `<div class="routen-empty">
            <div class="empty-text">Keine Routen gefunden</div>
        </div>`;
    }

    filtered.forEach(route => {
        const rideCount = (route.rideLog?.length || 0) + (route.recordedCount || 0);
        html += renderRouteCard(route, rideCount);
    });

    html += `</div></div>`;
    container.innerHTML = html;

    // Trigger lazy load of Strava recent rides
    if (!recentRidesCache && !recentRidesLoading && typeof isStravaConnected === 'function' && isStravaConnected()) {
        loadRecentRidesAsync();
    }
}

function toggleAllRoutes() {
    routenAllRoutesCollapsed = !routenAllRoutesCollapsed;
    renderRouten();
}

// ---- "Heute gefahren" helpers ----
function isRiddenToday(route) {
    const todayStr = new Date().toDateString();
    if (route.lastRidden && new Date(route.lastRidden).toDateString() === todayStr) return true;
    if (route.rideLog?.length) {
        const localToday = (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();
        if (route.rideLog.some(e => e.date === localToday)) return true;
    }
    return false;
}

function getLastRiddenTime(route) {
    let t = route.lastRidden ? new Date(route.lastRidden).getTime() : 0;
    if (route.rideLog?.length) {
        for (const e of route.rideLog) {
            const et = e.date ? new Date(e.date).getTime() : 0;
            if (et > t) t = et;
        }
    }
    return t;
}

// ---- Route Card ----
function renderRouteCard(route, rideCount) {
    const surfaceBar = route.surfaces.length > 0
        ? `<div class="surface-bar">
            ${route.surfaces.map(s => `<div class="surface-bar-segment ${getSurfaceClass(s.type)}" style="width:${s.amount * 100}%"></div>`).join('')}
           </div>`
        : '';

    const tags = [];
    if (isRiddenToday(route)) tags.push('<span class="route-tag tag-today">Heute gefahren</span>');
    if (route.pendelTauglich) tags.push('<span class="route-tag tag-pendel">Pendel</span>');
    if (route.wetSuitable) tags.push('<span class="route-tag tag-wet-yes">Bei Nässe OK</span>');
    if (route.region) tags.push(`<span class="route-tag">${route.region}</span>`);
    if (route.difficulty?.grade) tags.push(`<span class="route-tag">${getDifficultyLabel(route.difficulty.grade)}</span>`);

    return `
        <div class="route-card" onclick="openRouteDetail('${route.id}')">
            <div class="route-card-header">
                <div class="route-card-name">${route.name}</div>
                <span class="route-card-sport sport-${route.sport}">${getSportLabel(route.sport)}</span>
            </div>
            <div class="route-card-stats">
                <span><span class="stat-icon">📏</span> ${route.distance} km</span>
                <span><span class="stat-icon">⛰️</span> ${route.elevationUp} hm</span>
                <span><span class="stat-icon">⏱️</span> ${formatDurationRoute(route.duration)}</span>
            </div>
            ${surfaceBar}
            ${tags.length > 0 ? `<div class="route-card-tags">${tags.join('')}</div>` : ''}
            <div class="route-card-rating">
                <div class="stars">${renderStars(route.rating || 0)}</div>
                ${route.difficultyRating ? `<span class="rating-label">Schwierigkeit: ${route.difficultyRating}/5</span>` : ''}
                <span class="ride-count">${rideCount > 0 ? rideCount + 'x gefahren' : ''}</span>
            </div>
        </div>`;
}

function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star ${i <= rating ? 'filled' : ''}">★</span>`;
    }
    return html;
}

// ---- Route Detail ----
function openRouteDetail(routeId) {
    const routes = loadRoutes();
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    const view = document.getElementById('route-detail-view');
    const rideCount = (route.rideLog?.length || 0) + (route.recordedCount || 0);

    let html = `
        <div class="fullscreen-header">
            <button class="btn-back" onclick="closeRouteDetail()">←</button>
            <h2>${route.name}</h2>
        </div>
        <div class="route-detail">
            <div class="route-detail-hero">
                <div class="route-detail-meta">
                    <span class="route-card-sport sport-${route.sport}">${getSportLabel(route.sport)}</span>
                    <span>📏 ${route.distance} km</span>
                    <span>⛰️ ${route.elevationUp} hm</span>
                    <span>⏱️ ${formatDurationRoute(route.duration)}</span>
                    ${route.difficulty?.grade ? `<span>💪 ${getDifficultyLabel(route.difficulty.grade)}</span>` : ''}
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="route-stats-grid">
                <div class="route-stat-card">
                    <div class="route-stat-value">${route.distance}</div>
                    <div class="route-stat-label">km</div>
                </div>
                <div class="route-stat-card">
                    <div class="route-stat-value">${route.elevationUp}</div>
                    <div class="route-stat-label">Höhenmeter</div>
                </div>
                <div class="route-stat-card">
                    <div class="route-stat-value">${rideCount}</div>
                    <div class="route-stat-label">Fahrten</div>
                </div>
            </div>`;

    // Surface Detail
    if (route.surfaces.length > 0) {
        html += `
            <div class="surface-detail">
                <h3>Oberflächen</h3>
                <div class="surface-detail-bar">
                    ${route.surfaces.map(s =>
                        `<div class="surface-bar-segment ${getSurfaceClass(s.type)}" style="width:${s.amount * 100}%"></div>`
                    ).join('')}
                </div>
                <div class="surface-legend">
                    ${route.surfaces.filter(s => s.amount > 0.01).map(s =>
                        `<span class="surface-legend-item">
                            <span class="surface-legend-dot" style="background:${getSurfaceColor(s.type)}"></span>
                            ${getSurfaceLabel(s.type)} ${Math.round(s.amount * 100)}%
                        </span>`
                    ).join('')}
                </div>
            </div>`;
    }

    // Way Types
    if (route.wayTypes.length > 0) {
        const sortedWayTypes = [...route.wayTypes].sort((a, b) => b.amount - a.amount);
        html += `
            <div class="way-types-detail">
                <h3>Wegtypen</h3>
                ${sortedWayTypes.filter(w => w.amount > 0.01).map(w => `
                    <div class="way-type-row">
                        <span class="way-type-label">${getWayTypeLabel(w.type)}</span>
                        <div class="way-type-bar-bg">
                            <div class="way-type-bar-fill" style="width:${w.amount * 100}%"></div>
                        </div>
                        <span class="way-type-pct">${Math.round(w.amount * 100)}%</span>
                    </div>
                `).join('')}
            </div>`;
    }

    // Rating Section
    html += `
        <div class="route-rating-section">
            <h3>Bewertung</h3>
            <div class="rating-row">
                <label>Spass</label>
                <div class="star-input">
                    ${[1, 2, 3, 4, 5].map(i =>
                        `<button class="star-btn ${i <= (route.rating || 0) ? 'filled' : ''}"
                                 onclick="setRouteRating('${route.id}', 'rating', ${i})">★</button>`
                    ).join('')}
                </div>
            </div>
            <div class="rating-row">
                <label>Schwierigkeit</label>
                <div class="star-input">
                    ${[1, 2, 3, 4, 5].map(i =>
                        `<button class="star-btn ${i <= (route.difficultyRating || 0) ? 'filled' : ''}"
                                 onclick="setRouteRating('${route.id}', 'difficultyRating', ${i})">★</button>`
                    ).join('')}
                </div>
            </div>
            <div class="toggle-row">
                <label>Bei Nässe geeignet</label>
                <label class="toggle-switch">
                    <input type="checkbox" ${route.wetSuitable ? 'checked' : ''}
                           onchange="toggleRouteFlag('${route.id}', 'wetSuitable', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="toggle-row">
                <label>Pendel-tauglich</label>
                <label class="toggle-switch">
                    <input type="checkbox" ${route.pendelTauglich ? 'checked' : ''}
                           onchange="toggleRouteFlag('${route.id}', 'pendelTauglich', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>`;

    // Notes
    html += `
        <div class="route-notes">
            <h3>Notizen</h3>
            <textarea placeholder="Beschreibung, Tipps, Besonderheiten..."
                      onblur="saveRouteNotes('${route.id}', this.value)">${route.notes || ''}</textarea>
        </div>`;

    // Ride Log
    html += `
        <div class="ride-log-section">
            <h3>
                Fahrten-Log
                <button class="btn-add-ride" onclick="showAddRideForm('${route.id}')">+ Fahrt</button>
            </h3>
            <div id="add-ride-form-${route.id}" style="display:none; margin-bottom:12px;">
                <div class="add-ride-form">
                    <div class="form-row">
                        <div class="form-group" style="margin-bottom:0;">
                            <label class="form-label">Datum</label>
                            <input type="date" class="form-input" id="ride-date-${route.id}" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label class="form-label">Gefühl</label>
                            <select class="form-input" id="ride-feeling-${route.id}">
                                <option value="5">💪 Super</option>
                                <option value="4">🙂 Gut</option>
                                <option value="3" selected>😐 OK</option>
                                <option value="2">😕 Mäßig</option>
                                <option value="1">😫 Schlecht</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="margin-bottom:0;">
                            <label class="form-label">Wetter</label>
                            <select class="form-input" id="ride-weather-${route.id}">
                                <option value="sonnig">☀️ Sonnig</option>
                                <option value="bewölkt">⛅ Bewölkt</option>
                                <option value="regen">🌧️ Regen</option>
                                <option value="wind">💨 Windig</option>
                                <option value="kalt">🥶 Kalt</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label class="form-label">Dauer (min)</label>
                            <input type="number" class="form-input" id="ride-duration-${route.id}" placeholder="${Math.round(route.duration / 60)}">
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">Notizen</label>
                        <input type="text" class="form-input" id="ride-notes-${route.id}" placeholder="Wie war's?">
                    </div>
                    <button class="btn-primary" onclick="saveRideLogEntry('${route.id}')">Fahrt speichern</button>
                </div>
            </div>`;

    if (route.rideLog && route.rideLog.length > 0) {
        route.rideLog.forEach(entry => {
            const feelings = { 5: '💪', 4: '🙂', 3: '😐', 2: '😕', 1: '😫' };
            const weatherIcons = { 'sonnig': '☀️', 'bewölkt': '⛅', 'regen': '🌧️', 'wind': '💨', 'kalt': '🥶' };
            html += `
                <div class="ride-log-entry">
                    <div class="ride-log-date">
                        <span>${new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        <span>
                            <span class="ride-feeling">${feelings[entry.feeling] || ''} ${weatherIcons[entry.weather] || ''}</span>
                            <button class="btn-delete-ride" onclick="deleteRide('${route.id}', '${entry.id}')">✕</button>
                        </span>
                    </div>
                    ${entry.duration ? `<div class="ride-log-info">Dauer: ${entry.duration} min</div>` : ''}
                    ${entry.notes ? `<div class="ride-log-notes">${entry.notes}</div>` : ''}
                </div>`;
        });
    } else {
        html += `<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:12px;">Noch keine Fahrten eingetragen</div>`;
    }

    html += `</div>`;

    // Komoot Link
    html += `
        <a href="${route.link}" target="_blank" class="btn-komoot-link">
            🗺️ Auf Komoot ansehen
        </a>`;

    html += `</div>`;

    view.innerHTML = html;
    view.classList.add('active');
}

function closeRouteDetail() {
    document.getElementById('route-detail-view').classList.remove('active');
    renderRouten();
}

// ---- Rating Actions ----
function setRouteRating(routeId, field, value) {
    const routes = loadRoutes();
    const route = routes.find(r => r.id === routeId);
    if (route) {
        // Toggle: click same star again to clear
        route[field] = route[field] === value ? 0 : value;
        saveRoutes(routes);
        openRouteDetail(routeId);
    }
}

function toggleRouteFlag(routeId, field, value) {
    updateRoute(routeId, { [field]: value });
}

function saveRouteNotes(routeId, notes) {
    updateRoute(routeId, { notes: notes });
}

// ---- Ride Log Actions ----
function showAddRideForm(routeId) {
    const form = document.getElementById('add-ride-form-' + routeId);
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function saveRideLogEntry(routeId) {
    const date = document.getElementById('ride-date-' + routeId).value;
    const feeling = parseInt(document.getElementById('ride-feeling-' + routeId).value);
    const weather = document.getElementById('ride-weather-' + routeId).value;
    const duration = parseInt(document.getElementById('ride-duration-' + routeId).value) || 0;
    const notes = document.getElementById('ride-notes-' + routeId).value;

    addRideLogEntry(routeId, { date, feeling, weather, duration, notes });
    openRouteDetail(routeId);
}

function deleteRide(routeId, entryId) {
    if (confirm('Fahrt löschen?')) {
        deleteRideLogEntry(routeId, entryId);
        openRouteDetail(routeId);
    }
}

// ============================================
// LETZTE FAHRTEN (Strava → Komoot Matching)
// ============================================

const RIDE_ASSIGN_KEY = 'gravel-ride-assignments';

function loadRideAssignments() {
    try {
        const raw = localStorage.getItem(RIDE_ASSIGN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveRideAssignments(map) {
    localStorage.setItem(RIDE_ASSIGN_KEY, JSON.stringify(map));
}

function setRideAssignment(activityId, data) {
    const map = loadRideAssignments();
    map[String(activityId)] = data;
    saveRideAssignments(map);
}

// Haversine distance (meters) between two lat/lng pairs
function haversineMeters(lat1, lng1, lat2, lng2) {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// Strava sport_type → compatible Komoot sports
function isSportCompatible(stravaType, komootSport) {
    const map = {
        'Ride': ['racebike', 'touringbicycle', 'mtb_easy'],
        'GravelRide': ['mtb_easy', 'touringbicycle', 'racebike', 'mtb'],
        'MountainBikeRide': ['mtb', 'mtb_easy'],
        'EBikeRide': ['touringbicycle', 'racebike', 'mtb_easy'],
        'VirtualRide': []
    };
    const list = map[stravaType] || [];
    return list.includes(komootSport);
}

// Score how well a Strava activity matches a Komoot route. Higher = better.
function scoreRouteMatch(activity, route) {
    let score = 0;
    const breakdown = [];

    // GPS start point
    const routeLat = route.startPoint?.lat;
    const routeLng = route.startPoint?.lng;
    const gpsM = haversineMeters(activity.startLat, activity.startLng, routeLat, routeLng);
    if (gpsM <= 500) { score += 50; breakdown.push('Start ≤500m'); }
    else if (gpsM <= 1500) { score += 25; breakdown.push('Start ≤1.5km'); }
    else if (gpsM <= 3000) { score += 10; breakdown.push('Start ≤3km'); }

    // Distance match
    const dKm = Math.abs(parseFloat(activity.distance) - route.distance);
    if (dKm <= 2) { score += 30; breakdown.push('Distanz ±2km'); }
    else if (dKm <= 5) { score += 15; breakdown.push('Distanz ±5km'); }
    else if (dKm <= 10) { score += 5; }

    // Elevation match (relative diff)
    if (activity.elevation > 0 && route.elevationUp > 0) {
        const elDiff = Math.abs(activity.elevation - route.elevationUp) / route.elevationUp;
        if (elDiff <= 0.3) { score += 10; breakdown.push('Höhenmeter ähnlich'); }
        else if (elDiff <= 0.6) { score += 5; }
    }

    // Sport compatibility
    if (isSportCompatible(activity.sportType || activity.type, route.sport)) {
        score += 10;
    }

    // Name overlap
    const aName = (activity.name || '').toLowerCase();
    const rName = (route.name || '').toLowerCase();
    if (aName && rName && (aName.includes(rName) || rName.includes(aName))) {
        score += 25;
        breakdown.push('Name passt');
    }

    return { score, breakdown, gpsM, dKm };
}

function matchRideToRoutes(activity, routes) {
    const scored = routes.map(r => ({ route: r, ...scoreRouteMatch(activity, r) }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    const alternatives = scored.slice(1, 4).filter(s => s.score >= 30);
    return {
        best: best && best.score >= 40 ? best : null,
        alternatives,
        all: scored
    };
}

async function loadRecentRidesAsync() {
    if (recentRidesLoading) return;
    recentRidesLoading = true;
    try {
        recentRidesCache = await fetchRecentRides();
    } catch (e) {
        console.error('Recent rides load failed:', e);
        recentRidesCache = [];
    }
    recentRidesLoading = false;
    const section = document.getElementById('recent-rides-section');
    if (section) section.innerHTML = renderRecentRidesSection(loadRoutes());
}

async function refreshRecentRides() {
    recentRidesCache = null;
    recentRidesLoading = true;
    const section = document.getElementById('recent-rides-section');
    if (section) section.innerHTML = renderRecentRidesSection(loadRoutes(), true);
    try {
        recentRidesCache = await fetchRecentRides(true);
    } catch (e) {
        recentRidesCache = [];
    }
    recentRidesLoading = false;
    if (section) section.innerHTML = renderRecentRidesSection(loadRoutes());
}

function renderRecentRidesSection(routes, isLoading) {
    const stravaConnected = typeof isStravaConnected === 'function' && isStravaConnected();
    if (!stravaConnected) {
        return `
            <div class="recent-rides-block">
                <h3 class="recent-rides-title">Letzte Fahrten</h3>
                <div class="recent-rides-hint">Verbinde Strava im Tab "Mehr", um deine letzten Fahrten hier zu sehen.</div>
            </div>`;
    }

    const showLoading = isLoading || (recentRidesCache === null && recentRidesLoading);
    const rides = recentRidesCache || [];
    const assignments = loadRideAssignments();

    let body;
    if (showLoading) {
        body = `<div class="recent-rides-hint">Lade Strava-Aktivitäten...</div>`;
    } else if (rides.length === 0) {
        body = `<div class="recent-rides-hint">Keine Fahrten gefunden.</div>`;
    } else {
        const limited = rides.slice(0, 12);
        body = limited.map(ride => renderRecentRideCard(ride, routes, assignments[String(ride.id)])).join('');
    }

    return `
        <div class="recent-rides-block">
            <div class="recent-rides-header">
                <h3 class="recent-rides-title">Letzte Fahrten</h3>
                <button class="btn-refresh-rides" onclick="refreshRecentRides()" ${showLoading ? 'disabled' : ''}>
                    ${showLoading ? '⏳' : '🔄'}
                </button>
            </div>
            <div class="recent-rides-list">${body}</div>
        </div>`;
}

function renderRecentRideCard(ride, routes, assignment) {
    const dateStr = new Date(ride.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const stats = `📅 ${dateStr} &nbsp; 📏 ${ride.distance} km &nbsp; ⛰️ ${ride.elevation} hm &nbsp; ⏱️ ${ride.duration}min`;

    let badge = '';
    let actions = '';

    if (assignment?.status === 'assigned' && assignment.routeId) {
        const route = routes.find(r => r.id === assignment.routeId);
        const routeName = route?.name || 'Unbekannte Route';
        const stars = route ? renderStars(route.rating || 0) : '';
        badge = `<div class="ride-badge ride-badge-assigned">✅ ${routeName}</div>`;
        actions = `
            <div class="ride-actions">
                <div class="ride-stars-mini">${stars}</div>
                <button class="ride-action-btn" onclick="event.stopPropagation(); openRouteDetail('${assignment.routeId}')">Bewerten / Details</button>
                <button class="ride-action-btn ride-action-secondary" onclick="event.stopPropagation(); unassignRide(${ride.id})">Zuordnung lösen</button>
            </div>`;
    } else if (assignment?.status === 'skipped') {
        badge = `<div class="ride-badge ride-badge-spontan">🚴 Spontanfahrt</div>`;
        actions = `
            <div class="ride-actions">
                <button class="ride-action-btn ride-action-secondary" onclick="event.stopPropagation(); openRidePicker(${ride.id})">Doch zuordnen</button>
            </div>`;
    } else {
        const result = matchRideToRoutes(ride, routes);
        if (result.best) {
            const r = result.best.route;
            badge = `<div class="ride-badge ride-badge-suggest">🔍 Vorschlag: <strong>${r.name}</strong></div>`;
            actions = `
                <div class="ride-actions">
                    <button class="ride-action-btn ride-action-primary" onclick="event.stopPropagation(); confirmRideMatch(${ride.id}, '${r.id}')">✓ Bestätigen</button>
                    <button class="ride-action-btn" onclick="event.stopPropagation(); openRidePicker(${ride.id})">Andere Route</button>
                    <button class="ride-action-btn ride-action-secondary" onclick="event.stopPropagation(); skipRide(${ride.id})">Spontanfahrt</button>
                </div>`;
        } else {
            badge = `<div class="ride-badge ride-badge-unknown">❓ Keine Route erkannt</div>`;
            actions = `
                <div class="ride-actions">
                    <button class="ride-action-btn ride-action-primary" onclick="event.stopPropagation(); openRidePicker(${ride.id})">Route zuordnen</button>
                    <button class="ride-action-btn ride-action-secondary" onclick="event.stopPropagation(); skipRide(${ride.id})">Spontanfahrt</button>
                </div>`;
        }
    }

    return `
        <div class="recent-ride-card">
            <div class="recent-ride-name">${escapeHtml(ride.name)}</div>
            <div class="recent-ride-stats">${stats}</div>
            ${badge}
            ${actions}
        </div>`;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function findRideById(activityId) {
    if (!recentRidesCache) return null;
    return recentRidesCache.find(r => String(r.id) === String(activityId));
}

function rideToLogEntry(ride) {
    return {
        id: 'strava-' + ride.id,
        date: ride.date,
        feeling: 3,
        weather: 'sonnig',
        duration: ride.duration,
        notes: 'Aus Strava: ' + ride.name
    };
}

function confirmRideMatch(activityId, routeId) {
    const ride = findRideById(activityId);
    if (!ride) return;
    const routes = loadRoutes();
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    if (!route.rideLog) route.rideLog = [];
    const entry = rideToLogEntry(ride);
    if (!route.rideLog.some(e => e.id === entry.id)) {
        route.rideLog.push(entry);
        route.rideLog.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveRoutes(routes);
    }
    setRideAssignment(activityId, { status: 'assigned', routeId, rideLogEntryId: entry.id });
    openRouteDetail(routeId);
}

function unassignRide(activityId) {
    const map = loadRideAssignments();
    const a = map[String(activityId)];
    if (a?.routeId && a?.rideLogEntryId) {
        const routes = loadRoutes();
        const route = routes.find(r => r.id === a.routeId);
        if (route?.rideLog) {
            route.rideLog = route.rideLog.filter(e => e.id !== a.rideLogEntryId);
            saveRoutes(routes);
        }
    }
    delete map[String(activityId)];
    saveRideAssignments(map);
    const section = document.getElementById('recent-rides-section');
    if (section) section.innerHTML = renderRecentRidesSection(loadRoutes());
}

function skipRide(activityId) {
    setRideAssignment(activityId, { status: 'skipped' });
    const section = document.getElementById('recent-rides-section');
    if (section) section.innerHTML = renderRecentRidesSection(loadRoutes());
}

// ---- Manual Route Picker ----
function openRidePicker(activityId) {
    pendingPickerActivityId = activityId;
    const ride = findRideById(activityId);
    if (!ride) return;
    const routes = loadRoutes();
    const result = matchRideToRoutes(ride, routes);

    // Sorted: top scored first, then alphabetical
    const topIds = new Set(result.all.slice(0, 5).filter(s => s.score > 0).map(s => s.route.id));
    const top = result.all.slice(0, 5).filter(s => s.score > 0);
    const rest = [...routes].sort((a, b) => a.name.localeCompare(b.name)).filter(r => !topIds.has(r.id));

    const view = document.getElementById('route-detail-view');
    view.innerHTML = `
        <div class="fullscreen-header">
            <button class="btn-back" onclick="closeRidePicker()">←</button>
            <h2>Route zuordnen</h2>
        </div>
        <div class="ride-picker">
            <div class="ride-picker-ride">
                <div class="recent-ride-name">${escapeHtml(ride.name)}</div>
                <div class="recent-ride-stats">📅 ${new Date(ride.date).toLocaleDateString('de-DE')} &nbsp; 📏 ${ride.distance} km &nbsp; ⛰️ ${ride.elevation} hm</div>
            </div>
            ${top.length > 0 ? `
                <h3 class="picker-section-title">Beste Treffer</h3>
                ${top.map(s => renderPickerRow(activityId, s.route, s.score)).join('')}
            ` : ''}
            <h3 class="picker-section-title">Alle Routen</h3>
            <input type="text" class="routen-search" placeholder="Filtern..." oninput="filterPickerList(this.value)">
            <div id="picker-all-list">
                ${rest.map(r => renderPickerRow(activityId, r, 0)).join('')}
            </div>
        </div>`;
    view.classList.add('active');
}

function renderPickerRow(activityId, route, score) {
    return `
        <div class="picker-row" data-name="${escapeHtml(route.name.toLowerCase())}" onclick="confirmRideMatchFromPicker(${activityId}, '${route.id}')">
            <div class="picker-row-name">${escapeHtml(route.name)}</div>
            <div class="picker-row-meta">
                ${getSportLabel(route.sport)} · ${route.distance} km · ${route.elevationUp} hm
                ${score > 0 ? `<span class="picker-score">Match ${score}</span>` : ''}
            </div>
        </div>`;
}

function filterPickerList(q) {
    const query = q.toLowerCase();
    const rows = document.querySelectorAll('#picker-all-list .picker-row');
    rows.forEach(row => {
        const name = row.dataset.name || '';
        row.style.display = name.includes(query) ? '' : 'none';
    });
}

function confirmRideMatchFromPicker(activityId, routeId) {
    confirmRideMatch(activityId, routeId);
    // confirmRideMatch already opens the route detail view
}

function closeRidePicker() {
    document.getElementById('route-detail-view').classList.remove('active');
    pendingPickerActivityId = null;
    renderRouten();
}

// ---- Komoot Sync Handler ----
async function handleKomootSync() {
    const btn = document.querySelector('.btn-sync-komoot');
    if (btn) {
        btn.classList.add('syncing');
        btn.textContent = 'Sync läuft...';
    }

    try {
        const routes = await syncKomootRoutes((current, total, msg) => {
            if (btn) btn.textContent = `${current}/${total}...`;
        });
        if (btn) btn.textContent = `${routes.length} Routen geladen`;
        setTimeout(() => {
            renderRouten();
        }, 1000);
    } catch (e) {
        alert('Sync fehlgeschlagen: ' + e.message);
        if (btn) {
            btn.classList.remove('syncing');
            btn.textContent = 'Komoot Sync';
        }
    }
}
