// ============================================
// TRAINING.JS – Kalender, Woche, Roadmap
// ============================================

let trainingView = 'calendar'; // 'calendar' | 'week' | 'roadmap'
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let selectedWeekIdx = 0;

function initTraining() {
    // Find current week
    const weeks = getWeeks();
    const today = new Date();
    for (let i = 0; i < weeks.length; i++) {
        for (const w of weeks[i]) {
            if (isToday(w.date)) { selectedWeekIdx = i; break; }
        }
    }
    // Fallback: find closest future week
    if (selectedWeekIdx === 0 && weeks.length > 0) {
        for (let i = 0; i < weeks.length; i++) {
            for (const w of weeks[i]) {
                if (new Date(w.date) >= today) { selectedWeekIdx = i; break; }
            }
            if (selectedWeekIdx > 0) break;
        }
    }

    renderCurrentTrainingView();
}

function switchTrainingView(view) {
    trainingView = view;
    document.querySelectorAll('.training-subnav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    renderCurrentTrainingView();
}

function renderCurrentTrainingView() {
    const container = document.getElementById('training-content');
    if (!container) return;

    if (trainingView === 'calendar') renderCalendar(container);
    else if (trainingView === 'week') renderWeekView(container);
    else if (trainingView === 'roadmap') renderRoadmap(container);
}

// ============================================
// CALENDAR VIEW
// ============================================
function renderCalendar(container) {
    const today = new Date();
    const year = calendarYear;
    const month = calendarMonth;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = lastDay.getDate();

    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    // Build workout lookup by date
    const workoutsByDate = {};
    workouts.forEach(w => {
        if (!workoutsByDate[w.date]) workoutsByDate[w.date] = [];
        workoutsByDate[w.date].push(w);
    });

    // Month stats
    let monthWorkouts = 0, monthCompleted = 0, monthHours = 0;
    workouts.forEach(w => {
        const d = new Date(w.date);
        if (d.getMonth() === month && d.getFullYear() === year) {
            monthWorkouts++;
            if (completed[w.id]) monthCompleted++;
            monthHours += parseDuration(w.duration);
        }
    });

    // Build intervals.icu events lookup by date (planned workouts from intervals.icu not yet in local plan)
    const intervalsByDate = {};
    if (intervalsEvents && intervalsEvents.length > 0) {
        intervalsEvents.forEach(e => {
            const date = e.start_date_local ? e.start_date_local.split('T')[0] : null;
            if (!date) return;
            // Only show events that have no matching local workout
            const hasLocal = workouts.some(w => w.intervalsEventId === e.id || w.title === e.name);
            if (hasLocal) return;
            if (!intervalsByDate[date]) intervalsByDate[date] = [];
            intervalsByDate[date].push({
                id: e.id,
                name: e.name || 'Workout',
                duration: e.moving_time ? Math.round(e.moving_time / 60) : 0,
                date: date
            });
        });
    }

    let html = `
        <div class="calendar-nav">
            <button class="calendar-nav-btn" onclick="calendarPrev()">\u25C0</button>
            <span class="calendar-month-title">${monthNames[month]} ${year}</span>
            <button class="calendar-nav-btn" onclick="calendarNext()">\u25B6</button>
        </div>
        ${isIntervalsConnected() ? '<div class="calendar-sync-row"><button class="btn-intervals-sync" id="btn-intervals-sync" onclick="syncIntervalsToCalendar()" title="intervals.icu synchronisieren">Sync intervals.icu</button></div>' : ''}
        <div class="calendar-grid">
            <div class="calendar-day-header">Mo</div>
            <div class="calendar-day-header">Di</div>
            <div class="calendar-day-header">Mi</div>
            <div class="calendar-day-header">Do</div>
            <div class="calendar-day-header">Fr</div>
            <div class="calendar-day-header">Sa</div>
            <div class="calendar-day-header">So</div>`;

    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonth.getDate() - i;
        const dateStr = formatISODate(year, month - 1, day);
        html += renderCalendarDay(day, dateStr, workoutsByDate, intervalsByDate, today, true);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatISODate(year, month, day);
        html += renderCalendarDay(day, dateStr, workoutsByDate, intervalsByDate, today, false);
    }

    // Next month padding
    const totalCells = startDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
        const dateStr = formatISODate(year, month + 1, day);
        html += renderCalendarDay(day, dateStr, workoutsByDate, intervalsByDate, today, true);
    }

    html += `</div>`;

    // Month summary
    html += `
        <div class="calendar-month-summary">
            <div class="calendar-month-stat">
                <div class="stat-value">${monthWorkouts}</div>
                <div class="stat-label">Trainings</div>
            </div>
            <div class="calendar-month-stat">
                <div class="stat-value">${monthCompleted}/${monthWorkouts}</div>
                <div class="stat-label">Erledigt</div>
            </div>
            <div class="calendar-month-stat">
                <div class="stat-value">${formatDurationHours(monthHours)}</div>
                <div class="stat-label">Volumen</div>
            </div>
        </div>`;

    container.innerHTML = html;
}

