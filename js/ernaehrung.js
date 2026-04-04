// ============================================
// ERNAEHRUNG.JS – Ernährungs-Tab mit statischen Coach-Daten
// ============================================

let selectedDayType = 'training'; // 'rest' | 'milon' | 'training'

// ============================================
// NUTRITION DATA (aus AI Coach MD-Dateien)
// ============================================
const nutritionData = {
    fruehstueck: {
        icon: '\uD83E\uDD50',
        title: 'Fr\u00FChst\u00FCck',
        training: {
            subtitle: '2 Vollkornbr\u00F6tchen mit Belag',
            kcal: 620, protein: 38, carbs: 55, fat: 26,
            components: [
                { name: '2 Vollkorn-Aufbackbr\u00F6tchen (4 H\u00E4lften)', detail: '' },
                { name: '2\u00D7 Harzer K\u00E4se', detail: 'Top-Tier Protein' },
                { name: '1\u00D7 Lachs/Forelle (G&G)', detail: 'Omega-3' },
                { name: '1\u00D7 Avocado oder Hummus', detail: 'Gesunde Fette' },
                { name: 'Butter nur unter Avocado/Hummus', detail: '' },
            ],
            tips: [
                '<strong>B\u00FCrotage:</strong> 1 Br\u00F6tchen morgens (Harzer) + 1 um 10 Uhr (Fisch/Avocado)',
                '<strong>Harzer K\u00E4se:</strong> ~30g Protein/100g bei <1% Fett \u2014 immer mindestens 2 H\u00E4lften damit belegen',
            ],
            drink: '1 Tasse schwarzer Tee + 3g Creatin \u00B7 0,8L Wasser',
        },
        rest: {
            subtitle: '1 Vollkornbr\u00F6tchen + Eier',
            kcal: 390, protein: 32, carbs: 27, fat: 18,
            components: [
                { name: '1 Vollkorn-Aufbackbr\u00F6tchen (2 H\u00E4lften)', detail: '' },
                { name: '1\u00D7 Harzer K\u00E4se', detail: '' },
                { name: '1\u00D7 Lachs/Forelle', detail: '' },
                { name: 'Butter weglassen', detail: '' },
                { name: '1\u20132 gekochte Eier', detail: '+12\u201314g Protein' },
            ],
            tips: [
                '<strong>Carb Cycling:</strong> Nur 1 Br\u00F6tchen statt 2 \u2014 spart ~145 kcal und ~26g KH',
            ],
            drink: '1 Tasse schwarzer Tee + 3g Creatin \u00B7 0,8L Wasser',
        },
        milon: null, // same as training
    },

    mittagessen: {
        icon: '\uD83E\uDD63',
        title: 'Mittagessen',
        timing: '~13:00 Uhr',
        training: {
            subtitle: 'Skyr + Banane + M\u00FCsli + Walnüsse',
            kcal: 560, protein: 63, carbs: 57, fat: 9,
            components: [
                { name: '400g G&G Skyr Natur', detail: '44g Protein' },
                { name: '~75ml Milch 1,5%', detail: 'zum Verd\u00FCnnen' },
                { name: '1 Banane', detail: 'Kalium + schnelle Energie' },
                { name: '20g K\u00F6lln Fr\u00FCchte M\u00FCsli', detail: 'ohne Zuckerzusatz' },
                { name: '10g Waln\u00FCsse', detail: 'Omega-3 (ALA)' },
                { name: '15g ProFuel 8K Neutral', detail: '+12,6g Protein' },
            ],
            tips: [
                '<strong>M\u00FCsli-Tipp:</strong> 20g K\u00F6lln + 10g Waln\u00FCsse = Crunch + Omega-3',
            ],
            drink: '~0,4L Wasser zum Essen',
        },
        rest: {
            subtitle: 'Skyr + Heidelbeeren + M\u00FCsli + Walnüsse',
            kcal: 480, protein: 62, carbs: 37, fat: 9,
            components: [
                { name: '400g G&G Skyr Natur', detail: '44g Protein' },
                { name: '~75ml Milch 1,5%', detail: '' },
                { name: '~80g Heidelbeeren (frisch/TK)', detail: 'weniger KH, mehr Antioxidantien' },
                { name: '20g K\u00F6lln Fr\u00FCchte M\u00FCsli', detail: '' },
                { name: '10g Waln\u00FCsse', detail: '' },
                { name: '15g ProFuel 8K Neutral', detail: '' },
            ],
            tips: [
                '<strong>Carb Cycling:</strong> Beeren statt Banane \u2014 nur 7g KH statt 27g, niedrigerer GI',
            ],
            drink: '~0,4L Wasser zum Essen',
        },
        milon: null,
    },

    snacks: {
        icon: '\uD83C\uDF4E',
        title: 'Snacks & Nachmittag',
        training: {
            subtitle: 'Pre-Ride: MNSTRY Bar + Power Carb',
            kcal: 240, protein: 5, carbs: 40, fat: 6,
            timing: '~20 Min. vor Losfahren',
            components: [
                { name: 'MNSTRY Porridge/Performance Bar', detail: '~20 Min. vor Start' },
                { name: '~100ml MNSTRY Power Carb', detail: '~5 Min. vor Start' },
            ],
            tips: [
                '<strong>Gut Training:</strong> Rennprodukte im Training testen \u2014 keine Überraschungen am Renntag',
                '<strong>Timing:</strong> Riegel 20 Min. vorher statt direkt davor \u2014 bessere Aufnahme',
            ],
        },
        rest: {
            subtitle: '1 Apfel',
            kcal: 94, protein: 0.5, carbs: 23, fat: 0.3,
            components: [
                { name: '1 Apfel (~180g)', detail: 'Ballaststoffe + Polyphenole' },
            ],
            tips: [
                '<strong>Perfekt f\u00FCr Ruhetage:</strong> Bewusstes Kaloriendefizit, kein Trainingsreiz = keine Extra-Kalorien n\u00F6tig',
            ],
        },
        milon: {
            subtitle: 'Pre-Workout-Snack (Rotation)',
            kcal: 160, protein: 16, carbs: 10, fat: 7,
            timing: '~16:30 Uhr (90 Min. vor Training)',
            components: [
                { name: 'Option 1: G&G Proteinjoghurt (200g)', detail: '120 kcal \u00B7 20g P' },
                { name: 'Option 2: Protein-Drink (YoPro/EDEKA)', detail: '150 kcal \u00B7 25g P' },
                { name: 'Option 3: 2 gekochte Eier', detail: '150 kcal \u00B7 14g P' },
                { name: 'Option 4: MNSTRY Bar', detail: '200 kcal \u00B7 10g P' },
                { name: 'Option 5: 50g Gouda mittelalt', detail: '180 kcal \u00B7 13g P' },
            ],
            tips: [
                '<strong>Rotation:</strong> Jede Woche eine andere Option \u2014 keine Langeweile',
                '<strong>Warum:</strong> 5h ohne Nahrung vor Krafttraining = suboptimal f\u00FCr Muskelaufbau',
            ],
        },
    },
};

