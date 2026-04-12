// ============================================
// KOMOOT.JS – Komoot API Integration
// ============================================

const KOMOOT_LOGIN_URL = 'https://api.komoot.de/v006/account/email/';
const KOMOOT_TOURS_URL = 'https://api.komoot.de/v007/users/';
const KOMOOT_TOUR_DETAIL_URL = 'https://api.komoot.de/v007/tours/';

// ---- Komoot Config ----
function loadKomootConfig() {
    try {
        const c = localStorage.getItem('komoot-config');
        return c ? JSON.parse(c) : null;
    } catch (e) {
        return null;
    }
}

function saveKomootConfig(config) {
    localStorage.setItem('komoot-config', JSON.stringify(config));
}

function isKomootConnected() {
    const config = loadKomootConfig();
    return config && config.userId && config.email;
}

function disconnectKomoot() {
    localStorage.removeItem('komoot-config');
    localStorage.removeItem('komoot-routes');
    if (typeof renderMehr === 'function') renderMehr();
}

// ---- Komoot Login ----
async function connectKomoot(email, password) {
    try {
        const resp = await fetch(KOMOOT_LOGIN_URL + encodeURIComponent(email) + '/', {
            headers: {
                'Authorization': 'Basic ' + btoa(email + ':' + password),
                'Accept': 'application/hal+json'
            }
        });

        if (!resp.ok) throw new Error('Login fehlgeschlagen. Prüfe E-Mail und Passwort.');

        const data = await resp.json();
        const config = {
            email: email,
            password: password,
            userId: data.username,
            displayName: data.user?.displayname || 'Komoot User'
        };
        saveKomootConfig(config);
        return config;
    } catch (e) {
        throw new Error('Komoot-Login fehlgeschlagen: ' + e.message);
    }
}

// ---- Fetch Tours ----
async function fetchKomootTours() {
    const config = loadKomootConfig();
    if (!config) throw new Error('Nicht mit Komoot verbunden');

    const allTours = [];
    let page = 0;

    while (true) {
        const resp = await fetch(
            KOMOOT_TOURS_URL + config.userId + '/tours/?page=' + page + '&limit=100',
            {
                headers: {
                    'Authorization': 'Basic ' + btoa(config.email + ':' + config.password),
                    'Accept': 'application/hal+json'
                }
            }
        );

        if (!resp.ok) throw new Error('Touren konnten nicht geladen werden');

        const data = await resp.json();
        const tours = data._embedded?.tours || [];
        allTours.push(...tours);

        if (tours.length < 100) break;
        page++;
    }

    return allTours;
}

// ---- Fetch Tour Detail (surfaces, difficulty) ----
async function fetchKomootTourDetail(tourId) {
    const config = loadKomootConfig();
    if (!config) return null;

    try {
        const resp = await fetch(KOMOOT_TOUR_DETAIL_URL + tourId, {
            headers: {
                'Authorization': 'Basic ' + btoa(config.email + ':' + config.password),
                'Accept': 'application/hal+json'
            }
        });

        if (!resp.ok) return null;
        return await resp.json();
    } catch (e) {
        console.error('Tour detail error:', e);
        return null;
    }
}

