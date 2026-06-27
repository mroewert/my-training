// ── Reha-Tab: Fuß-Reha-Übungen (Beweglichkeit & Stabilität) ──
// Statische Referenz-Ansicht. Quelle: Fuß-OP/Reha-Stufe1.md + Rehabilitations-Übungsprogramm_v2.md.
// Bilder web-optimiert in img/reha/. Keine persönlichen Daten — reine Übungs-Anleitung.
// Erweiterung um Stufe 2/3: weitere Objekte in REHA_EXERCISES ergänzen + Bilder nach img/reha/.

const REHA_STAND = '27.06.2026 (Tag 19 nach OP)';

const REHA_STUFE = {
    nummer: 1,
    titel: 'Beweglichkeit & Stabilität',
    intro: 'Aktive Reha nach der Fuß-OP. Steuergröße ist Schmerzfreiheit <b>ohne</b> Schmerzmittel — erst auf Stufe 2 hochschalten, wenn alle Übungen hier schmerzfrei sitzen, das Hämatom weg ist und der Einbeinstand 3×30&nbsp;s sicher steht.',
    tagesdosis: '~15 min/Tag · Mobilität täglich · Schwerpunkt (Stabilität + Kraft) an Mo/Mi/Fr',
};

const REHA_KAT = {
    mob:   { label: 'Mobilität',       freq: 'täglich',        color: 'var(--accent-secondary)' },
    stab:  { label: 'Stabilität',      freq: 'jeden 1.–2. Tag', color: 'var(--status-green)' },
    kraft: { label: 'Kraft (sanft)',   freq: 'jeden 2. Tag',   color: 'var(--accent-primary)' },
    regen: { label: 'Regeneration',    freq: 'täglich',        color: '#A78BFA' },
};

const REHA_EXERCISES = [
    {
        kat: 'mob', img: 'reha-mob-dorsalext.jpg', nr: '1.1',
        titel: 'Sprunggelenksmobilisation (Dorsalextension)', dosis: '3 × 15',
        ziel: 'Beweglichkeit nach vorn (Knie über Zeh) — fürs Gehen und Treppensteigen.',
        schritte: [
            'Sitzen oder stehen, Fuß flach auf den Boden.',
            'Knie langsam nach vorn über die Zehenspitzen schieben.',
            'Ferse bleibt am Boden (der ganze Trick). Langsam zurück.',
            '15×, 3 Sätze.',
        ],
        tipp: 'Vorderfuß auf ein Buch stellen → mehr Bewegungsumfang.',
        warnung: null,
    },
    {
        kat: 'mob', img: 'reha-mob-alphabet.jpg', nr: '1.2',
        titel: 'Alphabet schreiben', dosis: '1 × A–Z',
        ziel: 'Alle Bewegungsrichtungen in einem Rutsch.',
        schritte: [
            'Sitzen, Bein anheben, Oberschenkel bleibt ruhig.',
            'Mit der großen Zehe als „Stift" das Alphabet A–Z in die Luft schreiben.',
            'Groß und deutlich schreiben — mehr Größe = mehr Mobilisation.',
        ],
        tipp: 'Nur der Fuß bewegt sich, nicht das ganze Bein.',
        warnung: null,
    },
    {
        kat: 'mob', img: 'reha-mob-subtalar.jpg', nr: '1.3',
        titel: 'Subtalare Mobilisation (Inversion/Eversion)', dosis: '2 × 10 je Richtung',
        ziel: 'Das früher verschraubte untere Sprunggelenk wach machen.',
        schritte: [
            'Sitzen, Fuß bequem aufstützen.',
            'Eine Hand umfasst die Ferse fest und hält sie fix.',
            'Mit der anderen Hand den Vorderfuß langsam nach innen (Inversion) und außen (Eversion) kippen.',
            '10× pro Richtung, 2 Sätze.',
        ],
        tipp: 'Sanft, schmerzfrei, nie ruckartig — geführte Mobilisation, kein Krafttraining.',
        warnung: null,
    },
    {
        kat: 'stab', img: 'reha-stab-einbeinstand.jpg', nr: '2.2',
        titel: 'Einbeinstand auf festem Boden', dosis: '3 × 30 s',
        ziel: 'Propriozeption + Aktivierung der gesamten Fußmuskulatur.',
        schritte: [
            'Barfuß auf dem operierten Bein, anderes Bein leicht anheben.',
            'Arme locker seitlich. 30 s halten, 3 Sätze.',
            'Immer neben Wand/Stuhl zum Abfangen.',
        ],
        tipp: 'Im Bild steht die Person auf einem Kissen — das ist erst Stufe 2. Du startest auf festem Boden.',
        warnung: null,
    },
    {
        kat: 'stab', img: 'reha-stab-kurzerfuss.jpg', nr: '2.3',
        titel: 'Kurzer-Fuß nach Janda', dosis: '3 × 10, je 5 s halten',
        ziel: 'Tiefe Fußmuskulatur + Tibialis posterior — baut das Längsgewölbe aktiv auf.',
        schritte: [
            'Anfangs im Sitzen, Fuß flach am Boden.',
            'Fußgewölbe aktiv nach oben ziehen — Vorstellung: Ballen Richtung Ferse ziehen, Fuß wird „kürzer".',
            'Zehen lang lassen — NICHT krallen (häufigster Fehler).',
            '5 s halten, lösen. 10×, 3 Sätze. Sitzt es → im Stehen.',
        ],
        tipp: null,
        warnung: null,
    },
    {
        kat: 'kraft', img: 'reha-kraft-wadenheben.jpg', nr: '4.1',
        titel: 'Wadenheben beidbeinig', dosis: '3 × 10',
        ziel: 'Wade & Achillessehne kräftigen — kontrolliert und sicher.',
        schritte: [
            'Am Geländer/an der Wand festhalten.',
            'Mit beiden Füßen langsam auf die Zehenspitzen hoch.',
            'Langsam ab. Tempo: 3 s hoch, 3 s runter.',
            '10×, 3 Sätze. Anfangs auf flachem Boden statt auf der Treppenkante.',
        ],
        tipp: 'In Stufe 1 beidbeinig, ohne tiefes Absenken. Einbeinig/exzentrisch („Stretch") kommt erst in Stufe 2.',
        warnung: null,
    },
    {
        kat: 'regen', img: 'reha-regen-faszienball.jpg', nr: '5.1',
        titel: 'Faszienball Fußsohle', dosis: '2 min/Fuß',
        ziel: 'Verklebungen lösen, Durchblutung fördern.',
        schritte: [
            'Sitzen/stehen, Igel-/Faszienball unter die Fußsohle.',
            'Mit leichtem Druck von der Ferse zu den Zehen abrollen.',
            'Schmerzpunkte 10–15 s mit konstantem Druck halten.',
            'Morgens besonders wirksam; auch am gesunden Fuß.',
        ],
        tipp: null,
        warnung: 'Nicht direkt auf Narbe/Hämatom rollen, solange der Bluterguss da ist.',
    },
];

