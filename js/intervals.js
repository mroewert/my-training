// ============================================
// INTERVALS.JS – intervals.icu API Integration
// ============================================

const INTERVALS_BASE_URL = 'https://intervals.icu/api/v1';
// API-Key + Athlete-ID kommen ausschliesslich vom User via Settings-UI (Mehr-Tab).
// Keine Default-Credentials mehr im Code.

let intervalsConfig = null;
let intervalsActivities = []; // cached activities (limited data for Strava-sourced)
let intervalsEvents = [];     // cached events (planned workouts from intervals.icu)
let intervalsSyncing = false;

// ---- Connection Management ----

function loadIntervalsConfig() {
    try {
        const stored = localStorage.getItem('intervals-config');
        if (stored) {
            intervalsConfig = JSON.parse(stored);
        }
        // Kein Auto-Connect mehr: User muss API-Key + Athlete-ID einmalig im Mehr-Tab eingeben.
    } catch (e) {
        console.error('Error loading intervals.icu config:', e);
    }
}

function saveIntervalsConfig(config) {
    intervalsConfig = config;
    localStorage.setItem('intervals-config', JSON.stringify(config));
}

function isIntervalsConnected() {
    return intervalsConfig && intervalsConfig.apiKey && intervalsConfig.athleteId;
}

function getIntervalsAuth() {
    return `Basic ${btoa('API_KEY:' + intervalsConfig.apiKey)}`;
}

function connectIntervals() {
    const apiKey = document.getElementById('intervals-apikey').value.trim();
    const athleteId = document.getElementById('intervals-athlete-id').value.trim();

    if (!apiKey || !athleteId) {
        alert('Bitte API-Key und Athlete-ID eingeben.');
        return;
    }

    testIntervalsConnection(apiKey, athleteId).then(success => {
        if (success) {
            saveIntervalsConfig({ apiKey, athleteId });
            alert('intervals.icu erfolgreich verbunden!');
            renderMehr();
        } else {
            alert('Verbindung fehlgeschlagen. Bitte API-Key und Athlete-ID pruefen.');
        }
    });
}

function disconnectIntervals() {
    if (confirm('intervals.icu-Verbindung trennen?')) {
        localStorage.removeItem('intervals-config');
        localStorage.removeItem('intervals-events');
        intervalsConfig = null;
        intervalsEvents = [];
        renderMehr();
    }
}

async function testIntervalsConnection(apiKey, athleteId) {
    try {
        const response = await fetch(
            `${INTERVALS_BASE_URL}/athlete/${athleteId}/events?newest=${new Date().toISOString().split('T')[0]}&oldest=${new Date().toISOString().split('T')[0]}`,
            { headers: { 'Authorization': `Basic ${btoa('API_KEY:' + apiKey)}` } }
        );
        return response.ok;
    } catch (e) {
        console.error('intervals.icu connection test failed:', e);
        return false;
    }
}

// ---- Fetch Events (planned workouts from intervals.icu) ----

async function fetchIntervalsEvents(oldest, newest) {
    if (!isIntervalsConnected()) return [];

    try {
        const response = await fetch(
            `${INTERVALS_BASE_URL}/athlete/${intervalsConfig.athleteId}/events?oldest=${oldest}&newest=${newest}`,
            { headers: { 'Authorization': getIntervalsAuth() } }
        );

        if (!response.ok) {
            console.error('intervals.icu events fetch failed:', response.status);
            return [];
        }

        const events = await response.json();
        // Filter to WORKOUT events (Ride + WeightTraining for Milon)
        return events.filter(e => e.category === 'WORKOUT');
    } catch (e) {
        console.error('Error fetching intervals.icu events:', e);
        return [];
    }
}

// ---- Fetch Activities (aufgezeichnete Fahrten aus intervals.icu, Strava-unabhängig) ----
// Seit der Umstellung auf direkten Wahoo→intervals.icu-Sync (Strava-Abo-Pflicht ab 30.06.2026)
// ist intervals.icu die primäre Quelle für Fahrt-Details. Daten sind reicher als bei Strava
// (echte TSS via icu_training_load, NP via icu_weighted_avg_watts, echte Kalorien).

const INTERVALS_CYCLING_TYPES = ['Ride', 'VirtualRide', 'GravelRide', 'MountainBikeRide', 'EBikeRide'];

function isIntervalsCyclingActivity(a) {
    const t = a.type || '';
    return INTERVALS_CYCLING_TYPES.includes(t) || t.includes('Ride');
}

