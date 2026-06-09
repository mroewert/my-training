// ── Fortschritt-Tab: Körper-Tracker, KFA-Schätzung, Meilensteine ──
// Portiert aus der Essensplaner-Flutter-App (lib/screens/fortschritt.dart).
// Daten in localStorage: gravel-koerper (Messungen[]), gravel-ziele (Ziele+Meilensteine).
// Datenmodell Messung: {id, datum:'YYYY-MM-DD', gewicht, bauchumfang|null, kfa|null, inbody:bool, notiz}
// Streaks bewusst NICHT portiert (hingen am Essensplaner-Wochenplan).

let koerperMessungen = [];
let koerperZiele = null;
let koerperGeladen = false;
let fortschrittZeitraum = '12w';   // '4w' | '12w' | 'all'
let messEditId = null;

// ── Persistenz ──
function loadKoerperData() {
    try { koerperMessungen = JSON.parse(localStorage.getItem('gravel-koerper')) || []; } catch (e) { koerperMessungen = []; }
    try { koerperZiele = JSON.parse(localStorage.getItem('gravel-ziele')); } catch (e) { koerperZiele = null; }
    // Einmalige Migration aus Essensplaner-Firestore (js/fortschritt-seed.js), nur wenn lokal noch leer
    if (!koerperMessungen.length && !koerperZiele && typeof FORTSCHRITT_SEED !== 'undefined' && FORTSCHRITT_SEED) {
        if (Array.isArray(FORTSCHRITT_SEED.messungen)) koerperMessungen = FORTSCHRITT_SEED.messungen;
        if (FORTSCHRITT_SEED.ziele) koerperZiele = FORTSCHRITT_SEED.ziele;
        if (koerperMessungen.length || koerperZiele) saveKoerperData();
    }
}
function saveKoerperData() {
    localStorage.setItem('gravel-koerper', JSON.stringify(koerperMessungen));
    localStorage.setItem('gravel-ziele', JSON.stringify(koerperZiele));
}

// ── Helpers ──
function fmtTag(iso) { const p = iso.split('-'); return `${p[2]}.${p[1]}.`; }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function addDaysISO(iso, days) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
function sortMess() { return [...koerperMessungen].sort((a, b) => a.datum.localeCompare(b.datum)); }
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ── KFA-Schätzung (Port) ──
// 60% des Gewichtsdeltas seit letzter InBody-Messung = Fett.
function berechneKfaSchaetzung() {
    if (!koerperMessungen.length) return koerperZiele ? koerperZiele.kfaStart : null;
    const sorted = sortMess();
    const inbody = sorted.filter(m => m.inbody && m.kfa != null);
    if (!inbody.length) return koerperZiele ? koerperZiele.kfaStart : null;
    const letztesInBody = inbody[inbody.length - 1];
    const aktuell = sorted[sorted.length - 1];
    if (aktuell.inbody && aktuell.kfa != null) return aktuell.kfa;
    const gewichtsDelta = aktuell.gewicht - letztesInBody.gewicht;
    let ffm = letztesInBody.gewicht * (1 - letztesInBody.kfa / 100);
    if (ffm <= 0) ffm = 60;
    return letztesInBody.kfa + (gewichtsDelta * 0.6) / ffm * 100;
}

// ── Meilenstein-Prüfung (Port) ──
function pruefeMeilensteine() {
    if (!koerperZiele || !Array.isArray(koerperZiele.meilensteine)) return false;
    const sorted = sortMess();
    if (!sorted.length) return false;
    const aktuell = sorted[sorted.length - 1];
    const geschaetzt = berechneKfaSchaetzung();
    const gemessen = (aktuell.inbody && aktuell.kfa != null) ? aktuell.kfa : null;
    let neu = false;
    koerperZiele.meilensteine.forEach(m => {
        if (m.erreicht) return;
        let erreicht = false;
        if (gemessen != null && gemessen <= m.kfaZiel) erreicht = true;
        if (!erreicht && geschaetzt != null && geschaetzt <= m.kfaZiel && aktuell.gewicht <= m.gewichtZiel) erreicht = true;
        if (erreicht) { m.erreicht = true; m.erreichtDatum = todayISO(); neu = true; }
    });
    return neu;
}

