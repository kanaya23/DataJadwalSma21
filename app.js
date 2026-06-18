// i read on reddit that using a "state object" is better than querying the dom every time.
// i still don't really get it but this prevents the dropdowns from desyncing.
const AppState = {
    shift: 'siang',
    view: 'day',
    target: 'Senin',
    theme: localStorage.getItem('theme') || 'light',
    data: null // Will hold our fetched JSON
};

// DOM references
const shiftModeSelect = document.getElementById('shift-mode');
const viewModeSelect = document.getElementById('view-mode');
const selectorSelect = document.getElementById('selector');
const selectorGroup = document.getElementById('selector-group');
const selectorLabel = document.getElementById('selector-label');
const scheduleContainer = document.getElementById('schedule-container');
const headerSubtitle = document.getElementById('header-subtitle');
const themeToggleBtn = document.getElementById('theme-toggle');
const tooltip = document.getElementById('tooltip');

// --- THEME LOGIC ---
function updateThemeButtonText() {
    const btnText = themeToggleBtn.querySelector('.theme-btn-text');
    btnText.textContent = document.body.classList.contains('dark-theme') ? 'TEMA: TERANG' : 'TEMA: GELAP';
}

if (AppState.theme === 'dark') document.body.classList.add('dark-theme');
updateThemeButtonText();

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    AppState.theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', AppState.theme);
    updateThemeButtonText();
});

// --- DATA FETCHING ---
// TODO: write a python script to convert the school's excel sheet to this json format. doing this manually in notepad sucks.
// async await magic spell i learned from a youtube short.
// if the json file has a typo this whole thing crashes and i have no idea how to debug it.
async function loadSchedule() {
    try {
        const response = await fetch('./schedule_data.json');
        if (!response.ok) throw new Error('Network response was not ok');
        AppState.data = await response.json();
        populateSelector();
        render();
    } catch (error) {
        console.error("bruh the json is broken", error);
        scheduleContainer.innerHTML = "<p style='color:red; text-align:center;'>Error: Data jadwal gagal dimuat. Cek console atau tanya Bayumi.</p>";
    }
}

// --- UI RENDERING ---
// i clear the dropdown and rebuild it every time. is this bad? probably. but it works.
function populateSelector() {
    selectorSelect.innerHTML = ''; 
    
    if (AppState.view === 'day') {
        selectorGroup.style.display = 'flex';
        selectorLabel.innerText = 'PILIH HARI:';
        ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].forEach(d => {
            const opt = document.createElement('option');
            opt.value = d; opt.textContent = d;
            selectorSelect.appendChild(opt);
        });
    } else if (AppState.view === 'class') {
        selectorGroup.style.display = 'flex';
        selectorLabel.innerText = 'PILIH KELAS:';
        if (AppState.data) {
            AppState.data[AppState.shift].classes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c; opt.textContent = c;
                selectorSelect.appendChild(opt);
            });
        }
    } else {
        selectorGroup.style.display = 'none';
    }

    // i have no idea why but if i don't set the value here it defaults to the wrong class
    selectorSelect.value = AppState.target; 
}

// the main draw function. just routes to the specific view builder. if you change the json structure this will break.
function render() {
    if (!AppState.data) return;
    
    headerSubtitle.textContent = `JADWAL PELAJARAN SEMESTER GANJIL 2025 / 2026 (SHIFT ${AppState.shift.toUpperCase()})`;
    
    if (AppState.view === 'day') renderDayView(AppState.shift, AppState.target);
    else if (AppState.view === 'class') renderClassView(AppState.shift, AppState.target);
    else if (AppState.view === 'piket') renderPiketView(AppState.shift);
}

// broke this out into a function because the string was getting too long and i kept losing my place.
function renderBreakCard(text, time) {
    return `<div class="break-card">${text} <span style="font-weight: normal;">(${time})</span></div>`;
}

function renderClassPeriodCard(row, code, t) {
    return `
        <div class="card-period" data-code="${code}">
            <span class="card-period-time">Jam ${row.period} (${row.time})</span>
            <span class="card-period-subject">
                ${t ? t.subject : code}
                <span class="card-period-teacher">${t ? t.name : ''}</span>
            </span>
        </div>
    `;
}

function renderDayView(shift, day) {
    const classes = AppState.data[shift].classes;
    const rows = AppState.data[shift].schedule[day];

    // Desktop Table
    let tableHtml = `
        <table class="day-view-table">
            <caption>Jadwal Hari ${day}</caption>
            <thead>
                <tr>
                    <th style="width: 80px;">Jam Ke-</th>
                    <th style="width: 110px;">Waktu</th>
                    ${classes.map(c => `<th>${c}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    rows.forEach(row => {
        if (row.isEvent) {
            tableHtml += `<tr class="break-row"><td colspan="${classes.length + 2}">${row.text} (${row.time})</td></tr>`;
        } else {
            tableHtml += `<tr><th>${row.period}</th><td>${row.time}</td>`;
            classes.forEach(c => {
                const code = row.cells[c] || '';
                tableHtml += `<td data-code="${code}">${code}</td>`;
            });
            tableHtml += `</tr>`;
        }
    });
    tableHtml += `</tbody></table>`;

    // Mobile Cards
    let cardsHtml = `<div class="schedule-cards">`;
    classes.forEach(c => {
        cardsHtml += `<div class="class-card"><h3>Kelas ${c}</h3>`;
        rows.forEach(row => {
            if (row.isEvent) {
                cardsHtml += renderBreakCard(row.text, row.time);
            } else {
                const code = row.cells[c] || '';
                const t = AppState.data.teachers[code];
                cardsHtml += code ? renderClassPeriodCard(row, code, t) : `<div class="card-period"><span class="card-period-time" style="color: var(--text-muted);">Jam ${row.period} (${row.time})</span><span class="card-period-subject" style="color: var(--text-muted); font-style: italic;">Tidak Ada Kelas</span></div>`;
            }
        });
        cardsHtml += `</div>`;
    });
    cardsHtml += `</div>`;

    scheduleContainer.innerHTML = `<div class="table-wrapper">${tableHtml}</div>${cardsHtml}`;
}

