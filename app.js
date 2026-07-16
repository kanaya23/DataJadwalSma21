console.log("%cMy favourite movie is SCARFACE", "color: #e67e22; font-weight: bold;");

const AppState = {
    shift: localStorage.getItem('shift') || 'siang',
    view: localStorage.getItem('view') || 'day',
    target: localStorage.getItem('target') || 'Senin',
    theme: localStorage.getItem('theme') || 'light',
    data: null,
    absences: {},
    adminMode: false,
    searchQuery: ''
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
async function loadSchedule() {
    try {
        const response = await fetch('./schedule_data.json');
        if (!response.ok) throw new Error('Network response was not ok');
        AppState.data = await response.json();
        AppState.absences = JSON.parse(localStorage.getItem('absences')) || AppState.data.absences || {};
        if (AppState.view === 'day') {
            if (!['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].includes(AppState.target)) {
                AppState.target = 'Senin';
            }
        } else if (AppState.view === 'class') {
            const validClasses = AppState.data[AppState.shift].classes;
            if (!validClasses.includes(AppState.target)) {
                AppState.target = validClasses[0];
            }
        }
        localStorage.setItem('target', AppState.target);
        populateSelector();
        render();
    } catch (error) {
        console.error("Failed to load schedule data", error);
        scheduleContainer.innerHTML = "<p style='color:red; text-align:center;'>Error: Data jadwal gagal dimuat. Cek console atau tanya Bayumi.</p>";
    }
}

// --- UI RENDERING ---
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

    if (selectorSelect.querySelector(`option[value="${AppState.target}"]`)) {
        selectorSelect.value = AppState.target;
    }
}

function render() {
    if (!AppState.data) return;
    
    headerSubtitle.textContent = `JADWAL PELAJARAN SEMESTER GANJIL 2026 / 2027 (SHIFT ${AppState.shift.toUpperCase()})`;
    
    if (AppState.view === 'day') renderDayView(AppState.shift, AppState.target);
    else if (AppState.view === 'class') renderClassView(AppState.shift, AppState.target);
    else if (AppState.view === 'piket') renderPiketView(AppState.shift);
    else if (AppState.view === 'kehadiran') renderKehadiranView();
}

function renderBreakCard(text, time) {
    return `<div class="break-card">${text} <span style="font-weight: normal;">(${time})</span></div>`;
}

function renderClassPeriodCard(row, code, t) {
    const isAbsent = code && AppState.absences[code];
    return `
        <div class="card-period ${isAbsent ? 'absent-period' : ''}" data-code="${code}">
            <span class="card-period-time">Jam ${row.period} (${row.time})</span>
            <span class="card-period-subject">
                ${t ? t.subject : code}
                ${isAbsent ? `<span class="absent-badge" title="Keterangan: ${AppState.absences[code]}">Absen (${AppState.absences[code]})</span>` : ''}
                <span class="card-period-teacher" style="${isAbsent ? 'text-decoration: line-through;' : ''}">${t ? t.name : ''}</span>
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
                const isAbsent = code && AppState.absences[code];
                tableHtml += `<td data-code="${code}" class="${isAbsent ? 'teacher-absent-cell' : ''}" title="${isAbsent ? 'Guru Tidak Hadir: ' + AppState.absences[code] : ''}">${code}${isAbsent ? '<span class="absent-dot"></span>' : ''}</td>`;
            });
            tableHtml += `</tr>`;
        }
    });
    tableHtml += `</tbody></table>`;

    // Mobile Cards
    let cardsHtml = `<div class="schedule-cards">`;
    let eventRows = rows.filter(r => r.isEvent);
    let periodRows = rows.filter(r => !r.isEvent);
    eventRows.forEach(row => {
        cardsHtml += renderBreakCard(row.text, row.time);
    });
    classes.forEach(c => {
        cardsHtml += `<div class="class-card"><h3>Kelas ${c}</h3>`;
        periodRows.forEach(row => {
            const code = row.cells[c] || '';
            const t = AppState.data.teachers[code];
            cardsHtml += code ? renderClassPeriodCard(row, code, t) : `<div class="card-period"><span class="card-period-time" style="color: var(--text-muted);">Jam ${row.period} (${row.time})</span><span class="card-period-subject" style="color: var(--text-muted); font-style: italic;">Tidak Ada Kelas</span></div>`;
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
                const isAbsent = code && AppState.absences[code];
                const absentText = isAbsent ? ` <span class="absent-badge-inline" title="Keterangan: ${AppState.absences[code]}">Absen (${AppState.absences[code]})</span>` : '';
                html += `<tr ${isAbsent ? 'class="teacher-absent-cell"' : ''}>${dayHeaderHtml}<td>${row.period}</td><td>${row.time}</td><td style="font-weight: 600;">${t ? t.subject : (code || '-')}</td><td>${t ? t.name : '-'}${absentText}</td></tr>`;
            }
        });
    });
    html += `</tbody></table>`;
    scheduleContainer.innerHTML = `<div class="table-wrapper">${html}</div>`;
}

function isTeacherNameAbsent(name) {
    if (!AppState.data || !AppState.data.teachers) return false;
    for (const [code, info] of Object.entries(AppState.data.teachers)) {
        if (info.name === name && AppState.absences[code]) {
            return AppState.absences[code];
        }
    }
    return false;
}

function renderPiketView(shift) {
    const piket = AppState.data.piket[shift];
    const formatMembers = (members) => {
        return members.map(m => {
            const reason = isTeacherNameAbsent(m);
            if (reason) {
                return `<span class="absent-piket-member" title="Tidak Hadir: ${reason}">${m} (Absen)</span>`;
            }
            return m;
        }).join('<br>');
    };
    let html = `
        <table class="piket-table">
            <caption>Jadwal Piket Guru & Staff - Shift ${shift === 'pagi' ? 'Pagi' : 'Siang'}</caption>
            <thead><tr><th style="width: 180px;">Petugas Piket</th><th>Senin</th><th>Selasa</th><th>Rabu</th><th>Kamis</th><th>Jumat</th></tr></thead>
            <tbody>
                <tr><th>Piket Guru</th><td>${formatMembers(piket.guru.Senin)}</td><td>${formatMembers(piket.guru.Selasa)}</td><td>${formatMembers(piket.guru.Rabu)}</td><td>${formatMembers(piket.guru.Kamis)}</td><td>${formatMembers(piket.guru.Jumat)}</td></tr>
                <tr><th>Wakasek & Staff</th><td>${formatMembers(piket.wakasek.Senin)}</td><td>${formatMembers(piket.wakasek.Selasa)}</td><td>${formatMembers(piket.wakasek.Rabu)}</td><td>${formatMembers(piket.wakasek.Kamis)}</td><td>${formatMembers(piket.wakasek.Jumat)}</td></tr>
                <tr><th>Guru BK</th><td>${formatMembers(piket.bk.Senin)}</td><td>${formatMembers(piket.bk.Selasa)}</td><td>${formatMembers(piket.bk.Rabu)}</td><td>${formatMembers(piket.bk.Kamis)}</td><td>${formatMembers(piket.bk.Jumat)}</td></tr>
            </tbody>
        </table>
    `;
    scheduleContainer.innerHTML = `<div class="table-wrapper">${html}</div>`;
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(input) {
    const hashed = await sha256(input);
    const customHash = localStorage.getItem('admin_hash');
    if (customHash) {
        return hashed === customHash;
    }
    return hashed === '3556946967d44af3f7b55d93799f8cbba29dd38be3963b9b18185a450fdeb03b' || 
           hashed === '48ba0dd0a682b64f73f95059971d7e9d21a58faf804aaa265ce730f9b63c4988';
}

function renderKehadiranView() {
    const teachers = AppState.data.teachers;
    const absences = AppState.absences;
    let absentCount = Object.keys(absences).length;
    let totalCount = Object.keys(teachers).length;
    let presentCount = totalCount - absentCount;
    let filteredTeachers = Object.entries(teachers).filter(([code, info]) => {
        const query = AppState.searchQuery.toLowerCase();
        return code.toLowerCase().includes(query) || 
               info.name.toLowerCase().includes(query) || 
               info.subject.toLowerCase().includes(query);
    });
    const existingContainer = document.querySelector('.kehadiran-container');
    if (!existingContainer) {
        let html = `
            <div class="kehadiran-container">
                <div class="kehadiran-header-actions">
                    <input type="text" id="kehadiran-search-input" class="kehadiran-search" placeholder="Cari kode, nama, atau mapel..." value="${AppState.searchQuery}">
                    <div>
                        <button id="admin-mode-toggle-btn" class="admin-mode-btn">
                            ${AppState.adminMode ? 'Selesai Mengelola' : 'Kelola Kehadiran'}
                        </button>
                        ${AppState.adminMode ? '<button id="change-password-btn" class="admin-mode-btn" style="background-color: var(--border-color); margin-left: 10px;">Ganti Password</button>' : ''}
                    </div>
                </div>
                <div class="kehadiran-stats">
                    <div class="stat-box">
                        <h4>Total Guru</h4>
                        <div class="stat-val" id="stat-total">${totalCount}</div>
                    </div>
                    <div class="stat-box">
                        <h4>Hadir</h4>
                        <div class="stat-val" id="stat-present">${presentCount}</div>
                    </div>
                    <div class="stat-box stat-absent">
                        <h4>Tidak Hadir</h4>
                        <div class="stat-val" id="stat-absent">${absentCount}</div>
                    </div>
                </div>
                <div class="kehadiran-grid" id="kehadiran-grid-container"></div>
            </div>
        `;
        scheduleContainer.innerHTML = html;
        const searchInput = document.getElementById('kehadiran-search-input');
        searchInput.addEventListener('input', (e) => {
            AppState.searchQuery = e.target.value;
            renderKehadiranView();
        });
        const adminModeBtn = document.getElementById('admin-mode-toggle-btn');
        adminModeBtn.addEventListener('click', async () => {
            if (AppState.adminMode) {
                AppState.adminMode = false;
                renderKehadiranViewFullRebuild();
            } else {
                const password = prompt("Masukkan password untuk Kelola Kehadiran:");
                if (password) {
                    const isValid = await verifyPassword(password);
                    if (isValid) {
                        AppState.adminMode = true;
                        renderKehadiranViewFullRebuild();
                    } else {
                        alert("Password salah!");
                    }
                }
            }
        });
    } else {
        document.getElementById('stat-total').textContent = totalCount;
        document.getElementById('stat-present').textContent = presentCount;
        document.getElementById('stat-absent').textContent = absentCount;
    }
    const gridContainer = document.getElementById('kehadiran-grid-container');
    let gridHtml = '';
    filteredTeachers.forEach(([code, info]) => {
        const isAbsent = absences[code];
        let statusBadge = `<span class="status-indicator hadir">Hadir</span>`;
        if (isAbsent) {
            statusBadge = `<span class="status-indicator absen" title="Keterangan: ${isAbsent}">Tidak Hadir (${isAbsent})</span>`;
        }
        let adminControls = '';
        if (AppState.adminMode) {
            adminControls = `
                <div class="admin-actions">
                    <button class="admin-btn btn-hadir" data-code="${code}">Set Hadir</button>
                    <button class="admin-btn btn-absen" data-code="${code}" data-reason="Sakit">Sakit</button>
                    <button class="admin-btn btn-absen" data-code="${code}" data-reason="Izin">Izin</button>
                    <button class="admin-btn btn-absen" data-code="${code}" data-reason="Dinas Luar">Dinas Luar</button>
                    <button class="admin-btn btn-absen-custom" data-code="${code}">Lainnya...</button>
                </div>
            `;
        }
        gridHtml += `
            <div class="teacher-card">
                <div class="teacher-card-info">
                    <h4><span class="teacher-code">${code}</span>${info.name}</h4>
                    <div class="teacher-subj">${info.subject}</div>
                </div>
                <div class="teacher-card-status">
                    ${statusBadge}
                </div>
                ${adminControls}
            </div>
        `;
    });
    gridContainer.innerHTML = gridHtml;
    if (AppState.adminMode) {
        const changePassBtn = document.getElementById('change-password-btn');
        if (changePassBtn) {
            const newChangePassBtn = changePassBtn.cloneNode(true);
            changePassBtn.parentNode.replaceChild(newChangePassBtn, changePassBtn);
            newChangePassBtn.addEventListener('click', async () => {
                const current = prompt("Masukkan password saat ini:");
                if (current) {
                    const isCurrentValid = await verifyPassword(current);
                    if (isCurrentValid) {
                        const newPass = prompt("Masukkan password baru:");
                        if (newPass) {
                            const newHash = await sha256(newPass);
                            localStorage.setItem('admin_hash', newHash);
                            alert(`Password berhasil diubah di browser ini!\n\nUntuk mengubahnya bagi semua pengguna, silakan salin hash berikut dan gantikan di file app.js Anda:\n\n${newHash}`);
                        }
                    } else {
                        alert("Password saat ini salah!");
                    }
                }
            });
        }
        document.querySelectorAll('.btn-hadir').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                delete AppState.absences[code];
                localStorage.setItem('absences', JSON.stringify(AppState.absences));
                renderKehadiranView();
            });
        });
        document.querySelectorAll('.btn-absen').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                const reason = btn.getAttribute('data-reason');
                AppState.absences[code] = reason;
                localStorage.setItem('absences', JSON.stringify(AppState.absences));
                renderKehadiranView();
            });
        });
        document.querySelectorAll('.btn-absen-custom').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                const reason = prompt("Masukkan keterangan ketidakhadiran (misal: Izin Khitanan, Cuti, dll):");
                if (reason && reason.trim()) {
                    AppState.absences[code] = reason.trim();
                    localStorage.setItem('absences', JSON.stringify(AppState.absences));
                    renderKehadiranView();
                }
            });
        });
    }
}

function renderKehadiranViewFullRebuild() {
    const existing = document.querySelector('.kehadiran-container');
    if (existing) existing.remove();
    renderKehadiranView();
}

// --- EVENT LISTENERS ---
shiftModeSelect.addEventListener('change', (e) => {
    AppState.shift = e.target.value;
    localStorage.setItem('shift', AppState.shift);
    if (AppState.view === 'class' && AppState.data) {
        AppState.target = AppState.data[AppState.shift].classes[0];
        localStorage.setItem('target', AppState.target);
    }
    populateSelector();
    render();
});

viewModeSelect.addEventListener('change', (e) => {
    AppState.view = e.target.value;
    localStorage.setItem('view', AppState.view);
    if (AppState.view === 'day') {
        AppState.target = 'Senin';
        localStorage.setItem('target', AppState.target);
    } else if (AppState.view === 'class' && AppState.data) {
        AppState.target = AppState.data[AppState.shift].classes[0];
        localStorage.setItem('target', AppState.target);
    }
    populateSelector();
    render();
});

selectorSelect.addEventListener('change', (e) => {
    AppState.target = e.target.value;
    localStorage.setItem('target', AppState.target);
    render();
});

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

shiftModeSelect.value = AppState.shift;
viewModeSelect.value = AppState.view;

let titleClickCount = 0;
let titleClickTimer = null;
document.querySelector('.header h1').addEventListener('click', () => {
    titleClickCount++;
    clearTimeout(titleClickTimer);
    titleClickTimer = setTimeout(() => { titleClickCount = 0; }, 3000);
    if (titleClickCount >= 5) {
        titleClickCount = 0;
        document.querySelector('.header').classList.add('title-dodge');
        setTimeout(() => {
            const overlay = document.createElement('div');
            overlay.className = 'hit-overlay';
            document.body.appendChild(overlay);
            document.querySelector('.container').classList.add('hit-shake');
            setTimeout(() => {
                document.querySelector('.container').classList.remove('hit-shake');
                overlay.remove();
                document.querySelector('.header').classList.remove('title-dodge');
            }, 1500);
        }, 800);
    }
});

loadSchedule();