// ---- Sync Komoot Routes ----
async function syncKomootRoutes(progressCallback) {
    const allTours = await fetchKomootTours();
    const planned = allTours.filter(t => t.type === 'tour_planned');
    const recorded = allTours.filter(t => t.type === 'tour_recorded');

    if (progressCallback) progressCallback(0, planned.length, 'Lade Routendetails...');

    const routes = [];
    for (let i = 0; i < planned.length; i++) {
        const tour = planned[i];
        const detail = await fetchKomootTourDetail(tour.id);

        const route = {
            id: String(tour.id),
            name: tour.name || 'Unbenannte Route',
            sport: tour.sport || 'unknown',
            distance: Math.round((tour.distance || 0) / 1000 * 10) / 10,
            elevationUp: Math.round(tour.elevation_up || 0),
            elevationDown: Math.round(tour.elevation_down || 0),
            duration: tour.duration || 0,
            startPoint: tour.start_point || {},
            date: tour.date || '',
            link: 'https://www.komoot.com/de-de/tour/' + tour.id,
            surfaces: detail?.summary?.surfaces || [],
            wayTypes: detail?.summary?.way_types || [],
            difficulty: detail?.difficulty || {},
            constitution: detail?.constitution || 0
        };

        routes.push(route);
        if (progressCallback && (i + 1) % 5 === 0) {
            progressCallback(i + 1, planned.length, 'Lade Routendetails...');
        }

        // Small delay to avoid rate limiting
        if (i < planned.length - 1) {
            await new Promise(r => setTimeout(r, 150));
        }
    }

    // Count how often each planned route was ridden (match by name similarity)
    routes.forEach(route => {
        const matchingRecorded = recorded.filter(r => {
            if (r.name === route.name) return true;
            const dist = Math.abs((r.distance || 0) / 1000 - route.distance);
            return dist < 3 && r.sport === route.sport;
        });
        route.recordedCount = matchingRecorded.length;
        route.lastRidden = matchingRecorded.length > 0
            ? matchingRecorded.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
            : null;
    });

    // Merge with existing user data (ratings, notes, ride log)
    const existingRoutes = loadRoutes();
    routes.forEach(route => {
        const existing = existingRoutes.find(r => r.id === route.id);
        if (existing) {
            route.rating = existing.rating || 0;
            route.difficultyRating = existing.difficultyRating || 0;
            route.wetSuitable = existing.wetSuitable || false;
            route.pendelTauglich = existing.pendelTauglich || false;
            route.notes = existing.notes || '';
            route.region = existing.region || '';
            route.rideLog = existing.rideLog || [];
        } else {
            // Check if we have Excel import data for this route
            const excelData = EXCEL_IMPORT_DATA[route.id];
            route.rating = excelData?.rating || 0;
            route.difficultyRating = excelData?.difficultyRating || 0;
            route.wetSuitable = false;
            route.pendelTauglich = false;
            route.notes = excelData?.notes || '';
            route.region = excelData?.region || guessRegion(route);
            route.rideLog = [];
        }
    });

    saveRoutes(routes);
    return routes;
}

// ---- Excel Import Data (pre-existing ratings from Fahrradrouten.xlsx) ----
const EXCEL_IMPORT_DATA = {
    '1934455265': { rating: 3, difficultyRating: 2, region: 'Fehmarn', notes: 'Inselumrundung' },
    '1848200350': { rating: 5, difficultyRating: 2, region: 'Umgebung', notes: 'Gravel + Wald' },
    '2102664944': { rating: 4, difficultyRating: 5, region: 'Harz', notes: '1300hm' },
    '1870251006': { rating: 5, difficultyRating: 3, region: 'Umgebung', notes: 'Gravel + Wald' },
    '1802896594': { rating: 3, difficultyRating: 1, region: 'Umgebung', notes: 'Nebenstrassen (Feierabendrunde)' },
    '1875189746': { rating: 4, difficultyRating: 2, region: 'Umgebung', notes: 'Gravel + Nebenstrassen' },
    '2000376740': { rating: 4, difficultyRating: 4, region: 'Umgebung', notes: 'Gravel + teilweise MB Trails' },
    '2239847446': { rating: 3, difficultyRating: 3, region: 'Umgebung', notes: 'Gravel + Wald' },
    '2425926356': { rating: 4, difficultyRating: 2, region: 'Umgebung', notes: 'Viel Nebenstrasse, wenig Gravel' },
    '2431870920': { rating: 4, difficultyRating: 2, region: 'Umgebung', notes: 'Nebenstrassen, etwas Gravel' }
};

