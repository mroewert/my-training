// ============================================
// MEHR.JS – Einstellungen & Profil
// ============================================

function renderMehr() {
    const container = document.getElementById('mehr-content');
    if (!container) return;

    const stravaConnected = isStravaConnected();
    const stravaName = stravaConnected && stravaTokens?.athlete?.firstname
        ? stravaTokens.athlete.firstname : '';

    // Count workouts and hours
    const allWorkouts = getWeeks().flat();
    const completedCount = allWorkouts.filter(w => completed[w.id]).length;
    let totalHours = 0;
    allWorkouts.forEach(w => {
        if (completed[w.id]) {
            const log = activityLogs[w.id];
            totalHours += (log?.duration || parseDuration(w.duration)) / 60;
        }
    });

    let html = '<div class="mehr-container">';

    // ---- Profil ----
    html += `
        <div class="settings-section">
            <div class="settings-section-header">
                <span class="section-icon">\uD83D\uDC64</span> Profil
            </div>
            <div class="settings-section-body">
                <div class="profile-grid">
                    <div class="profile-item">
                        <div class="profile-value">${ftp}W</div>
                        <div class="profile-label">FTP</div>
                    </div>
                    <div class="profile-item">
                        <div class="profile-value">${allWorkouts.length}</div>
                        <div class="profile-label">Workouts</div>
                    </div>
                    <div class="profile-item">
                        <div class="profile-value">${completedCount}</div>
                        <div class="profile-label">Erledigt</div>
                    </div>
                    <div class="profile-item">
                        <div class="profile-value">${Math.round(totalHours)}h</div>
                        <div class="profile-label">Trainiert</div>
                    </div>
                </div>
            </div>
        </div>`;

    // ---- FTP ----
    html += `
        <div class="settings-section">
            <div class="settings-section-header">
                <span class="section-icon">\u26A1</span> FTP Einstellung
            </div>
            <div class="settings-section-body">
                <div class="ftp-display">
                    <div>
                        <div class="ftp-current">${ftp}W</div>
                        <div class="ftp-label">Aktuelle FTP</div>
                    </div>
                </div>
                <div class="ftp-edit-row">
                    <input type="number" class="form-input" id="settings-ftp" value="${ftp}" min="50" max="500">
                    <button class="btn-save" onclick="saveFtp()">Speichern</button>
                </div>
            </div>
        </div>`;

    // ---- Strava ----
    html += `
        <div class="settings-section">
            <div class="settings-section-header">
                <span class="section-icon">\uD83D\uDCF6</span> Strava
            </div>
            <div class="settings-section-body">
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">${stravaConnected ? 'Verbunden' : 'Nicht verbunden'}</div>
                        <div class="settings-row-sub">${stravaConnected
                            ? 'Verbunden als ' + stravaName
                            : 'Strava verbinden f\u00FCr automatische Aktivit\u00E4tsdaten'}</div>
                    </div>
                    <div class="settings-row-action">
                        ${stravaConnected
                            ? '<button class="btn-settings strava-connected" onclick="disconnectStrava(); renderMehr();">Trennen</button>'
                            : '<button class="btn-settings" onclick="connectStrava()">Verbinden</button>'}
                    </div>
                </div>
            </div>
        </div>`;

    // ---- intervals.icu ----
    const intervalsConnected = isIntervalsConnected();
    html += `
        <div class="settings-section">
            <div class="settings-section-header">
                <span class="section-icon">📈</span> intervals.icu
            </div>
            <div class="settings-section-body">
                ${intervalsConnected ? `
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Verbunden</div>
                        <div class="settings-row-sub">Athlete-ID: ${intervalsConfig.athleteId}</div>
                    </div>
                    <div class="settings-row-action">
                        <button class="btn-settings strava-connected" onclick="disconnectIntervals()">Trennen</button>
                    </div>
                </div>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Aktivit\u00E4ten synchronisieren</div>
                        <div class="settings-row-sub">Aktivit\u00E4ten abrufen und mit Trainingsplan abgleichen</div>
                    </div>
                    <div class="settings-row-action">
                        <button class="btn-settings" id="btn-intervals-sync-mehr" onclick="syncIntervalsToCalendar()">Sync</button>
                    </div>
                </div>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Plan hochladen</div>
                        <div class="settings-row-sub">Zuk\u00FCnftige Workouts auf intervals.icu Kalender schieben</div>
                    </div>
                    <div class="settings-row-action">
                        <button class="btn-settings" id="btn-intervals-upload" onclick="uploadPlanToIntervals()">Upload</button>
                    </div>
                </div>
                ` : `
                <div class="settings-row" style="flex-direction:column;gap:12px;">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Nicht verbunden</div>
                        <div class="settings-row-sub">API-Key findest du unter intervals.icu → Settings → Developer Settings</div>
                    </div>
                    <div class="form-group" style="width:100%;">
                        <label class="form-label">Athlete-ID</label>
                        <input type="text" class="form-input" id="intervals-athlete-id" placeholder="z.B. i12345">
                    </div>
                    <div class="form-group" style="width:100%;">
                        <label class="form-label">API-Key</label>
                        <input type="password" class="form-input" id="intervals-apikey" placeholder="Dein API-Key">
                    </div>
                    <button class="btn-settings" onclick="connectIntervals()" style="align-self:flex-end;">Verbinden</button>
                </div>
                `}
            </div>
        </div>`;

    // ---- Komoot ----
    const komootConnected = isKomootConnected();
    const komootConfig = loadKomootConfig();
    const komootRoutes = loadRoutes();
    html += `
        <div class="settings-section">
            <div class="settings-section-header">
                <span class="section-icon">🗺️</span> Komoot
            </div>
            <div class="settings-section-body">
                ${komootConnected ? `
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Verbunden</div>
                        <div class="settings-row-sub">${komootConfig.displayName} · ${komootRoutes.length} Routen</div>
                    </div>
                    <div class="settings-row-action">
                        <button class="btn-settings strava-connected" onclick="disconnectKomoot(); renderMehr();">Trennen</button>
                    </div>
                </div>
                ` : `
                <div class="settings-row" style="flex-direction:column;gap:12px;">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Nicht verbunden</div>
                        <div class="settings-row-sub">Komoot-Login für automatischen Routen-Import</div>
                    </div>
                    <div class="form-group" style="width:100%;">
                        <label class="form-label">E-Mail</label>
                        <input type="email" class="form-input" id="komoot-email" placeholder="deine@email.de">
                    </div>
                    <div class="form-group" style="width:100%;">
                        <label class="form-label">Passwort</label>
                        <input type="password" class="form-input" id="komoot-password" placeholder="Komoot Passwort">
                    </div>
                    <button class="btn-settings" onclick="handleKomootConnect()" style="align-self:flex-end;">Verbinden</button>
                </div>
                `}
            </div>
        </div>`;

    // ---- Trainingsplan ----
    html += `
        <div class="settings-section">
            <div class="settings-section-header">
                <span class="section-icon">\uD83D\uDCCB</span> Trainingsplan
            </div>
            <div class="settings-section-body">
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Plan importieren</div>
                        <div class="settings-row-sub">JSON-Trainingsplan laden (ersetzen oder zusammenf\u00FChren)</div>
                    </div>
                    <div class="settings-row-action">
                        <button class="btn-settings" onclick="openImport()">Import</button>
                    </div>
                </div>
            </div>
        </div>`;

    // ---- Daten ----
    html += `
        <div class="settings-section">
            <div class="settings-section-header">
                <span class="section-icon">\uD83D\uDDC4\uFE0F</span> Daten
            </div>
            <div class="settings-section-body">
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Daten exportieren</div>
                        <div class="settings-row-sub">Trainingsplan und Logs als JSON herunterladen</div>
                    </div>
                    <div class="settings-row-action">
                        <button class="btn-settings" onclick="exportData()">Export</button>
                    </div>
                </div>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title" style="color:var(--status-red)">Alle Daten l\u00F6schen</div>
                        <div class="settings-row-sub">Trainingsplan, Logs und Einstellungen zur\u00FCcksetzen</div>
                    </div>
                    <div class="settings-row-action">
                        <button class="btn-settings" style="border-color:var(--status-red);color:var(--status-red);" onclick="resetData()">Reset</button>
                    </div>
                </div>
            </div>
        </div>`;

    // ---- App Info ----
    html += `
        <div class="app-info">
            R\u00D6WERT \u2014 Gravel Coach<br>
            Harzquerfahrt 27.06.2026 \u00B7 155 km \u00B7 1.700 hm
            <div class="app-version">v2.0 \u00B7 PWA \u00B7 Vanilla JS</div>
        </div>`;

    html += '</div>';
    container.innerHTML = html;
}

async function handleKomootConnect() {
    const email = document.getElementById('komoot-email').value;
    const password = document.getElementById('komoot-password').value;
    if (!email || !password) { alert('Bitte E-Mail und Passwort eingeben'); return; }
    try {
        await connectKomoot(email, password);
        renderMehr();
        alert('Komoot verbunden! Gehe zum Tab "Routen" und starte den Sync.');
    } catch (e) {
        alert(e.message);
    }
}

function exportData() {
    const data = {
        ftp: ftp,
        workouts: workouts,
        completed: completed,
        activityLogs: activityLogs,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roewert-gravel-coach-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
}