// Shopping list data
const shoppingData = [
    {
        category: 'Fr\u00FChst\u00FCck',
        items: [
            'Coppenrath & Wiese Vollkorn-Aufbackbr\u00F6tchen',
            'Loose Harzer Roller (K\u00FChltheke)',
            'G&G Lachs/Forelle',
            'Avocados (frisch)',
            'EDEKA Bio Hummus Natur',
            'Eier (f\u00FCr Ruhetage)',
            'EDEKA Bio Frischk\u00E4se Halbfettstufe (optional)',
        ]
    },
    {
        category: 'Mittagessen',
        items: [
            'G&G Skyr Natur (400g)',
            'K\u00F6lln Fr\u00FCchte M\u00FCsli ohne Zuckerzusatz',
            'Waln\u00FCsse',
            'Heidelbeeren TK (f\u00FCr Ruhetage)',
            'Bananen',
            'Milch 1,5%',
        ]
    },
    {
        category: 'Snacks (Milon-Tage)',
        items: [
            'G&G Proteinjoghurt (diverse Sorten)',
            'Protein-Drink (YoPro oder EDEKA High Protein)',
            'G&G Gouda mittelalt (250g Block)',
        ]
    },
    {
        category: 'Snacks (Rad-Tage)',
        items: [
            'MNSTRY Porridge/Performance Bars (nachbestellen)',
            'MNSTRY Power Carb',
        ]
    },
    {
        category: 'Immer vorr\u00E4tig',
        items: [
            'Schwarzer Tee',
            'Creatin',
            'ProFuel 8K Neutral',
            'Billie Green Aufschnitt (max. 1 H\u00E4lfte)',
            'Butter (reduziert)',
        ]
    },
];