// ── Onboarding: Ziele anlegen ──
function startFortschritt() {
    const gewicht = parseFloat(document.getElementById('onb-gewicht').value) || 75;
    const kfaStart = parseFloat(document.getElementById('onb-kfastart').value) || 20;
    const kfaZiel = parseFloat(document.getElementById('onb-kfaziel').value) || 15;
    const start = todayISO();
    const mDefs = [
        { id: 'm1', name: 'Erste Erfolge', woche: 5 },
        { id: 'm2', name: 'Halbzeit', woche: 10 },
        { id: 'm3', name: 'Auf Kurs', woche: 14 },
        { id: 'm4', name: 'Ziel erreicht!', woche: 19 },
    ];
    const meilensteine = mDefs.map(m => {
        const f = m.woche / 19;
        return {
            id: m.id, name: m.name, woche: m.woche,
            datum: addDaysISO(start, m.woche * 7),
            kfaZiel: +(kfaStart - (kfaStart - kfaZiel) * f).toFixed(1),
            gewichtZiel: +(gewicht - 0.15 * m.woche).toFixed(1),
            erreicht: false, erreichtDatum: null,
        };
    });
    koerperZiele = { kfaStart, kfaZiel, kfaStartDatum: start, gewichtStart: gewicht, zielDatum: addDaysISO(start, 19 * 7), meilensteine };
    koerperMessungen.push({ id: 'm' + Date.now(), datum: start, gewicht, bauchumfang: null, kfa: kfaStart, inbody: true, notiz: 'Startwert' });
    saveKoerperData();
    renderFortschritt();
}

// ── Messung erfassen/bearbeiten (Modal #modal-messung) ──
function openMessung(id) {
    messEditId = id || null;
    const m = id ? koerperMessungen.find(x => x.id === id) : null;
    document.getElementById('mess-datum').value = m ? m.datum : todayISO();
    document.getElementById('mess-gewicht').value = m ? m.gewicht : '';
    document.getElementById('mess-bauch').value = (m && m.bauchumfang != null) ? m.bauchumfang : '';
    document.getElementById('mess-inbody').checked = m ? !!m.inbody : false;
    document.getElementById('mess-kfa').value = (m && m.kfa != null) ? m.kfa : '';
    document.getElementById('mess-notiz').value = m ? (m.notiz || '') : '';
    toggleInbodyField();
    document.getElementById('mess-delete-btn').style.display = id ? 'block' : 'none';
    document.querySelector('#modal-messung .modal-title').textContent = id ? 'Messung bearbeiten' : 'Messung eintragen';
    openModal('modal-messung');
}
function closeMessung() { closeModal('modal-messung'); messEditId = null; }
function toggleInbodyField() {
    document.getElementById('mess-kfa').style.display = document.getElementById('mess-inbody').checked ? 'block' : 'none';
}
function saveMessung() {
    const datum = document.getElementById('mess-datum').value || todayISO();
    const gewicht = parseFloat(document.getElementById('mess-gewicht').value);
    if (isNaN(gewicht)) { alert('Bitte ein Gewicht eintragen.'); return; }
    const bauchRaw = document.getElementById('mess-bauch').value;
    const bauchumfang = bauchRaw === '' ? null : parseFloat(bauchRaw);
    const inbody = document.getElementById('mess-inbody').checked;
    const kfaRaw = document.getElementById('mess-kfa').value;
    const kfa = (inbody && kfaRaw !== '') ? parseFloat(kfaRaw) : null;
    const notiz = document.getElementById('mess-notiz').value.trim();
    const eintrag = { datum, gewicht, bauchumfang, kfa, inbody: inbody && kfa != null, notiz };
    if (messEditId) {
        const m = koerperMessungen.find(x => x.id === messEditId);
        Object.assign(m, eintrag);
    } else {
        koerperMessungen.push(Object.assign({ id: 'm' + Date.now() }, eintrag));
    }
    const neu = pruefeMeilensteine();
    saveKoerperData();
    closeMessung();
    renderFortschritt();
    if (neu) feiereMeilenstein();
}
function deleteMessung() {
    if (!messEditId) return;
    if (!confirm('Diese Messung löschen?')) return;
    koerperMessungen = koerperMessungen.filter(x => x.id !== messEditId);
    saveKoerperData();
    closeMessung();
    renderFortschritt();
}
function setFsZeitraum(z) { fortschrittZeitraum = z; renderFortschritt(); }