// Mappt eine intervals.icu-Aktivität auf dieselbe Form wie formatStravaActivity (strava.js),
// damit alle Konsumenten (Routen-Match, Auto-Log) unverändert funktionieren.
function formatIntervalsActivity(a) {
    const dateStr = (a.start_date_local || '').split('T')[0];
    const indoor = a.trainer === true;
    const type = indoor ? 'VirtualRide' : (a.type || 'Ride');
    const calories = a.calories != null ? a.calories
                   : (a.icu_joules ? Math.round(a.icu_joules / 1000) : 0);
    return {
        id: a.id,                                   // z.B. "i154551007" (String!)
        name: a.name || 'Fahrt',
        date: dateStr,
        dateFormatted: typeof formatDate === 'function' ? formatDate(dateStr) : dateStr,
        duration: Math.round((a.moving_time || a.elapsed_time || 0) / 60),
        distance: ((a.distance || 0) / 1000).toFixed(1),
        elevation: Math.round(a.total_elevation_gain || 0),
        startLat: null,                             // lazy via Streams (fetchIntervalsStartLatLng)
        startLng: null,
        avgPower: Math.round(a.icu_average_watts || 0),
        normalizedPower: Math.round(a.icu_weighted_avg_watts || 0),
        avgHr: Math.round(a.average_heartrate || 0),
        maxHr: Math.round(a.max_heartrate || 0),
        calories: calories,
        tss: Math.round(a.icu_training_load || 0),  // echte TSS
        type: type,
        sportType: type,
        trainer: indoor
    };
}

async function fetchIntervalsActivities(daysBack = 30) {
    if (!isIntervalsConnected()) return [];
    const today = new Date();
    const newest = today.toISOString().split('T')[0];
    const oldest = new Date(today.getTime() - daysBack * 86400000).toISOString().split('T')[0];
    try {
        const response = await fetch(
            `${INTERVALS_BASE_URL}/athlete/${intervalsConfig.athleteId}/activities?oldest=${oldest}&newest=${newest}`,
            { headers: { 'Authorization': getIntervalsAuth() } }
        );
        if (!response.ok) {
            console.error('intervals.icu activities fetch failed:', response.status);
            return [];
        }
        const acts = await response.json();
        if (!Array.isArray(acts)) return [];
        // API liefert neueste zuerst
        return acts.filter(isIntervalsCyclingActivity).map(formatIntervalsActivity);
    } catch (e) {
        console.error('Error fetching intervals.icu activities:', e);
        return [];
    }
}