// ============================================
// RENDER
// ============================================
function renderErnaehrung() {
    const container = document.getElementById('ernaehrung-content');
    if (!container) return;

    let html = '<div class="ernaehrung-container">';

    // Day type toggle
    html += `
        <div class="daytype-toggle">
            <button class="daytype-btn${selectedDayType === 'rest' ? ' active' : ''}" onclick="switchDayType('rest')">
                <span class="daytype-icon">\uD83D\uDECB\uFE0F</span>Ruhetag
            </button>
            <button class="daytype-btn${selectedDayType === 'milon' ? ' active' : ''}" onclick="switchDayType('milon')">
                <span class="daytype-icon">\uD83C\uDFCB\uFE0F</span>Milon-Tag
            </button>
            <button class="daytype-btn${selectedDayType === 'training' ? ' active' : ''}" onclick="switchDayType('training')">
                <span class="daytype-icon">\uD83D\uDEB4</span>Rad-Tag
            </button>
        </div>`;

    // Daily macro summary
    html += renderDailyMacros();

    // Meal cards
    html += renderMealCard('fruehstueck');
    html += renderMealCard('mittagessen');
    html += renderMealCard('snacks');

    // Shopping list
    html += renderShoppingList();

    html += '</div>';
    container.innerHTML = html;
}

function renderDailyMacros() {
    let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;

    ['fruehstueck', 'mittagessen', 'snacks'].forEach(meal => {
        const data = getMealData(meal);
        if (data) {
            totalKcal += data.kcal;
            totalP += data.protein;
            totalC += data.carbs;
            totalF += data.fat;
        }
    });

    return `
        <div class="daily-macros">
            <div class="daily-macros-title">Tagessumme (ohne Abendessen)</div>
            <div class="daily-macros-grid">
                <div class="daily-macro-item">
                    <div class="macro-value">${Math.round(totalKcal)}</div>
                    <div class="macro-label">kcal</div>
                </div>
                <div class="daily-macro-item">
                    <div class="macro-value">${Math.round(totalP)}g</div>
                    <div class="macro-label">Protein</div>
                </div>
                <div class="daily-macro-item">
                    <div class="macro-value">${Math.round(totalC)}g</div>
                    <div class="macro-label">Kohlenhydrate</div>
                </div>
                <div class="daily-macro-item">
                    <div class="macro-value">${Math.round(totalF)}g</div>
                    <div class="macro-label">Fett</div>
                </div>
            </div>
        </div>`;
}

function getMealData(mealKey) {
    const meal = nutritionData[mealKey];
    if (!meal) return null;
    // milon fallback to training for meals that don't differentiate
    let data = meal[selectedDayType];
    if (!data && selectedDayType === 'milon') data = meal['training'];
    return data;
}

