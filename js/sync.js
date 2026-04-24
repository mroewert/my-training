// ============================================
// SYNC.JS – Orchestriert Strava / intervals.icu / Komoot
// ============================================

const SYNC_TIMESTAMPS_KEY = 'sync-timestamps';
const KOMOOT_AUTO_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

let syncAllRunning = false;

function loadSyncTimestamps() {
    try {
        const raw = localStorage.getItem(SYNC_TIMESTAMPS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveSyncTimestamp(source) {
    const ts = loadSyncTimestamps();
    ts[source] = Date.now();
    localStorage.setItem(SYNC_TIMESTAMPS_KEY, JSON.stringify(ts));
}

function getLastSyncMs(source) {
    return loadSyncTimestamps()[source] || 0;
}

function formatRelativeTime(ms) {
    if (!ms) return 'noch nie';
    const diff = Date.now() - ms;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} Min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `vor ${h} Std`;
    const d = Math.floor(h / 24);
    return `vor ${d} Tag${d === 1 ? '' : 'en'}`;
}

// ---- Single-Source Sync Wrappers ----

async function syncStravaOnly() {
    if (typeof isStravaConnected !== 'function' || !isStravaConnected()) {
        return { ok: false, skipped: true, reason: 'nicht verbunden' };
    }
    try {
        const rides = await fetchRecentRides(true);
        saveSyncTimestamp('strava');
        // Refresh recent-rides UI if present
        if (typeof recentRidesCache !== 'undefined') {
            recentRidesCache = rides;
            const section = document.getElementById('recent-rides-section');
            if (section && typeof renderRecentRidesSection === 'function') {
                section.innerHTML = renderRecentRidesSection(loadRoutes());
            }
        }
        return { ok: true, count: rides.length };
    } catch (e) {
        console.error('Strava sync failed:', e);
        return { ok: false, error: e.message };
    }
}

async function syncIntervalsOnly() {
    if (!isIntervalsConnected()) {
        return { ok: false, skipped: true, reason: 'nicht verbunden' };
    }
    try {
        await syncIntervalsToCalendar(true); // silent mode
        saveSyncTimestamp('intervals');
        return { ok: true };
    } catch (e) {
        console.error('intervals.icu sync failed:', e);
        return { ok: false, error: e.message };
    }
}

async function syncKomootOnly(progressCallback) {
    if (!isKomootConnected()) {
        return { ok: false, skipped: true, reason: 'nicht verbunden' };
    }
    try {
        const routes = await syncKomootRoutes(progressCallback);
        saveSyncTimestamp('komoot');
        if (typeof renderRouten === 'function' && currentTab === 'routen') {
            renderRouten();
        }
        return { ok: true, count: routes.length };
    } catch (e) {
        console.error('Komoot sync failed:', e);
        return { ok: false, error: e.message };
    }
}

// ---- Combined Sync ----

async function syncAll(options = {}) {
    if (syncAllRunning) return;
    syncAllRunning = true;

    const {
        includeKomoot = true,
        silent = false,
        progressCallback = null
    } = options;

    const report = (step, info) => {
        if (progressCallback) progressCallback(step, info);
    };

    const results = {};

    report('strava', 'Strava...');
    results.strava = await syncStravaOnly();

    report('intervals', 'intervals.icu...');
    results.intervals = await syncIntervalsOnly();

    if (includeKomoot) {
        report('komoot', 'Komoot...');
        results.komoot = await syncKomootOnly((cur, total) => {
            report('komoot', `Komoot ${cur}/${total}...`);
        });
    } else {
        results.komoot = { ok: false, skipped: true, reason: 'übersprungen (kürzlich synced)' };
    }

    syncAllRunning = false;
    report('done', null);

    if (!silent) {
        const lines = [
            'Strava: ' + describeResult(results.strava),
            'intervals.icu: ' + describeResult(results.intervals),
            'Komoot: ' + describeResult(results.komoot)
        ];
        alert('Sync abgeschlossen\n\n' + lines.join('\n'));
    }

    if (typeof renderMehr === 'function' && currentTab === 'mehr') renderMehr();
    return results;
}

function describeResult(r) {
    if (!r) return '–';
    if (r.skipped) return 'übersprungen (' + r.reason + ')';
    if (r.ok) return r.count != null ? `${r.count} Einträge` : 'OK';
    return 'Fehler: ' + (r.error || 'unbekannt');
}

// ---- Auto-Sync on App Start ----

async function autoSyncOnStart() {
    // Run after initial render — non-blocking
    const lastKomoot = getLastSyncMs('komoot');
    const includeKomoot = (Date.now() - lastKomoot) > KOMOOT_AUTO_SYNC_INTERVAL_MS;

    await syncAll({
        includeKomoot,
        silent: true
    });
}