// GPS-Startpunkt einer Aktivität via Streams-Endpoint (für Komoot-Match).
// intervals.icu legt im latlng-Stream Breite in `data`, Länge in `data2` ab.
async function fetchIntervalsStartLatLng(activityId) {
    if (!isIntervalsConnected()) return null;
    try {
        const response = await fetch(
            `${INTERVALS_BASE_URL}/activity/${activityId}/streams?types=latlng`,
            { headers: { 'Authorization': getIntervalsAuth() } }
        );
        if (!response.ok) return null;
        const streams = await response.json();
        const ll = Array.isArray(streams) ? streams.find(s => s.type === 'latlng') : null;
        if (!ll || !Array.isArray(ll.data) || !Array.isArray(ll.data2)) return null;
        for (let i = 0; i < ll.data.length; i++) {
            if (ll.data[i] != null && ll.data2[i] != null) {
                return [ll.data[i], ll.data2[i]];
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Letzte Fahrten aus intervals.icu inkl. GPS-Startpunkt (für die Routen-Tab-Sektion).
async function fetchRecentRidesFromIntervals(limit = 15) {
    const acts = await fetchIntervalsActivities(30);
    const recent = acts.slice(0, limit);
    // GPS nur für die angezeigten Fahrten nachladen (begrenzte Anzahl Calls)
    await Promise.all(recent.map(async ride => {
        const ll = await fetchIntervalsStartLatLng(ride.id);
        if (ll) { ride.startLat = ll[0]; ride.startLng = ll[1]; }
    }));
    return recent;
}

// ---- Sync Logic: Pull events from intervals.icu and update app calendar ----

async function syncIntervalsToCalendar(silent = false) {
    if (!isIntervalsConnected() || intervalsSyncing) return;

    intervalsSyncing = true;
    updateSyncButton('syncing');

    try {
        // Determine date range: from first workout to end of plan
        const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
        const oldest = sorted.length > 0 ? sorted[0].date : '2026-04-27';
        const newest = '2026-10-11'; // Nach FTP-Test 03.10.2026 (Plan-Ende KW40)

        const events = await fetchIntervalsEvents(oldest, newest);

        if (events.length === 0) {
            updateSyncButton('done');
            if (!silent) alert('Keine Workout-Events auf intervals.icu gefunden.');
            intervalsSyncing = false;
            return;
        }

        // Cache events
        intervalsEvents = events;
        localStorage.setItem('intervals-events', JSON.stringify(events));

        // Match intervals.icu events to local workouts by name
        let updated = 0;
        let added = 0;
        const syncedIds = new Set(); // lokale Workouts, die zum aktuellen intervals.icu-Plan gehoeren

        events.forEach(event => {
            const eventDate = event.start_date_local ? event.start_date_local.split('T')[0] : null;
            if (!eventDate) return;

            const eventName = event.name || '';
            const eventDuration = event.moving_time ? Math.round(event.moving_time / 60) : 0;

            // Find matching local workout by name (exact or close match)
            let match = workouts.find(w => w.title === eventName);

            // If no exact match, try fuzzy: same name prefix
            if (!match) {
                match = workouts.find(w =>
                    w.title.toLowerCase().startsWith(eventName.toLowerCase().substring(0, 15)) ||
                    eventName.toLowerCase().startsWith(w.title.toLowerCase().substring(0, 15))
                );
            }

            if (match) {
                // Update date if different (workout was moved on intervals.icu)
                if (match.date !== eventDate) {
                    match.date = eventDate;
                    updated++;
                }
                // Store intervals.icu event ID for reference
                match.intervalsEventId = event.id;
                syncedIds.add(match.id);

                // Update duration if intervals.icu has it
                if (eventDuration > 0) {
                    const localMin = parseDuration(match.duration);
                    // Only update if significantly different (>10%)
                    if (Math.abs(eventDuration - localMin) / localMin > 0.1) {
                        match.duration = eventDuration >= 60
                            ? (eventDuration / 60).toFixed(1).replace('.0', '') + 'h'
                            : eventDuration + 'm';
                        updated++;
                    }
                }

                // Update description from intervals.icu if local is empty
                if (!match.desc && event.description) {
                    match.desc = event.description.split('\n')[0]; // First line only
                }

                // Import intervals.icu training load as estimated TSS
                if (event.icu_training_load && !activityLogs[match.id]) {
                    match.estimatedTSS = Math.round(event.icu_training_load);
                }
            } else {
                // No local match: create new workout from intervals.icu event
                const durationStr = eventDuration >= 60
                    ? (eventDuration / 60).toFixed(1).replace('.0', '') + 'h'
                    : eventDuration + 'm';

                const newWorkout = {
                    id: eventDate + '_' + eventName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20),
                    date: eventDate,
                    title: eventName,
                    duration: durationStr,
                    desc: event.description ? event.description.split('\n')[0] : '',
                    intervals: event.description || '',
                    nutrition: '',
                    technique: '',
                    video_url: '',
                    coach_notes: '',
                    intervalsEventId: event.id
                };

                // Avoid duplicates
                if (!workouts.find(w => w.id === newWorkout.id)) {
                    workouts.push(newWorkout);
                    added++;
                }
                syncedIds.add(newWorkout.id);
            }
        });

        // Orphan-Pruning: intervals.icu ist Single Source of Truth fuer geplante Trainings.
        // Entferne zukuenftige Workouts, die kein Gegenstueck mehr auf intervals.icu haben.
        // Geschuetzt: Vergangenheit (History) + alles Geloggte/Erledigte (Trainingsdaten).
        // Sicher, weil bei events.length === 0 oben bereits returned wurde (kein Wipe bei Sync-Fehler).
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        let pruned = 0;
        workouts = workouts.filter(w => {
            const isOrphan = w.date >= todayStr
                && !syncedIds.has(w.id)
                && !completed[w.id]
                && !activityLogs[w.id];
            if (isOrphan) { pruned++; return false; }
            return true;
        });

        // Auto-log abgeschlossene Aktivitäten (aus intervals.icu) zu passenden Workouts nach Datum.
        // Quelle ist jetzt intervals.icu (Wahoo-Daten, Strava-unabhängig) statt der Strava-API.
        let autoLogged = 0;
        {
            const cycling = await fetchIntervalsActivities(60);

            cycling.forEach(activity => {
                // Find unlogged workouts on the same day
                const dayWorkouts = workouts.filter(w =>
                    w.date === activity.date && !activityLogs[w.id]
                );
                if (dayWorkouts.length === 0) return;

                // Pick best match: closest duration
                let bestMatch = dayWorkouts[0];
                if (dayWorkouts.length > 1) {
                    let bestDiff = Infinity;
                    dayWorkouts.forEach(w => {
                        const diff = Math.abs(parseDuration(w.duration) - activity.duration);
                        if (diff < bestDiff) { bestDiff = diff; bestMatch = w; }
                    });
                }

                // Don't overwrite existing logs
                if (activityLogs[bestMatch.id]) return;

                activityLogs[bestMatch.id] = {
                    duration: activity.duration,
                    avgPower: activity.avgPower,
                    normalizedPower: activity.normalizedPower,
                    distance: parseFloat(activity.distance) || 0,
                    avgHr: activity.avgHr,
                    maxHr: activity.maxHr,
                    calories: activity.calories,
                    tss: activity.tss,
                    feeling: 0,
                    notes: '',
                    stravaActivity: { id: activity.id, name: activity.name },
                    loggedAt: new Date().toISOString()
                };
                completed[bestMatch.id] = true;
                autoLogged++;
            });
        }

        saveData();
        renderCurrentTrainingView();
        updateSyncButton('done');

        if (typeof saveSyncTimestamp === 'function') saveSyncTimestamp('intervals');

        if (!silent) {
            let msg = 'Sync abgeschlossen!';
            if (updated > 0) msg += ` ${updated} Workouts aktualisiert.`;
            if (added > 0) msg += ` ${added} neue Workouts importiert.`;
            if (pruned > 0) msg += ` ${pruned} veraltete Workouts entfernt.`;
            if (autoLogged > 0) msg += ` ${autoLogged} Aktivitaet${autoLogged !== 1 ? 'en' : ''} automatisch geloggt.`;
            if (updated === 0 && added === 0 && pruned === 0 && autoLogged === 0) msg += ' Kalender ist bereits aktuell.';
            alert(msg);
        }

    } catch (e) {
        console.error('Sync error:', e);
        updateSyncButton('error');
        if (!silent) alert('Sync fehlgeschlagen: ' + e.message);
        intervalsSyncing = false;
        throw e;
    }

    intervalsSyncing = false;
}

// ---- UI Helpers ----

function updateSyncButton(state) {
    const btn = document.getElementById('btn-intervals-sync');
    if (!btn) return;

    if (state === 'syncing') {
        btn.textContent = 'Sync...';
        btn.disabled = true;
        btn.classList.add('syncing');
    } else if (state === 'done') {
        btn.textContent = 'Sync';
        btn.disabled = false;
        btn.classList.remove('syncing');
    } else if (state === 'error') {
        btn.textContent = 'Fehler';
        btn.disabled = false;
        btn.classList.remove('syncing');
        setTimeout(() => {
            if (btn) btn.textContent = 'Sync';
        }, 3000);
    }
}

// ---- Upload Training Plan to intervals.icu ----

async function uploadPlanToIntervals() {
    if (!isIntervalsConnected()) {
        alert('Bitte zuerst intervals.icu verbinden.');
        return;
    }

    if (workouts.length === 0) {
        alert('Kein Trainingsplan geladen.');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const futureWorkouts = workouts.filter(w => w.date >= today);

    if (futureWorkouts.length === 0) {
        alert('Keine zukuenftigen Workouts zum Hochladen.');
        return;
    }

    if (!confirm(`${futureWorkouts.length} Workouts auf intervals.icu hochladen?`)) return;

    const btn = document.getElementById('btn-intervals-upload');
    if (btn) { btn.textContent = 'Lade hoch...'; btn.disabled = true; }

    try {
        const events = futureWorkouts.map(w => {
            const day = new Date(w.date).getDay();
            const time = (day === 0 || day === 6) ? '09:00:00' : '18:00:00';
            return {
                category: 'WORKOUT',
                start_date_local: `${w.date}T${time}`,
                type: 'Ride',
                name: w.title,
                description: w.desc || '',
                moving_time: parseDuration(w.duration) * 60
            };
        });

        const response = await fetch(
            `${INTERVALS_BASE_URL}/athlete/${intervalsConfig.athleteId}/events/bulk`,
            {
                method: 'POST',
                headers: {
                    'Authorization': getIntervalsAuth(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(events)
            }
        );

        if (response.ok) {
            alert(`${events.length} Workouts erfolgreich auf intervals.icu hochgeladen!`);
        } else {
            const text = await response.text();
            alert(`Upload fehlgeschlagen (${response.status}): ${text}`);
        }
    } catch (e) {
        console.error('Upload error:', e);
        alert('Upload fehlgeschlagen: ' + e.message);
    }

    if (btn) { btn.textContent = 'Plan hochladen'; btn.disabled = false; }
}

// Load cached events on startup
function loadCachedIntervalsActivities() {
    try {
        const stored = localStorage.getItem('intervals-events');
        if (stored) intervalsEvents = JSON.parse(stored);
    } catch (e) {
        console.error('Error loading cached intervals events:', e);
    }
}