function renderMealCard(mealKey) {
    const meal = nutritionData[mealKey];
    const data = getMealData(mealKey);
    if (!data) return '';

    const maxMacro = Math.max(data.protein, data.carbs, data.fat);

    let html = `
        <div class="meal-card" id="meal-${mealKey}">
            <div class="meal-card-header" onclick="toggleMealCard('${mealKey}')">
                <div class="meal-card-icon">${meal.icon}</div>
                <div class="meal-card-info">
                    <div class="meal-card-title">${meal.title}</div>
                    <div class="meal-card-subtitle">${data.subtitle}</div>
                </div>
                <div class="meal-card-macros">
                    <span class="macro-badge kcal">${data.kcal}</span>
                    <span class="macro-badge protein">${data.protein}g P</span>
                </div>
                <span class="meal-card-chevron">\u25BC</span>
            </div>
            <div class="meal-card-detail">
                <div class="meal-detail-content">`;

    // Timing badge
    if (data.timing) {
        html += `<span class="timing-badge">\u23F0 ${data.timing}</span>`;
    }

    // Macro bars
    html += `<div class="macro-bar-section">`;
    html += renderMacroBar('P', data.protein, maxMacro, 'protein');
    html += renderMacroBar('KH', data.carbs, maxMacro, 'carbs');
    html += renderMacroBar('F', data.fat, maxMacro, 'fat');
    html += `</div>`;

    // Components
    html += `<div class="component-list">`;
    data.components.forEach(c => {
        html += `
            <div class="component-item">
                <span class="component-name">${c.name}</span>
                ${c.detail ? `<span class="component-detail">${c.detail}</span>` : ''}
            </div>`;
    });
    html += `</div>`;

    // Tips
    if (data.tips) {
        data.tips.forEach(tip => {
            html += `<div class="meal-tip">${tip}</div>`;
        });
    }

    // Drink info
    if (data.drink) {
        html += `<div class="drink-info"><span class="drink-icon">\uD83D\uDCA7</span> ${data.drink}</div>`;
    }

    html += `
                </div>
            </div>
        </div>`;

    return html;
}

function renderMacroBar(label, value, maxValue, cssClass) {
    const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return `
        <div class="macro-bar-row">
            <span class="macro-bar-label">${label}</span>
            <div class="macro-bar-track">
                <div class="macro-bar-fill ${cssClass}" style="width:${pct}%"></div>
            </div>
            <span class="macro-bar-value">${Math.round(value)}g</span>
        </div>`;
}

function renderShoppingList() {
    let html = `
        <div class="shopping-card" id="shopping-card">
            <div class="shopping-header" onclick="toggleShoppingCard()">
                <div class="meal-card-icon">\uD83D\uDED2</div>
                <div class="meal-card-info">
                    <div class="meal-card-title">Einkaufsliste</div>
                    <div class="meal-card-subtitle">Alle Produkte (Edeka)</div>
                </div>
                <span class="meal-card-chevron">\u25BC</span>
            </div>
            <div class="shopping-detail">
                <div class="meal-detail-content" style="border-top:1px solid var(--border);">`;

    shoppingData.forEach(cat => {
        html += `
            <div class="shopping-category">
                <div class="shopping-category-title">${cat.category}</div>`;
        cat.items.forEach((item, idx) => {
            const itemId = `shop-${cat.category.replace(/[^a-z]/gi, '')}-${idx}`;
            html += `
                <div class="shopping-item" id="${itemId}" onclick="toggleShoppingItem('${itemId}')">
                    <span class="check-icon"></span>
                    <span>${item}</span>
                </div>`;
        });
        html += `</div>`;
    });

    html += `
                </div>
            </div>
        </div>`;

    return html;
}

// ============================================
// INTERACTIONS
// ============================================
function switchDayType(type) {
    selectedDayType = type;
    renderErnaehrung();
}

function toggleMealCard(mealKey) {
    const card = document.getElementById('meal-' + mealKey);
    if (card) card.classList.toggle('expanded');
}

function toggleShoppingCard() {
    const card = document.getElementById('shopping-card');
    if (card) card.classList.toggle('expanded');
}

function toggleShoppingItem(itemId) {
    const item = document.getElementById(itemId);
    if (item) {
        item.classList.toggle('checked');
        const icon = item.querySelector('.check-icon');
        if (item.classList.contains('checked')) {
            icon.textContent = '\u2713';
        } else {
            icon.textContent = '';
        }
    }
}