function renderCalendarDay(day, dateStr, workoutsByDate, intervalsByDate, today, otherMonth) {
    const isToday = dateStr === localDateStr(today);
    const dayWorkouts = workoutsByDate[dateStr] || [];
    const dayIntervals = intervalsByDate[dateStr] || [];

    let cls = 'calendar-day';
    if (otherMonth) cls += ' other-month';
    if (isToday) cls += ' today';

    let html = `<div class="${cls}">
        <div class="calendar-day-num">${day}</div>`;

    // Planned workouts
    dayWorkouts.forEach(w => {
        const intensity = getIntensityClass(w.title);
        const isComp = completed[w.id];
        const isIntervalsSynced = w.intervalsEventId;
        const shortTitle = w.title.length > 12 ? w.title.substring(0, 11) + '\u2026' : w.title;
        html += `<div class="calendar-workout ${intensity}${isComp ? ' completed' : ''}${isIntervalsSynced ? ' intervals-synced' : ''}" onclick="openWorkoutDetail('${w.id}')">
            ${isIntervalsSynced ? '<span class="intervals-badge">i</span>' : ''}${shortTitle}
            <div class="cal-duration">${w.duration}</div>
        </div>`;
    });

    // Unmatched intervals.icu events (planned on intervals.icu but not yet in local plan)
    dayIntervals.forEach(a => {
        const shortName = a.name.length > 12 ? a.name.substring(0, 11) + '\u2026' : a.name;
        const durStr = a.duration >= 60 ? Math.round(a.duration / 60 * 10) / 10 + 'h' : a.duration + 'm';
        html += `<div class="calendar-workout intervals-unmatched" title="${a.name} - ${durStr}">
            <span class="intervals-badge">i</span>${shortName}
            <div class="cal-duration">${durStr}</div>
        </div>`;
    });

    html += `</div>`;
    return html;
}

