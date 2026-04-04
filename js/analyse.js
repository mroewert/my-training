// ============================================
// ANALYSE.JS – Formkurve, Volumen, Stats, Performance
// ============================================

function renderAnalyse() {
    const container = document.getElementById('analyse-content');
    if (!container) return;

    let html = '<div class="analyse-container">';
    html += renderFormCurveSection();
    html += renderVolumeChartSection();
    html += renderStatsSection();
    html += renderPerformanceSection();
    html += '</div>';

    container.innerHTML = html;
}

// ============================================
// 1. FORMKURVE
// ============================================
function renderFormCurveSection() {
    const weeks = getWeeks();
    const today = new Date();
    const currentWeekNum = getWeekNumber(today);
    const currentYear = today.getFullYear();

    // Find current week index
    let currentWeekIdx = 0;
    weeks.forEach((week, idx) => {
        const wn = getWeekNumber(new Date(week[0].date));
        const wy = new Date(week[0].date).getFullYear();
        if (wn === currentWeekNum && wy === currentYear) currentWeekIdx = idx;
    });

    // Collect last 8 weeks of data
    const numWeeks = 8;
    const startIdx = Math.max(0, currentWeekIdx - numWeeks + 1);
    const weekLoads = [];

    for (let i = startIdx; i <= currentWeekIdx && i < weeks.length; i++) {
        let actualMin = 0;
        let targetMin = 0;
        weeks[i].forEach(w => {
            targetMin += parseDuration(w.duration);
            if (completed[w.id]) {
                const log = activityLogs[w.id];
                actualMin += log?.duration || parseDuration(w.duration);
            }
        });
        weekLoads.push({
            weekNum: getWeekNumber(new Date(weeks[i][0].date)),
            actualMin,
            targetMin,
            isCurrent: i === currentWeekIdx
        });
    }

    const maxLoad = Math.max(...weekLoads.map(w => w.actualMin), 1);

    // Determine form status
    const currentLoad = weekLoads[weekLoads.length - 1]?.actualMin || 0;
    const prevLoads = weekLoads.slice(0, -1);
    const avgLoad = prevLoads.length > 0
        ? prevLoads.reduce((a, b) => a + b.actualMin, 0) / prevLoads.length
        : currentLoad;

    let statusText, statusClass;
    if (currentLoad < avgLoad * 0.7) {
        statusText = 'Erholt'; statusClass = 'fresh';
    } else if (currentLoad > avgLoad * 1.3) {
        statusText = '\u00DCberlastung'; statusClass = 'overreaching';
    } else if (currentLoad > avgLoad * 1.1) {
        statusText = 'Aufbau'; statusClass = 'building';
    } else {
        statusText = 'Stabil'; statusClass = 'stable';
    }

    let html = `
        <div class="analyse-section">
            <div class="analyse-section-header">
                <span class="section-icon">\uD83D\uDCC8</span> Formkurve
                <span class="analyse-section-sub">Letzte ${weekLoads.length} Wochen</span>
            </div>
            <div class="analyse-section-body">
                <span class="form-curve-status ${statusClass}">${statusText}</span>
                <div class="form-bars-container">`;

    weekLoads.forEach(week => {
        const pct = (week.actualMin / maxLoad) * 100;
        const hours = Math.round(week.actualMin / 60 * 10) / 10;
        html += `
                    <div class="form-bar-wrapper${week.isCurrent ? ' current' : ''}">
                        <div class="form-bar-track">
                            <div class="form-bar ${week.isCurrent ? 'current' : 'past'}" style="height:${Math.max(pct, 3)}%">
                                ${hours > 0 ? `<span class="form-bar-value">${hours}h</span>` : ''}
                            </div>
                        </div>
                        <span class="form-bar-label">KW${week.weekNum}</span>
                    </div>`;
    });

    html += `
                </div>
            </div>
        </div>`;

    return html;
}