function renderClassView(shift, className) {
    const schedule = AppState.data[shift].schedule;
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    
    let html = `
        <table class="class-view-table">
            <caption>Jadwal Kelas ${className}</caption>
            <thead><tr><th style="width: 100px;">Hari</th><th style="width: 80px;">Jam Ke-</th><th style="width: 120px;">Waktu</th><th>Mata Pelajaran</th><th>Guru</th></tr></thead>
            <tbody>
    `;

    days.forEach(day => {
        const dayRows = schedule[day];
        dayRows.forEach((row, rIdx) => {
            const dayHeaderHtml = rIdx === 0 ? `<th class="day-header" rowspan="${dayRows.length}">${day}</th>` : '';
            if (row.isEvent) {
                html += `<tr class="break-row">${dayHeaderHtml}<td colspan="4">${row.text} (${row.time})</td></tr>`;
            } else {
                const code = row.cells[className] || '';
                const t = AppState.data.teachers[code];
                html += `<tr>${dayHeaderHtml}<td>${row.period}</td><td>${row.time}</td><td style="font-weight: 600;">${t ? t.subject : (code || '-')}</td><td>${t ? t.name : '-'}</td></tr>`;
            }
        });
    });
    html += `</tbody></table>`;
    scheduleContainer.innerHTML = `<div class="table-wrapper">${html}</div>`;
}

function renderPiketView(shift) {
    const piket = AppState.data.piket[shift];
    let html = `
        <table class="piket-table">
            <caption>Jadwal Piket Guru & Staff - Shift ${shift === 'pagi' ? 'Pagi' : 'Siang'}</caption>
            <thead><tr><th style="width: 180px;">Petugas Piket</th><th>Senin</th><th>Selasa</th><th>Rabu</th><th>Kamis</th><th>Jumat</th></tr></thead>
            <tbody>
                <tr><th>Piket Guru</th><td>${piket.guru.Senin.join('<br>')}</td><td>${piket.guru.Selasa.join('<br>')}</td><td>${piket.guru.Rabu.join('<br>')}</td><td>${piket.guru.Kamis.join('<br>')}</td><td>${piket.guru.Jumat.join('<br>')}</td></tr>
                <tr><th>Wakasek & Staff</th><td>${piket.wakasek.Senin.join('<br>')}</td><td>${piket.wakasek.Selasa.join('<br>')}</td><td>${piket.wakasek.Rabu.join('<br>')}</td><td>${piket.wakasek.Kamis.join('<br>')}</td><td>${piket.wakasek.Jumat.join('<br>')}</td></tr>
                <tr><th>Guru BK</th><td>${piket.bk.Senin.join('<br>')}</td><td>${piket.bk.Selasa.join('<br>')}</td><td>${piket.bk.Rabu.join('<br>')}</td><td>${piket.bk.Kamis.join('<br>')}</td><td>${piket.bk.Jumat.join('<br>')}</td></tr>
            </tbody>
        </table>
    `;
    scheduleContainer.innerHTML = `<div class="table-wrapper">${html}</div>`;
}

// --- EVENT LISTENERS ---
shiftModeSelect.addEventListener('change', (e) => {
    AppState.shift = e.target.value;
    if (AppState.view === 'class' && AppState.data) AppState.target = AppState.data[AppState.shift].classes[0];
    populateSelector();
    render();
});

viewModeSelect.addEventListener('change', (e) => {
    AppState.view = e.target.value;
    if (AppState.view === 'day') AppState.target = 'Senin';
    else if (AppState.view === 'class' && AppState.data) AppState.target = AppState.data[AppState.shift].classes[0];
    populateSelector();
    render();
});

selectorSelect.addEventListener('change', (e) => {
    AppState.target = e.target.value;
    render();
});

// native tooltips look ugly. i copied this mousemove event listener from a 2014 jquery forum and translated it to vanilla JS. 
// it flickers on touch devices but i'm too scared to fix it.
document.addEventListener('mouseover', function(e) {
    const target = e.target.closest('td[data-code]');
    if (target) {
        const code = target.getAttribute('data-code');
        if (code && AppState.data.teachers[code]) {
            const t = AppState.data.teachers[code];
            tooltip.innerHTML = `<strong>${t.name}</strong><br>${t.subject}`;
            tooltip.style.display = 'block';
        }
    }
});

document.addEventListener('mousemove', function(e) {
    if (tooltip.style.display === 'block') {
        tooltip.style.left = (e.pageX + 15) + 'px';
        tooltip.style.top = (e.pageY + 15) + 'px';
    }
});

document.addEventListener('mouseout', function(e) {
    if (e.target.closest('td[data-code]')) tooltip.style.display = 'none';
});

// Set initial dropdown values from AppState
shiftModeSelect.value = AppState.shift;
viewModeSelect.value = AppState.view;

// Load initial schedule
loadSchedule();
