// ============================================
// STRAVA.JS – Strava OAuth & Activity Loading
// ============================================

const STRAVA_CLIENT_ID = '193172';
const STRAVA_CLIENT_SECRET = '10ab0ddd492c66638cea82a80777e95db020c401';
const STRAVA_REDIRECT_URI = window.location.origin + window.location.pathname;

let stravaTokens = null;
let stravaActivities = [];

function loadStravaTokens() {
    try {
        const stored = localStorage.getItem('strava-tokens');
        if (stored) {
            stravaTokens = JSON.parse(stored);
            if (stravaTokens.expires_at && stravaTokens.expires_at < Date.now() / 1000) {
                refreshStravaToken();
            }
        }
    } catch (e) {
        console.error('Error loading Strava tokens:', e);
    }
}

function saveStravaTokens(tokens) {
    stravaTokens = tokens;
    localStorage.setItem('strava-tokens', JSON.stringify(tokens));
}

function isStravaConnected() {
    return stravaTokens && stravaTokens.access_token;
}

function connectStrava() {
    const scope = 'read,activity:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&response_type=code&scope=${scope}`;
    window.location.href = authUrl;
}

function disconnectStrava() {
    if (confirm('Strava-Verbindung trennen?')) {
        localStorage.removeItem('strava-tokens');
        stravaTokens = null;
        updateStravaUI();
    }
}

async function handleStravaCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
        alert('Strava-Autorisierung fehlgeschlagen: ' + error);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (code) {
        try {
            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: STRAVA_CLIENT_ID,
                    client_secret: STRAVA_CLIENT_SECRET,
                    code: code,
                    grant_type: 'authorization_code'
                })
            });
            if (!response.ok) throw new Error('Token exchange failed');
            const tokens = await response.json();
            saveStravaTokens(tokens);
            updateStravaUI();
            alert('Strava erfolgreich verbunden!');
        } catch (e) {
            alert('Fehler bei Strava-Verbindung: ' + e.message);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

async function refreshStravaToken() {
    if (!stravaTokens?.refresh_token) return false;
    try {
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                refresh_token: stravaTokens.refresh_token,
                grant_type: 'refresh_token'
            })
        });
        if (!response.ok) throw new Error('Token refresh failed');
        const tokens = await response.json();
        saveStravaTokens(tokens);
        return true;
    } catch (e) {
        console.error('Error refreshing token:', e);
        return false;
    }
}

function updateStravaUI() {
    const btn = document.getElementById('strava-btn');
    const status = document.getElementById('strava-status');
    if (!btn) return;

    if (isStravaConnected()) {
        btn.innerHTML = '\uD83D\uDD13 Strava trennen';
        btn.onclick = disconnectStrava;
        btn.classList.add('connected');
        if (status) {
            status.textContent = `Verbunden als ${stravaTokens.athlete?.firstname || 'Athlet'}`;
            status.style.display = 'block';
        }
    } else {
        btn.innerHTML = '\uD83D\uDD17 Mit Strava verbinden';
        btn.onclick = connectStrava;
        btn.classList.remove('connected');
        if (status) status.style.display = 'none';
    }
}

async function fetchStravaActivities() {
    if (!isStravaConnected()) return [];
    if (stravaTokens.expires_at && stravaTokens.expires_at < Date.now() / 1000) {
        const refreshed = await refreshStravaToken();
        if (!refreshed) return [];
    }
    try {
        const response = await fetch(
            'https://www.strava.com/api/v3/athlete/activities?per_page=30',
            { headers: { 'Authorization': `Bearer ${stravaTokens.access_token}` } }
        );
        if (!response.ok) {
            if (response.status === 401) {
                await refreshStravaToken();
                return fetchStravaActivities();
            }
            throw new Error('Failed to fetch activities');
        }
        const activities = await response.json();
        return activities.map(formatStravaActivity);
    } catch (e) {
        console.error('Error fetching Strava activities:', e);
        return [];
    }
}

function formatStravaActivity(activity) {
    const date = new Date(activity.start_date_local);
    const duration = Math.round(activity.moving_time / 60);
    const distance = (activity.distance / 1000).toFixed(1);
    return {
        id: activity.id,
        name: activity.name,
        date: date.toISOString().split('T')[0],
        dateFormatted: formatDate(date.toISOString().split('T')[0]),
        duration,
        distance,
        avgPower: activity.average_watts || 0,
        normalizedPower: activity.weighted_average_watts || 0,
        avgHr: activity.average_heartrate || 0,
        maxHr: activity.max_heartrate || 0,
        calories: activity.calories || 0,
        tss: activity.suffer_score || 0,
        type: activity.type
    };
}

async function loadStravaActivitiesForLog() {
    const btn = document.getElementById('btn-load-strava');
    const list = document.getElementById('strava-activities-list');
    btn.textContent = '\u23F3 Laden...';
    const activities = await fetchStravaActivities();
    btn.textContent = '\uD83D\uDD04 Strava-Aktivit\u00E4ten laden';

    if (activities.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:12px;">Keine Aktivit\u00E4ten gefunden</div>';
        return;
    }

    const cycling = activities.filter(a =>
        a.type === 'Ride' || a.type === 'VirtualRide' || a.type === 'GravelRide' || a.type === 'MountainBikeRide'
    );

    list.innerHTML = cycling.map(a => `
        <div class="strava-activity-item" onclick="selectStravaActivity(${a.id}, '${a.name.replace(/'/g, "\\'")}', ${a.duration}, ${a.avgPower}, ${a.normalizedPower}, ${a.distance}, ${a.avgHr}, ${a.maxHr}, ${a.calories}, ${a.tss})">
            <div class="strava-activity-name">${a.name}</div>
            <div class="strava-activity-meta">
                <span>\uD83D\uDCC5 ${a.dateFormatted}</span>
                <span>\u23F1\uFE0F ${a.duration}min</span>
                <span>\uD83D\uDCCF ${a.distance}km</span>
                ${a.avgPower ? `<span>\u26A1 ${a.avgPower}W</span>` : ''}
            </div>
        </div>
    `).join('');
}

function selectStravaActivity(id, name, duration, avgPower, np, distance, avgHr, maxHr, calories, tss) {
    document.querySelectorAll('.strava-activity-item').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    document.getElementById('log-duration').value = duration || '';
    document.getElementById('log-power').value = avgPower || '';
    document.getElementById('log-np').value = np || '';
    document.getElementById('log-distance').value = distance || '';
    document.getElementById('log-avghr').value = avgHr || '';
    document.getElementById('log-maxhr').value = maxHr || '';
    document.getElementById('log-calories').value = calories || '';
    document.getElementById('log-tss').value = tss || '';

    stravaActivityForLog = { id, name };
}