// ---- Region Guessing ----
function guessRegion(route) {
    const lat = route.startPoint?.lat || 0;
    const lng = route.startPoint?.lng || 0;

    // Bremen area
    if (lat > 52.8 && lat < 53.4 && lng > 8.4 && lng < 9.3) return 'Umgebung';
    // Harz
    if (lat > 51.5 && lat < 52.0 && lng > 10.0 && lng < 11.5) return 'Harz';
    // Fehmarn
    if (lat > 54.3 && lat < 54.6 && lng > 10.9 && lng < 11.4) return 'Fehmarn';
    // Müritz
    if (lat > 53.2 && lat < 53.6 && lng > 12.4 && lng < 13.0) return 'Müritz';
    // Nordsee/Küste
    if (lat > 53.4 && lng < 8.5) return 'Nordsee';

    return 'Sonstige';
}

// ---- Route Data Storage ----
function loadRoutes() {
    try {
        const r = localStorage.getItem('komoot-routes');
        return r ? JSON.parse(r) : [];
    } catch (e) {
        return [];
    }
}

function saveRoutes(routes) {
    localStorage.setItem('komoot-routes', JSON.stringify(routes));
}

function updateRoute(routeId, updates) {
    const routes = loadRoutes();
    const idx = routes.findIndex(r => r.id === routeId);
    if (idx >= 0) {
        Object.assign(routes[idx], updates);
        saveRoutes(routes);
    }
    return routes;
}

function addRideLogEntry(routeId, entry) {
    const routes = loadRoutes();
    const route = routes.find(r => r.id === routeId);
    if (route) {
        if (!route.rideLog) route.rideLog = [];
        entry.id = Date.now().toString();
        route.rideLog.push(entry);
        route.rideLog.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveRoutes(routes);
    }
    return routes;
}

function deleteRideLogEntry(routeId, entryId) {
    const routes = loadRoutes();
    const route = routes.find(r => r.id === routeId);
    if (route && route.rideLog) {
        route.rideLog = route.rideLog.filter(e => e.id !== entryId);
        saveRoutes(routes);
    }
    return routes;
}

// ---- Surface Helpers ----
function getSurfaceLabel(type) {
    const labels = {
        'sb#asphalt': 'Asphalt',
        'sb#compacted': 'Verdichtet',
        'sb#unpaved': 'Unbefestigt',
        'sb#cobbles': 'Kopfstein',
        'sb#paved': 'Befestigt',
        'sf#unknown': 'Unbekannt',
        'sb#gravel': 'Gravel',
        'sb#sand': 'Sand',
        'sb#ground': 'Erde'
    };
    return labels[type] || type.replace(/^s[bf]#/, '');
}

function getSurfaceClass(type) {
    if (type.includes('asphalt')) return 'surface-asphalt';
    if (type.includes('compacted')) return 'surface-compacted';
    if (type.includes('unpaved') || type.includes('gravel') || type.includes('ground')) return 'surface-unpaved';
    if (type.includes('cobbles')) return 'surface-cobbles';
    if (type.includes('paved')) return 'surface-paved';
    return 'surface-unknown';
}

function getSurfaceColor(type) {
    if (type.includes('asphalt')) return '#3B82F6';
    if (type.includes('compacted')) return '#EAB308';
    if (type.includes('unpaved') || type.includes('gravel') || type.includes('ground')) return '#F97316';
    if (type.includes('cobbles')) return '#EF4444';
    if (type.includes('paved')) return '#22C55E';
    return '#64748B';
}

function getWayTypeLabel(type) {
    const labels = {
        'wt#cycleway': 'Radweg',
        'wt#street': 'Strasse',
        'wt#minor_road': 'Nebenstrasse',
        'wt#trail': 'Trail',
        'wt#way': 'Weg',
        'wt#path': 'Pfad',
        'wt#state_road': 'Landstrasse'
    };
    return labels[type] || type.replace(/^wt#/, '');
}

function getSportLabel(sport) {
    const labels = {
        'racebike': 'Rennrad',
        'touringbicycle': 'Trekking',
        'mtb_easy': 'Gravel/MTB',
        'mtb': 'MTB'
    };
    return labels[sport] || sport;
}

function getDifficultyLabel(grade) {
    const labels = {
        'easy': 'Leicht',
        'moderate': 'Mittel',
        'difficult': 'Schwer',
        'expert': 'Experte'
    };
    return labels[grade] || grade || '-';
}

function formatDurationRoute(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