// ============================================
// 2. WOCHENVOLUMEN-CHART (Soll vs Ist)
// ============================================
function renderVolumeChartSection() {
    const weeks = getWeeks();
    if (weeks.length === 0) return '';

    const today = new Date();
    const currentWeekNum = getWeekNumber(today);
    const currentYear = today.getFullYear();
    const phases = getPlanPhases();

    const weekData = weeks.map((week, idx) => {
        const weekDate = new Date(week[0].date);
        const weekNum = getWeekNumber(weekDate);
        const weekYear = weekDate.getFullYear();
        const isCurrent = weekNum === currentWeekNum && weekYear === currentYear;
        const isPast = weekDate < today && !isCurrent;

        let sollMin = 0, istMin = 0;
        week.forEach(w => {
            sollMin += parseDuration(w.duration);
            if (completed[w.id]) {
                const log = activityLogs[w.id];
                istMin += log?.duration || parseDuration(w.duration);
            }
        });

        return { weekNum, sollMin, istMin, isCurrent, isPast, weekDate };
    });

    const maxMin = Math.max(...weekData.map(w => Math.max(w.sollMin, w.istMin)), 1);

    let html = `
        <div class="analyse-section">
            <div class="analyse-section-header">
                <span class="section-icon">\uD83D\uDCCA</span> Wochenvolumen
                <span class="analyse-section-sub">Soll vs. Ist</span>
            </div>
            <div class="analyse-section-body">
                <div class="volume-chart-container">
                    <div class="volume-chart">`;

    weekData.forEach(wd => {
        const sollPct = (wd.sollMin / maxMin) * 100;
        const istPct = (wd.istMin / maxMin) * 100;
        const sollH = Math.round(wd.sollMin / 60 * 10) / 10;
        const istH = Math.round(wd.istMin / 60 * 10) / 10;

        let barClass = 'future';
        if (wd.isCurrent) barClass = 'current';
        else if (wd.isPast && wd.istMin > 0) barClass = 'past';
        else if (wd.isPast && wd.istMin === 0 && wd.sollMin > 0) barClass = 'missed';

        html += `
                        <div class="volume-bar-wrapper${wd.isCurrent ? ' current' : ''}">
                            <div class="volume-bar-track">
                                <span class="volume-bar-hours">${wd.isPast || wd.isCurrent ? istH + 'h' : sollH + 'h'}</span>
                                <div class="volume-bar-soll" style="height:${Math.max(sollPct, 2)}%"></div>
                                <div class="volume-bar-ist ${barClass}" style="height:${Math.max(istPct, 1)}%"></div>
                            </div>
                            <span class="volume-bar-label">${wd.weekNum}</span>
                        </div>`;
    });

    html += `
                    </div>
                </div>
            </div>
        </div>`;

    return html;
}

// ============================================
// 3. STATISTIKEN
// ============================================
function renderStatsSection() {
    const weeks = getWeeks();
    const allWorkouts = weeks.flat();
    const totalCount = allWorkouts.length;
    const completedCount = allWorkouts.filter(w => completed[w.id]).length;
    const pctDone = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;

    let totalPlannedMin = 0, totalActualMin = 0;
    allWorkouts.forEach(w => {
        totalPlannedMin += parseDuration(w.duration);
        if (completed[w.id]) {
            const log = activityLogs[w.id];
            totalActualMin += log?.duration || parseDuration(w.duration);
        }
    });

    // Average weekly completion rate (only for past weeks)
    const today = new Date();
    let pastWeeks = 0, pastCompleted = 0, pastTotal = 0;
    weeks.forEach(week => {
        const weekDate = new Date(week[0].date);
        if (weekDate < today) {
            pastWeeks++;
            week.forEach(w => {
                pastTotal++;
                if (completed[w.id]) pastCompleted++;
            });
        }
    });
    const avgCompletion = pastTotal > 0 ? Math.round(pastCompleted / pastTotal * 100) : 0;

    // Intensity distribution
    const intensityCounts = { Recovery: 0, Endurance: 0, Sweetspot: 0, Threshold: 0, VO2max: 0 };
    allWorkouts.forEach(w => {
        const cls = getIntensityClass(w.title);
        if (cls === 'recovery') intensityCounts.Recovery++;
        else if (cls === 'endurance') intensityCounts.Endurance++;
        else if (cls === 'sweetspot') intensityCounts.Sweetspot++;
        else if (cls === 'threshold') intensityCounts.Threshold++;
        else if (cls === 'vo2max') intensityCounts.VO2max++;
        else intensityCounts.Sweetspot++; // default
    });
    const maxIntensity = Math.max(...Object.values(intensityCounts), 1);

    let html = `
        <div class="analyse-section">
            <div class="analyse-section-header">
                <span class="section-icon">\uD83D\uDCCB</span> Statistiken
            </div>
            <div class="analyse-section-body">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${completedCount}/${totalCount}</div>
                        <div class="stat-label">Workouts</div>
                        <div class="stat-sub">${pctDone}% erledigt</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Math.round(totalActualMin / 60)}h</div>
                        <div class="stat-label">Trainiert</div>
                        <div class="stat-sub">von ${Math.round(totalPlannedMin / 60)}h geplant</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${avgCompletion}%</div>
                        <div class="stat-label">\u00D8 Completion</div>
                        <div class="stat-sub">${pastWeeks} Wochen</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${ftp}W</div>
                        <div class="stat-label">FTP</div>
                        <div class="stat-sub">Aktuell</div>
                    </div>
                </div>

                <div class="intensity-dist">`;

    const intensityMap = [
        { key: 'Recovery', css: 'recovery', label: 'Recovery' },
        { key: 'Endurance', css: 'endurance', label: 'Endurance' },
        { key: 'Sweetspot', css: 'sweetspot', label: 'Sweetspot' },
        { key: 'Threshold', css: 'threshold', label: 'Threshold' },
        { key: 'VO2max', css: 'vo2max', label: 'VO2max' },
    ];

    intensityMap.forEach(item => {
        const count = intensityCounts[item.key];
        const pct = (count / maxIntensity) * 100;
        html += `
                    <div class="intensity-row">
                        <span class="int-label intensity-${item.css}">${item.label}</span>
                        <div class="int-bar-track">
                            <div class="int-bar-fill ${item.css}" style="width:${pct}%"></div>
                        </div>
                        <span class="int-count">${count}</span>
                    </div>`;
    });

    html += `
                </div>
            </div>
        </div>`;

    return html;
}

