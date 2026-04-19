// ============================================
// ROUTEN.JS – Routen Tab UI
// ============================================

let routenSearchQuery = '';
let routenSportFilter = 'all';
let routenRegionFilter = 'all';
let routenSortBy = 'name';
let routenSortDir = 'asc';
let routenSpecialFilter = 'all'; // all, rated, unrated, pendel, wet

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

    html += `</div>`;
    container.innerHTML = html;
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