function formatISODate(year, month, day) {
    const d = new Date(year, month, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function localDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function calendarPrev() {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderCurrentTrainingView();
}

function calendarNext() {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderCurrentTrainingView();
}

// ============================================
// WEEK VIEW
// ============================================
function renderWeekView(container) {
    const weeks = getWeeks();
    if (weeks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">\uD83D\uDEB4</div>
                <div class="empty-text">Kein Trainingsplan geladen</div>
                <div class="empty-link" onclick="openImport()">Plan importieren</div>
            </div>`;
        return;
    }

    const currentWeek = weeks[selectedWeekIdx] || weeks[0];
    const weekNum = getWeekNumber(new Date(currentWeek[0].date));

    // Week date range
    const firstDate = new Date(currentWeek[0].date);
    const lastDate = new Date(currentWeek[currentWeek.length - 1].date);
    const dateRange = `${firstDate.getDate().toString().padStart(2, '0')}.${(firstDate.getMonth() + 1).toString().padStart(2, '0')} \u2013 ${lastDate.getDate().toString().padStart(2, '0')}.${(lastDate.getMonth() + 1).toString().padStart(2, '0')}`;

    // Stats
    let targetMin = 0, actualMin = 0, completedCount = 0;
    currentWeek.forEach(w => {
        targetMin += parseDuration(w.duration);
        if (completed[w.id]) {
            completedCount++;
            const log = activityLogs[w.id];
            actualMin += log?.duration || parseDuration(w.duration);
        }
    });
    const percent = targetMin > 0 ? Math.round((actualMin / targetMin) * 100) : 0;

    let html = `
        <div class="week-nav">
            <button class="calendar-nav-btn" onclick="weekPrev()">\u25C0</button>
            <div class="week-nav-title">
                <div class="week-label">KW ${weekNum}</div>
                <div class="week-dates">${dateRange}</div>
            </div>
            <button class="calendar-nav-btn" onclick="weekNext()">\u25B6</button>
        </div>
        <div class="week-summary-bar">
            <div class="week-stat">
                <div class="stat-value">${formatDurationHours(targetMin)}</div>
                <div class="stat-label">Soll</div>
            </div>
            <div class="week-stat">
                <div class="stat-value">${formatDurationHours(actualMin)}</div>
                <div class="stat-label">Ist</div>
                <div class="stat-sub ${percent >= 90 ? 'trend-up' : percent >= 70 ? 'trend-neutral' : 'trend-down'}">${percent}%</div>
            </div>
            <div class="week-stat">
                <div class="stat-value">${completedCount}/${currentWeek.length}</div>
                <div class="stat-label">Erledigt</div>
            </div>
        </div>
        <div class="workout-list">`;

    currentWeek.forEach((w, idx) => {
        const intensity = getIntensityClass(w.title);
        const isComp = completed[w.id];
        const isTodayW = isToday(w.date);

        html += `
            <div class="workout-card${isComp ? ' completed' : ''}${isTodayW ? ' is-today' : ''}" style="animation-delay:${idx * 0.05}s" onclick="openWorkoutDetail('${w.id}')">
                <div class="workout-card-header">
                    <div class="workout-intensity-dot ${intensity}"></div>
                    <div class="workout-card-info">
                        <div class="workout-card-date">
                            ${formatDate(w.date)}
                            ${isTodayW ? ' <span class="today-tag">Heute</span>' : ''}
                        </div>
                        <div class="workout-card-title">${w.title}</div>
                    </div>
                    <div class="workout-card-right">
                        <div class="workout-card-duration">${w.duration}</div>
                        ${isComp ? '<div class="workout-card-status">\u2713</div>' : ''}
                    </div>
                </div>
            </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function weekPrev() {
    const weeks = getWeeks();
    if (selectedWeekIdx > 0) selectedWeekIdx--;
    renderCurrentTrainingView();
}

function weekNext() {
    const weeks = getWeeks();
    if (selectedWeekIdx < weeks.length - 1) selectedWeekIdx++;
    renderCurrentTrainingView();
}

// ============================================
// ROADMAP VIEW
// ============================================
function renderRoadmap(container) {
    const weeks = getWeeks();
    const today = new Date();
    const todayStr = localDateStr(today);
    const currentWeekNum = getWeekNumber(today);
    const currentYear = today.getFullYear();
    const phases = getPlanPhases();
    const currentPhaseId = getPhaseForWeekNum(currentWeekNum);

    // Find event date
    const allWorkouts = weeks.flat();
    const eventWorkout = allWorkouts.find(w =>
        w.title && (w.title.toLowerCase().includes('harzquerfahrt') || w.title.toLowerCase().includes('155km'))
    );
    const eventDate = eventWorkout ? new Date(eventWorkout.date) : new Date('2026-06-27');
    const daysToEvent = Math.max(0, Math.ceil((eventDate - today) / 86400000));

    // Overall progress
    const totalWorkouts = allWorkouts.length;
    const completedWorkouts = allWorkouts.filter(w => completed[w.id]).length;
    const pctDone = totalWorkouts > 0 ? Math.round(completedWorkouts / totalWorkouts * 100) : 0;

    let totalPlannedMin = 0, completedMin = 0;
    allWorkouts.forEach(w => {
        const dur = parseDuration(w.duration);
        totalPlannedMin += dur;
        if (completed[w.id]) completedMin += dur;
    });

    // Assign weeks to phases
    const phaseWeeks = {};
    phases.forEach(p => { phaseWeeks[p.id] = []; });
    weeks.forEach((week, idx) => {
        const weekDate = new Date(week[0].date);
        const weekNum = getWeekNumber(weekDate);
        const phaseId = getPhaseForWeekNum(weekNum);
        if (phaseWeeks[phaseId]) {
            phaseWeeks[phaseId].push({ week, idx, weekNum, weekDate });
        }
    });

    let html = `<div class="roadmap">`;

    // Goal Card
    html += `
        <div class="roadmap-goal">
            <div class="roadmap-goal-title">\uD83C\uDFC1 Harzquerfahrt</div>
            <div class="roadmap-goal-date">27. Juni 2026 \u00B7 155 km \u00B7 1.700 hm</div>
            <div class="roadmap-goal-countdown">${daysToEvent}</div>
            <div class="roadmap-goal-countdown-label">Tage</div>
        </div>`;

    // Overall Progress
    html += `
        <div class="roadmap-progress">
            <div class="roadmap-progress-bar">
                <div class="roadmap-progress-fill" style="width:${pctDone}%"></div>
            </div>
            <div class="roadmap-progress-text">
                ${completedWorkouts}/${totalWorkouts} Workouts \u00B7 ${Math.round(completedMin / 60)}h von ${Math.round(totalPlannedMin / 60)}h
            </div>
        </div>`;

    // Timeline
    html += `<div class="roadmap-timeline">`;

    phases.forEach(phase => {
        const pw = phaseWeeks[phase.id];
        const isActive = phase.id === currentPhaseId;

        // Phase stats
        const phaseWorkouts = pw.flatMap(w => w.week);
        const phaseDone = phaseWorkouts.filter(w => completed[w.id]).length;
        const phaseTotal = phaseWorkouts.length;
        const phasePct = phaseTotal > 0 ? Math.round(phaseDone / phaseTotal * 100) : 0;

        let phaseMinutes = 0;
        phaseWorkouts.forEach(w => { phaseMinutes += parseDuration(w.duration); });
        const phaseHours = Math.round(phaseMinutes / 60 * 10) / 10;

        // Is this phase completed?
        const isCompleted = phasePct === 100 && phaseTotal > 0;
        const isFuture = !isActive && !isCompleted && phases.indexOf(phase) > phases.findIndex(p => p.id === currentPhaseId);

        let phaseCls = 'roadmap-phase';
        if (isActive) phaseCls += ' active';
        else if (isCompleted) phaseCls += ' completed';

        html += `
            <div class="${phaseCls}">
                <div class="roadmap-phase-card" onclick="toggleRoadmapPhase('${phase.id}')">
                    <div class="roadmap-phase-top">
                        <span class="roadmap-phase-icon">${phase.icon}</span>
                        <span class="roadmap-phase-name">${phase.name}</span>
                        <span class="roadmap-phase-kw">${phase.kwRange}</span>
                    </div>
                    <div class="roadmap-phase-focus">${phase.focus}</div>
                    <div class="roadmap-phase-stats">
                        <span>\u23F1 ${phaseHours}h</span>
                        <span>\u2713 ${phaseDone}/${phaseTotal}</span>
                        ${isActive ? '<span style="color:var(--accent-primary);font-weight:700;">\u25C0 Aktuelle Phase</span>' : ''}
                    </div>
                    <div class="roadmap-phase-progress">
                        <div class="roadmap-phase-progress-fill" style="width:${phasePct}%"></div>
                    </div>
                </div>
                <div class="roadmap-phase-weeks" id="roadmap-phase-${phase.id}"${isActive ? ' style="max-height:1000px"' : ''}>`;

        // Week rows inside phase
        pw.forEach(({ week, idx, weekNum, weekDate }) => {
            const isCurrent = weekNum === currentWeekNum && weekDate.getFullYear() === currentYear;
            const weekCompletedCount = week.filter(w => completed[w.id]).length;
            let weekMin = 0;
            week.forEach(w => { weekMin += parseDuration(w.duration); });
            const weekH = Math.round(weekMin / 60 * 10) / 10;

            html += `
                    <div class="roadmap-week-row${isCurrent ? ' current' : ''}" onclick="goToWeek(${idx})">
                        <span class="roadmap-week-label">KW ${weekNum}</span>
                        <span class="roadmap-week-hours">${weekH}h</span>
                        <span class="roadmap-week-done">${weekCompletedCount}/${week.length}</span>
                    </div>`;
        });

        html += `
                </div>
            </div>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

function toggleRoadmapPhase(phaseId) {
    const el = document.getElementById(`roadmap-phase-${phaseId}`);
    if (!el) return;
    const isExpanded = el.style.maxHeight && el.style.maxHeight !== '0px';
    el.style.maxHeight = isExpanded ? '0px' : '1000px';
}

function goToWeek(idx) {
    selectedWeekIdx = idx;
    trainingView = 'week';
    document.querySelectorAll('.training-subnav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === 'week');
    });
    renderCurrentTrainingView();
}