// ============================================
// 4. LEISTUNGSDATEN (aus Logs/Strava)
// ============================================
function renderPerformanceSection() {
    // Collect logged workouts with power or HR data, sorted by date
    const loggedWorkouts = [];
    workouts.forEach(w => {
        const log = activityLogs[w.id];
        if (log && (log.avgPower > 0 || log.avgHr > 0)) {
            loggedWorkouts.push({
                date: w.date,
                title: w.title,
                avgPower: log.avgPower || 0,
                normalizedPower: log.normalizedPower || 0,
                avgHr: log.avgHr || 0,
                duration: log.duration || 0
            });
        }
    });

    loggedWorkouts.sort((a, b) => new Date(a.date) - new Date(b.date));

    let html = `
        <div class="analyse-section">
            <div class="analyse-section-header">
                <span class="section-icon">\u26A1</span> Leistungsdaten
                <span class="analyse-section-sub">${loggedWorkouts.length} Eintr\u00E4ge</span>
            </div>
            <div class="analyse-section-body">`;

    if (loggedWorkouts.length < 2) {
        html += `
                <div class="perf-empty">
                    Mindestens 2 geloggte Trainings mit Leistungs- oder Herzfrequenzdaten ben\u00F6tigt.<br>
                    Logge Trainings \u00FCber den Woche-Tab oder verbinde Strava.
                </div>`;
    } else {
        const hasPower = loggedWorkouts.some(w => w.avgPower > 0);
        const hasHr = loggedWorkouts.some(w => w.avgHr > 0);

        // Find value ranges
        const powerValues = loggedWorkouts.filter(w => w.avgPower > 0).map(w => w.avgPower);
        const hrValues = loggedWorkouts.filter(w => w.avgHr > 0).map(w => w.avgHr);

        if (hasPower) {
            html += renderPerfChart(loggedWorkouts, 'avgPower', 'Durchschnittsleistung (Watt)', 'power');
        }

        if (hasHr) {
            html += renderPerfChart(loggedWorkouts, 'avgHr', '\u00D8 Herzfrequenz (bpm)', 'hr');
        }

        // Legend
        html += `<div class="perf-legend">`;
        if (hasPower) html += `<div class="perf-legend-item"><span class="perf-legend-dot power"></span> Leistung</div>`;
        if (hasHr) html += `<div class="perf-legend-item"><span class="perf-legend-dot hr"></span> Herzfrequenz</div>`;
        html += `<div class="perf-legend-item"><span class="perf-legend-dot ftp"></span> FTP (${ftp}W)</div>`;
        html += `</div>`;
    }

    html += `
            </div>
        </div>`;

    return html;
}

function renderPerfChart(data, valueKey, title, colorClass) {
    const values = data.map(d => d[valueKey]).filter(v => v > 0);
    if (values.length < 2) return '';

    const minVal = Math.min(...values) * 0.85;
    const maxVal = Math.max(...values, valueKey === 'avgPower' ? ftp : 0) * 1.1;
    const range = maxVal - minVal || 1;

    // FTP line position (only for power)
    const ftpPct = valueKey === 'avgPower' ? ((ftp - minVal) / range) * 100 : -1;

    let html = `
        <div style="margin-bottom:16px;">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-weight:600;">${title}</div>
            <div class="perf-chart-container">
                ${ftpPct >= 0 && ftpPct <= 100 ? `
                <div class="perf-ftp-line" style="bottom:${ftpPct}%">
                    <span class="perf-ftp-label">FTP ${ftp}W</span>
                </div>` : ''}
                <div class="perf-chart-canvas">`;

    data.forEach((d, idx) => {
        const val = d[valueKey];
        if (val <= 0) return;
        const pct = ((val - minVal) / range) * 100;
        const dateLabel = formatDate(d.date).split(' ')[1]; // DD.MM

        html += `
                    <div class="perf-point-wrapper">
                        <div class="perf-line" style="height:${Math.max(pct, 2)}%;background:${colorClass === 'power' ? 'rgba(232,148,76,0.2)' : 'rgba(239,68,68,0.2)'}"></div>
                        <div class="perf-dot" style="bottom:${pct}%;background:${colorClass === 'power' ? 'var(--accent-primary)' : 'var(--status-red)'}" title="${d.title}: ${val}${valueKey === 'avgPower' ? 'W' : 'bpm'}"></div>
                        <span class="perf-point-label">${dateLabel}</span>
                    </div>`;
    });

    html += `
                </div>
            </div>
        </div>`;

    return html;
}