function feiereMeilenstein() {
    const t = document.createElement('div');
    t.className = 'fs-toast';
    t.textContent = '🎉 Meilenstein erreicht!';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ── Render ──
function renderFortschritt() {
    if (!koerperGeladen) { loadKoerperData(); koerperGeladen = true; }
    const c = document.getElementById('fortschritt-content');
    if (!c) return;
    if (!koerperZiele) { c.innerHTML = renderOnboarding(); return; }

    const aktuellerKfa = berechneKfaSchaetzung();
    const sorted = sortMess();
    const istGeschaetzt = sorted.length > 0 && !sorted[sorted.length - 1].inbody;

    c.innerHTML =
        renderProgressCard(aktuellerKfa, istGeschaetzt) +
        renderMilestones() +
        renderControls() +
        renderChart() +
        renderMessungenListe();
}

function renderOnboarding() {
    return `<div class="fs-card">
        <div class="fs-card-title">🎯 Ziele festlegen</div>
        <p class="fs-sub" style="margin:6px 0 14px;">Trage deine Startwerte ein, um Körper-Fortschritt und Meilensteine zu tracken.</p>
        <div class="form-group"><label class="form-label">Gewicht (kg)</label><input type="number" step="0.1" inputmode="decimal" class="form-input" id="onb-gewicht" placeholder="z.B. 75"></div>
        <div class="form-row">
            <div class="form-group"><label class="form-label">KFA Start (%)</label><input type="number" step="0.1" inputmode="decimal" class="form-input" id="onb-kfastart" placeholder="z.B. 20"></div>
            <div class="form-group"><label class="form-label">KFA Ziel (%)</label><input type="number" step="0.1" inputmode="decimal" class="form-input" id="onb-kfaziel" value="15"></div>
        </div>
        <button class="btn-primary" onclick="startFortschritt()">Starten</button>
    </div>`;
}

function renderProgressCard(kfa, geschaetzt) {
    const kS = koerperZiele.kfaStart, kZ = koerperZiele.kfaZiel;
    if (kfa == null) return '';
    const range = kS - kZ;
    const frac = range > 0 ? Math.max(0, Math.min(1, (kS - kfa) / range)) : 0;
    const pct = Math.round(frac * 100);
    const col = frac < 0.33 ? 'var(--status-red)' : frac < 0.66 ? 'var(--accent-primary)' : 'var(--status-green)';
    return `<div class="fs-card">
        <div class="fs-card-head"><span class="fs-goal">Ziel: ${kZ.toFixed(0)}% KFA</span><span class="fs-big" style="color:${col}">${pct}%</span></div>
        <div class="fs-bar"><div class="fs-bar-fill" style="width:${(frac * 100).toFixed(1)}%;background:${col}"></div></div>
        <div class="fs-sub">Aktuell: ~${kfa.toFixed(1)}% ${geschaetzt ? '(geschätzt)' : '(InBody)'} &middot; Start ${kS.toFixed(1)}%</div>
    </div>`;
}

function renderMilestones() {
    const ms = koerperZiele.meilensteine || [];
    if (!ms.length) return '';
    const emojis = ['⭐', '⭐', '🚴', '🏆'];
    let inner = `<div class="fs-ms-pt reached"><div class="fs-ms-emoji">🏁</div><div class="fs-ms-kfa">${koerperZiele.kfaStart.toFixed(1)}%</div><div class="fs-ms-date">Start</div></div>`;
    ms.forEach((m, i) => {
        const reached = !!m.erreicht;
        const aktiv = !reached && (i === 0 || ms[i - 1].erreicht);
        inner += `<div class="fs-ms-line ${reached ? 'reached' : ''}"></div>
            <div class="fs-ms-pt ${reached ? 'reached' : aktiv ? 'active' : ''}">
                <div class="fs-ms-emoji">${reached ? '✅' : (emojis[i] || '⭐')}</div>
                <div class="fs-ms-kfa">${m.kfaZiel.toFixed(1)}%</div>
                <div class="fs-ms-date">${fmtTag(m.datum)}</div>
            </div>`;
    });
    return `<div class="fs-card"><div class="fs-card-title">Meilensteine</div><div class="fs-ms-scroll"><div class="fs-ms">${inner}</div></div></div>`;
}

function renderControls() {
    const f = fortschrittZeitraum;
    const btn = (z, label) => `<button class="fs-fbtn ${f === z ? 'active' : ''}" onclick="setFsZeitraum('${z}')">${label}</button>`;
    return `<div class="fs-controls">
        <button class="btn-primary fs-add" onclick="openMessung()">+ Messung eintragen</button>
        <div class="fs-filter">${btn('4w', '4W')}${btn('12w', '12W')}${btn('all', 'Alles')}</div>
    </div>`;
}

function renderChart() {
    if (koerperMessungen.length < 2) {
        return `<div class="fs-card fs-empty">${koerperMessungen.length ? 'Mindestens 2 Messungen für den Verlauf nötig.' : 'Noch keine Messungen vorhanden.'}</div>`;
    }
    const mess = sortMess();
    const jetzt = todayISO();
    let cutoff = null;
    if (fortschrittZeitraum === '4w') cutoff = addDaysISO(jetzt, -28);
    if (fortschrittZeitraum === '12w') cutoff = addDaysISO(jetzt, -84);
    let g = cutoff ? mess.filter(m => m.datum > cutoff) : mess;
    if (g.length < 2) g = mess.slice(-10);

    const W = 320, H = 150, padL = 4, padR = 4, padT = 10, padB = 12;
    const first = g[0].datum;
    const maxX = Math.max(1, daysBetween(first, g[g.length - 1].datum));
    const gw = g.map(m => m.gewicht);
    let minG = Math.min(...gw) - 1, maxG = Math.max(...gw) + 1;
    if (minG === maxG) { minG -= 1; maxG += 1; }
    const px = x => padL + (x / maxX) * (W - padL - padR);
    const py = v => padT + (1 - (v - minG) / (maxG - minG)) * (H - padT - padB);

    const wpts = g.map(m => `${px(daysBetween(first, m.datum)).toFixed(1)},${py(m.gewicht).toFixed(1)}`).join(' ');

    // Bauchumfang auf Gewichts-Skala normalisieren
    const bMess = g.filter(m => m.bauchumfang != null);
    const hasB = bMess.length >= 2;
    let bpoly = '';
    if (hasB) {
        const bb = bMess.map(m => m.bauchumfang);
        let minB = Math.min(...bb) - 1, maxB = Math.max(...bb) + 1;
        if (minB === maxB) { minB -= 1; maxB += 1; }
        const bpts = bMess.map(m => {
            const norm = minG + (m.bauchumfang - minB) / (maxB - minB) * (maxG - minG);
            return `${px(daysBetween(first, m.datum)).toFixed(1)},${py(norm).toFixed(1)}`;
        }).join(' ');
        bpoly = `<polyline points="${bpts}" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-dasharray="4 3"/>`;
    }

    let dots = '';
    g.forEach(m => {
        const x = px(daysBetween(first, m.datum)).toFixed(1), y = py(m.gewicht).toFixed(1);
        if (m.inbody) dots += `<circle cx="${x}" cy="${y}" r="4" fill="var(--status-yellow)" stroke="var(--bg-deep)" stroke-width="1"/>`;
        else dots += `<circle cx="${x}" cy="${y}" r="2.5" fill="var(--accent-secondary)"/>`;
    });

    const svg = `<svg viewBox="0 0 ${W} ${H}" class="fs-svg"><polyline points="${wpts}" fill="none" stroke="var(--accent-secondary)" stroke-width="2.5"/>${bpoly}${dots}</svg>`;

    return `<div class="fs-card">
        <div class="fs-legend">
            <span class="fs-lg"><i style="background:var(--accent-secondary)"></i>Gewicht</span>
            ${hasB ? '<span class="fs-lg"><i style="background:var(--accent-primary)"></i>Bauchumfang</span>' : ''}
            <span class="fs-lg"><i style="background:var(--status-yellow);border-radius:50%"></i>InBody</span>
        </div>
        <div class="fs-chart-wrap">
            <div class="fs-yax"><span>${maxG.toFixed(1)}</span><span>${minG.toFixed(1)}</span></div>
            ${svg}
        </div>
        <div class="fs-xax"><span>${fmtTag(g[0].datum)}</span><span>${fmtTag(g[g.length - 1].datum)}</span></div>
    </div>`;
}

function renderMessungenListe() {
    if (!koerperMessungen.length) return '';
    const list = [...koerperMessungen].sort((a, b) => b.datum.localeCompare(a.datum));
    const rows = list.map(m => `<div class="fs-row" onclick="openMessung('${m.id}')">
        <div class="fs-row-ico">${m.inbody ? '⭐' : '⚖️'}</div>
        <div class="fs-row-main">
            <div class="fs-row-top">${m.gewicht.toFixed(1)} kg${m.kfa != null ? ` &middot; ${m.kfa.toFixed(1)}% KFA` : ''}</div>
            <div class="fs-row-sub">${fmtTag(m.datum)}${m.datum.slice(0, 4)}${m.bauchumfang != null ? ` &middot; ${m.bauchumfang.toFixed(1)} cm` : ''}${m.notiz ? ` &middot; ${escapeHtml(m.notiz)}` : ''}</div>
        </div>
        <div class="fs-row-chev">›</div>
    </div>`).join('');
    return `<div class="fs-card"><div class="fs-card-title">Alle Messungen (${list.length})</div>${rows}</div>`;
}
