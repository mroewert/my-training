// ============================================
// APP.JS – Router, State, Init
// ============================================

// ---- Global State ----
let workouts = [];
let ftp = 185;
let completed = {};
let activityLogs = {};
let importMode = 'replace';
let currentLogWorkoutId = null;
let selectedFeeling = 5;
let stravaActivityForLog = null;

// ---- Initial Demo Data ----
const initialWorkouts = [
    {
        id: '2025-12-30_sweetspot',
        date: '2025-12-30',
        title: 'Sweetspot & Torque Intro',
        duration: '1h',
        desc: 'Wir starten mit Kraftausdauer. Die niedrige Trittfrequenz simuliert die Muskelspannung am Berg.',
        intervals: '- 15m 50% Warmup\n- 2x 10m 88% 60rpm (5m 50% recovery)\n- 10m 50% Cooldown',
        nutrition: '1 Flasche Wasser mit 1.5 Scoops Power Carb (ca. 70g)',
        technique: 'Runder Tritt: Ziehe das Pedal aktiv hoch.',
        video_url: 'https://www.youtube.com/watch?v=pdl92_gIDhw',
        coach_notes: ''
    }
];

// ---- Data Persistence ----
function loadData() {
    try {
        const w = localStorage.getItem('gravel-workouts');
        const f = localStorage.getItem('gravel-ftp');
        const c = localStorage.getItem('gravel-completed');
        const a = localStorage.getItem('gravel-activities');

        workouts = w ? JSON.parse(w) : initialWorkouts;
        ftp = f ? parseInt(f) : 185;
        completed = c ? JSON.parse(c) : {};
        activityLogs = a ? JSON.parse(a) : {};
    } catch (e) {
        console.error('Load error:', e);
        workouts = initialWorkouts;
    }
}

function saveData() {
    try {
        localStorage.setItem('gravel-workouts', JSON.stringify(workouts));
        localStorage.setItem('gravel-ftp', String(ftp));
        localStorage.setItem('gravel-completed', JSON.stringify(completed));
        localStorage.setItem('gravel-activities', JSON.stringify(activityLogs));
    } catch (e) {
        console.error('Save error:', e);
    }
}