function renderReha() {
    const c = document.getElementById('reha-content');
    if (!c) return;

    const head = `<div class="reha-head">
        <div class="reha-stufe-badge">Stufe ${REHA_STUFE.nummer}</div>
        <h2 class="reha-title">${REHA_STUFE.titel}</h2>
        <p class="reha-intro">${REHA_STUFE.intro}</p>
        <div class="reha-dosis">🗓️ ${REHA_STUFE.tagesdosis}</div>
        <div class="reha-stand">Stand: ${REHA_STAND} · Quelle: Reha-Übungsprogramm (Roland-Klinik)</div>
    </div>`;

    // Nach Kategorie in Plan-Reihenfolge gruppieren
    const order = ['mob', 'stab', 'kraft', 'regen'];
    let body = '';
    order.forEach(katKey => {
        const kat = REHA_KAT[katKey];
        const items = REHA_EXERCISES.filter(e => e.kat === katKey);
        if (!items.length) return;
        body += `<div class="reha-kat-head" style="--kat:${kat.color}">
            <span class="reha-kat-dot"></span>
            <span class="reha-kat-label">${kat.label}</span>
            <span class="reha-kat-freq">${kat.freq}</span>
        </div>`;
        items.forEach(e => { body += rehaCard(e, kat.color); });
    });

    const foot = `<div class="reha-foot">
        <div class="reha-foot-title">⚠️ Zurückrudern bei</div>
        <ul>
            <li>Schmerz am <b>Innenknöchel</b> (Tibialis-posterior-Verlauf) bei/nach Übungen → Belastung runter.</li>
            <li>Schwellung, die wiederkommt, oder Hämatom, das wieder zunimmt.</li>
            <li>Schmerz, der nur mit Schmerzmittel weggeht → noch nicht zur nächsten Stufe.</li>
        </ul>
        <div class="reha-foot-note">Reha-Geduld vor Ungeduld. Finale Freigabe der höheren Stufen gehört ärztlich/physiotherapeutisch bestätigt. Diese Ansicht ersetzt keine ärztliche Beratung.</div>
    </div>`;

    c.innerHTML = head + body + foot;
}

function rehaCard(e, color) {
    const kat = REHA_KAT[e.kat];
    const steps = e.schritte.map(s => `<li>${s}</li>`).join('');
    const tipp = e.tipp ? `<div class="reha-tipp">💡 ${e.tipp}</div>` : '';
    const warn = e.warnung ? `<div class="reha-warn">⚠️ ${e.warnung}</div>` : '';
    return `<div class="reha-card" style="--kat:${color}">
        <img class="reha-img" src="img/reha/${e.img}" alt="${e.titel}" loading="lazy">
        <div class="reha-card-body">
            <div class="reha-card-head">
                <span class="reha-card-title">${e.titel}</span>
                <span class="reha-dose-badge">${e.dosis}</span>
            </div>
            <div class="reha-ziel">${e.ziel}</div>
            <ol class="reha-steps">${steps}</ol>
            ${tipp}
            ${warn}
        </div>
    </div>`;
}