// ---- Helpers ----
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return `${days[date.getDay()]} ${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function parseDuration(duration) {
    if (!duration) return 60;
    const match = duration.match(/(\d+\.?\d*)\s*(h|m|min)/i);
    if (!match) return 60;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    return unit === 'h' ? value * 60 : value;
}

function formatDurationHours(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getIntensityClass(title) {
    const t = title.toLowerCase();
    if (t.includes('recovery') || t.includes('social') || t.includes('ausrollen')) return 'recovery';
    if (t.includes('vo2')) return 'vo2max';
    if (t.includes('threshold')) return 'threshold';
    if (t.includes('endurance') || t.includes('gravel')) return 'endurance';
    if (t.includes('ftp test')) return 'test';
    if (t.includes('harzquerfahrt') || t.includes('155km') || t.includes('race')) return 'event';
    return 'sweetspot';
}

function isToday(dateStr) {
    return new Date(dateStr).toDateString() === new Date().toDateString();
}

function getWeeks() {
    if (workouts.length === 0) return [];
    const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weeksMap = new Map();
    sorted.forEach(w => {
        const weekNum = getWeekNumber(new Date(w.date));
        const year = new Date(w.date).getFullYear();
        const key = `${year}-${weekNum}`;
        if (!weeksMap.has(key)) weeksMap.set(key, []);
        weeksMap.get(key).push(w);
    });
    return Array.from(weeksMap.values());
}

function getPlanPhases() {
    return [
        { id: 'test1', name: 'FTP-Test', icon: '\u26A1', css: 'test', kwRange: 'KW 9', focus: 'Baseline ermitteln' },
        { id: 'base', name: 'Base Rebuild', icon: '\uD83C\uDFD7\uFE0F', css: 'endurance', kwRange: 'KW 10\u201313', focus: 'Aerobe Basis, Sweet Spot' },
        { id: 'build', name: 'Build + Climbing', icon: '\u26F0\uFE0F', css: 'sweetspot', kwRange: 'KW 14\u201317', focus: 'Threshold, Climbing-Kraft' },
        { id: 'peak', name: 'Peak', icon: '\uD83D\uDD25', css: 'threshold', kwRange: 'KW 18\u201321', focus: 'Event-spezifisch, lange Ausfahrten' },
        { id: 'recovery', name: 'Recovery + Taper', icon: '\uD83E\uDDD8', css: 'recovery', kwRange: 'KW 22\u201325', focus: 'Regeneration, Formerhalt' },
        { id: 'event', name: 'Harzquerfahrt', icon: '\uD83C\uDFC1', css: 'event', kwRange: 'KW 26', focus: '155 km / 1.700 hm' },
    ];
}

function getPhaseForWeekNum(kw) {
    if (kw <= 9) return 'test1';
    if (kw <= 13) return 'base';
    if (kw <= 17) return 'build';
    if (kw <= 21) return 'peak';
    if (kw <= 25) return 'recovery';
    return 'event';
}

function estimateTSS(durationMin, title) {
    const t = title.toLowerCase();
    let intensityFactor = 0.65;
    if (t.includes('recovery') || t.includes('ausrollen') || t.includes('taper')) intensityFactor = 0.50;
    else if (t.includes('endurance')) intensityFactor = 0.65;
    else if (t.includes('sweetspot') || t.includes('climbing')) intensityFactor = 0.82;
    else if (t.includes('threshold')) intensityFactor = 0.92;
    else if (t.includes('vo2')) intensityFactor = 1.05;
    else if (t.includes('ftp test')) intensityFactor = 0.95;
    else if (t.includes('harzquerfahrt') || t.includes('155km')) intensityFactor = 0.72;
    return Math.round(durationMin * intensityFactor * intensityFactor * 100 / 60);
}

// ---- Router ----
let currentTab = 'training';

function switchTab(tabName) {
    currentTab = tabName;

    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });

    // Initialize tab content on switch
    if (tabName === 'training') {
        renderCurrentTrainingView();
    } else if (tabName === 'analyse') {
        renderAnalyse();
    } else if (tabName === 'ernaehrung') {
        renderErnaehrung();
    } else if (tabName === 'routen') {
        renderRouten();
    } else if (tabName === 'mehr') {
        renderMehr();
    }
}

// ---- Modals ----
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ---- Import ----
function openImport() { openModal('modal-import'); }
function closeImport() { closeModal('modal-import'); }

function setImportMode(mode) {
    importMode = mode;
    document.getElementById('mode-replace').classList.toggle('active', mode === 'replace');
    document.getElementById('mode-merge').classList.toggle('active', mode === 'merge');
}

function handleImport() {
    const text = document.getElementById('import-text').value;
    try {
        const data = JSON.parse(text);
        let imported;
        if (data.ftp) ftp = data.ftp;
        imported = data.workouts || data;

        if (importMode === 'replace') {
            workouts = imported;
        } else {
            const existingMap = new Map(workouts.map(w => [w.id, w]));
            imported.forEach(w => existingMap.set(w.id, w));
            workouts = Array.from(existingMap.values());
        }

        saveData();
        renderCurrentTrainingView();
        closeImport();
        document.getElementById('import-text').value = '';
        alert(`${imported.length} Workouts importiert`);
    } catch (e) {
        alert('JSON-Fehler: ' + e.message);
    }
}

// ---- Settings ----
function saveFtp() {
    const newFtp = parseInt(document.getElementById('settings-ftp').value) || 185;
    ftp = newFtp;
    saveData();
    renderMehr();
}

function resetData() {
    if (confirm('Wirklich alle Daten löschen?')) {
        localStorage.clear();
        location.reload();
    }
}

// ---- Log Workout ----
function openLog(id) {
    currentLogWorkoutId = id;
    stravaActivityForLog = null;
    const workout = workouts.find(w => w.id === id);
    const existingLog = activityLogs[id];

    document.getElementById('log-title').textContent = workout.title;
    document.getElementById('log-date').textContent = formatDate(workout.date);
    document.getElementById('log-duration').value = existingLog?.duration || parseDuration(workout.duration);
    document.getElementById('log-power').value = existingLog?.avgPower || '';
    document.getElementById('log-np').value = existingLog?.normalizedPower || '';
    document.getElementById('log-distance').value = existingLog?.distance || '';
    document.getElementById('log-avghr').value = existingLog?.avgHr || '';
    document.getElementById('log-maxhr').value = existingLog?.maxHr || '';
    document.getElementById('log-calories').value = existingLog?.calories || '';
    document.getElementById('log-tss').value = existingLog?.tss || '';
    document.getElementById('log-notes').value = existingLog?.notes || '';

    selectedFeeling = existingLog?.feeling || 5;
    updateFeelingButtons();

    const stravaSelector = document.getElementById('strava-selector');
    const activitiesList = document.getElementById('strava-activities-list');
    if (isStravaConnected()) {
        stravaSelector.style.display = 'block';
        activitiesList.innerHTML = '';
    } else {
        stravaSelector.style.display = 'none';
    }

    openModal('modal-log');
}

function closeLog() {
    closeModal('modal-log');
    currentLogWorkoutId = null;
}

function updateFeelingButtons() {
    document.querySelectorAll('.feeling-btn').forEach(btn => {
        const val = parseInt(btn.dataset.value);
        btn.classList.toggle('active', val <= selectedFeeling);
    });
}

function saveLog() {
    if (!currentLogWorkoutId) return;

    activityLogs[currentLogWorkoutId] = {
        duration: parseInt(document.getElementById('log-duration').value) || 60,
        avgPower: parseInt(document.getElementById('log-power').value) || 0,
        normalizedPower: parseInt(document.getElementById('log-np').value) || 0,
        distance: parseFloat(document.getElementById('log-distance').value) || 0,
        avgHr: parseInt(document.getElementById('log-avghr').value) || 0,
        maxHr: parseInt(document.getElementById('log-maxhr').value) || 0,
        calories: parseInt(document.getElementById('log-calories').value) || 0,
        tss: parseInt(document.getElementById('log-tss').value) || 0,
        feeling: selectedFeeling,
        notes: document.getElementById('log-notes').value,
        stravaActivity: stravaActivityForLog,
        loggedAt: new Date().toISOString()
    };

    completed[currentLogWorkoutId] = true;
    saveData();
    closeLog();
    renderCurrentTrainingView();
}

// ---- Edit Workout ----
let currentEditWorkoutId = null;

function openEdit(id) {
    currentEditWorkoutId = id;
    const workout = workouts.find(w => w.id === id);

    document.getElementById('edit-date').value = workout.date;
    document.getElementById('edit-title').value = workout.title;
    document.getElementById('edit-duration').value = workout.duration;
    document.getElementById('edit-desc').value = workout.desc || '';
    document.getElementById('edit-nutrition').value = workout.nutrition || '';
    document.getElementById('edit-coach-notes').value = workout.coach_notes || '';

    openModal('modal-edit');
}

function closeEdit() {
    closeModal('modal-edit');
    currentEditWorkoutId = null;
}

function saveEdit() {
    if (!currentEditWorkoutId) return;

    workouts = workouts.map(w => {
        if (w.id === currentEditWorkoutId) {
            return {
                ...w,
                date: document.getElementById('edit-date').value,
                title: document.getElementById('edit-title').value,
                duration: document.getElementById('edit-duration').value,
                desc: document.getElementById('edit-desc').value,
                nutrition: document.getElementById('edit-nutrition').value,
                coach_notes: document.getElementById('edit-coach-notes').value
            };
        }
        return w;
    });

    saveData();
    closeEdit();
    renderCurrentTrainingView();
}

function deleteWorkoutFromEdit() {
    if (currentEditWorkoutId && confirm('Workout wirklich löschen?')) {
        workouts = workouts.filter(w => w.id !== currentEditWorkoutId);
        delete completed[currentEditWorkoutId];
        delete activityLogs[currentEditWorkoutId];
        saveData();
        closeEdit();
        closeWorkoutDetail();
        renderCurrentTrainingView();
    }
}

function toggleComplete(id) {
    completed[id] = !completed[id];
    saveData();
    renderCurrentTrainingView();
}

// ---- Workout Detail Fullscreen ----
function openWorkoutDetail(workoutId) {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;

    const view = document.getElementById('workout-detail-view');
    const isComp = completed[workout.id];
    const log = activityLogs[workout.id];
    const intensity = getIntensityClass(workout.title);

    let html = `
        <div class="fullscreen-header">
            <button class="btn-back" onclick="closeWorkoutDetail()">\u2190</button>
            <h2>${workout.title}</h2>
            <button class="btn-back" onclick="openEdit('${workout.id}')" style="font-size:14px;">\u270E</button>
        </div>
        <div class="workout-detail">
            <div class="workout-detail-hero">
                <div class="workout-detail-badge">
                    <span class="badge badge-${intensity}">${intensity}</span>
                </div>
                <div class="workout-detail-title">${workout.title}</div>
                <div class="workout-detail-meta">
                    <span>\uD83D\uDCC5 ${formatDate(workout.date)}</span>
                    <span>\u23F1 ${workout.duration}</span>
                    ${isComp ? '<span style="color:var(--status-green)">\u2713 Erledigt</span>' : ''}
                    ${workout.intervalsEventId ? '<span class="intervals-icu-badge">intervals.icu</span>' : ''}
                </div>
                <div class="workout-detail-desc">${workout.desc || ''}</div>
            </div>`;

    // Intervals
    if (workout.intervals) {
        html += `
            <div class="detail-section">
                <div class="detail-section-header">
                    <span class="section-icon">\uD83D\uDCCA</span> Intervalle
                </div>
                <div class="detail-section-body">
                    <pre class="intervals-text">${workout.intervals}</pre>
                </div>
            </div>`;
    }

    // Nutrition
    if (workout.nutrition) {
        html += `
            <div class="detail-section">
                <div class="detail-section-header">
                    <span class="section-icon">\uD83C\uDF4C</span> Nutrition
                </div>
                <div class="detail-section-body">
                    <div class="info-text">${workout.nutrition}</div>
                </div>
            </div>`;
    }

    // Technique
    if (workout.technique) {
        html += `
            <div class="detail-section">
                <div class="detail-section-header">
                    <span class="section-icon">\uD83C\uDFAF</span> Technik
                </div>
                <div class="detail-section-body">
                    <div class="info-text">${workout.technique}</div>
                    ${workout.video_url ? `<a href="${workout.video_url}" target="_blank" class="btn-video">\u25B6 Video ansehen</a>` : ''}
                </div>
            </div>`;
    }

    // Coach Notes
    if (workout.coach_notes) {
        html += `
            <div class="detail-section">
                <div class="detail-section-header">
                    <span class="section-icon">\uD83E\uDDD1\u200D\uD83C\uDFEB</span> Coach Notiz
                </div>
                <div class="detail-section-body">
                    <div class="info-text">${workout.coach_notes}</div>
                </div>
            </div>`;
    }

    // Log/Comparison
    if (log) {
        const sollDuration = parseDuration(workout.duration);
        const istDuration = log.duration || sollDuration;
        const percent = Math.round((istDuration / sollDuration) * 100);

        html += `
            <div class="detail-section">
                <div class="detail-section-header">
                    <span class="section-icon">\uD83D\uDCDD</span> Protokoll
                    ${log.stravaActivity ? '<span class="strava-badge">STRAVA</span>' : ''}
                </div>
                <div class="detail-section-body">
                    <div class="comparison-grid">
                        <div class="comparison-item">
                            <div class="comp-label">Dauer</div>
                            <div class="comp-value">${istDuration}m</div>
                            <div class="comp-diff ${percent >= 90 ? 'good' : 'warn'}">${percent}% von ${sollDuration}m</div>
                        </div>
                        ${log.avgPower ? `
                        <div class="comparison-item">
                            <div class="comp-label">\u00D8 Leistung</div>
                            <div class="comp-value">${log.avgPower}W</div>
                            <div class="comp-diff">${Math.round((log.avgPower / ftp) * 100)}% FTP</div>
                        </div>` : ''}
                        ${log.normalizedPower ? `
                        <div class="comparison-item">
                            <div class="comp-label">NP</div>
                            <div class="comp-value">${log.normalizedPower}W</div>
                            <div class="comp-diff">${Math.round((log.normalizedPower / ftp) * 100)}% FTP</div>
                        </div>` : ''}
                    </div>
                    ${(log.distance || log.avgHr || log.calories) ? `
                    <div class="comparison-grid" style="margin-top:8px;">
                        ${log.distance ? `<div class="comparison-item"><div class="comp-label">Distanz</div><div class="comp-value">${log.distance}km</div></div>` : ''}
                        ${log.avgHr ? `<div class="comparison-item"><div class="comp-label">\u00D8 HR</div><div class="comp-value">${log.avgHr}</div>${log.maxHr ? `<div class="comp-diff">Max: ${log.maxHr}</div>` : ''}</div>` : ''}
                        ${log.calories ? `<div class="comparison-item"><div class="comp-label">Kalorien</div><div class="comp-value">${log.calories}</div>${log.tss ? `<div class="comp-diff">TSS: ${log.tss}</div>` : ''}</div>` : ''}
                    </div>` : ''}
                    <div class="comparison-feeling">
                        <span style="color:var(--text-muted)">Gef\u00FChl:</span> ${'\u2B50'.repeat(log.feeling || 3)}
                    </div>
                    ${log.notes ? `<div class="comparison-notes">${log.notes}</div>` : ''}
                </div>
            </div>`;
    }

    // Actions
    html += `
            <div class="detail-actions">
                ${!isComp ? `<button class="btn-action btn-log" onclick="openLog('${workout.id}')">Training loggen</button>` : ''}
                <button class="btn-action btn-complete ${isComp ? 'active' : ''}" onclick="toggleComplete('${workout.id}'); openWorkoutDetail('${workout.id}')">
                    ${isComp ? '\u2713 Erledigt' : 'Erledigt'}
                </button>
            </div>
        </div>`;

    view.innerHTML = html;
    view.classList.add('active');
}

function closeWorkoutDetail() {
    document.getElementById('workout-detail-view').classList.remove('active');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadStravaTokens();
    handleStravaCallback();
    updateStravaUI();
    loadIntervalsConfig();
    loadCachedIntervalsActivities();

    // Init training view
    initTraining();

    // Feeling buttons
    document.querySelectorAll('.feeling-btn').forEach(btn => {
        btn.onclick = () => {
            selectedFeeling = parseInt(btn.dataset.value);
            updateFeelingButtons();
        };
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
    });

    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => switchTab(item.dataset.tab);
    });

    // Auto-Sync im Hintergrund (Strava + intervals.icu immer, Komoot nur wenn >24h)
    if (typeof autoSyncOnStart === 'function') {
        setTimeout(() => { autoSyncOnStart(); }, 500);
    }
});
