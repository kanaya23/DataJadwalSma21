console.log("%cMy favourite movie is SCARFACE", "color: #e67e22; font-weight: bold;");

const AppState = {
    shift: localStorage.getItem('shift') || 'siang',
    view: localStorage.getItem('view') || 'day',
    target: localStorage.getItem('target') || 'Senin',
    theme: localStorage.getItem('theme') || 'light',
    data: null,
    absences: {},
    adminMode: false,
    searchQuery: '',
    password: ''
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
        try {
            const apiRes = await fetch('/api/absences');
            if (apiRes.ok) {
                AppState.absences = await apiRes.json();
            } else {
                AppState.absences = AppState.data.absences || {};
            }
        } catch (apiErr) {
            AppState.absences = JSON.parse(localStorage.getItem('absences')) || AppState.data.absences || {};
        }
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
    else if (AppState.view === 'kelola') renderKelolaView();
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

async function saveAbsencesCloud(password) {
    try {
        const res = await fetch('/api/absences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ absences: AppState.absences, password })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to save');
        }
        return true;
    } catch (err) {
        console.error("Cloud save failed", err);
        return false;
    }
}

function renderKehadiranView() {
    const teachers = AppState.data.teachers;
    const absences = AppState.absences;
    const activeShiftTeachers = new Set();
    if (AppState.data && AppState.data[AppState.shift]) {
        Object.values(AppState.data[AppState.shift].schedule).forEach(rows => {
            rows.forEach(row => {
                if (!row.isEvent && row.cells) {
                    Object.values(row.cells).forEach(code => {
                        if (code) activeShiftTeachers.add(code);
                    });
                }
            });
        });
    }
    let absentCount = Object.keys(absences).filter(code => AppState.adminMode || activeShiftTeachers.has(code)).length;
    let totalCount = AppState.adminMode ? Object.keys(teachers).length : activeShiftTeachers.size;
    let presentCount = totalCount - absentCount;
    let filteredTeachers = Object.entries(teachers).filter(([code, info]) => {
        const query = AppState.searchQuery.toLowerCase();
        const matchesQuery = code.toLowerCase().includes(query) || 
                            info.name.toLowerCase().includes(query) || 
                            info.subject.toLowerCase().includes(query);
        if (!matchesQuery) return false;
        if (AppState.adminMode) return true;
        return activeShiftTeachers.has(code);
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
                AppState.password = '';
                renderKehadiranViewFullRebuild();
            } else {
                const password = prompt("Masukkan password untuk Kelola Kehadiran:");
                if (password) {
                    const isValid = await verifyPassword(password);
                    if (isValid) {
                        AppState.adminMode = true;
                        AppState.password = password;
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
                            try {
                                const res = await fetch('/api/change-password', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ currentPassword: current, newPassword: newPass })
                                });
                                if (res.ok) {
                                    const newHash = await sha256(newPass);
                                    localStorage.setItem('admin_hash', newHash);
                                    AppState.password = newPass;
                                    alert("Password berhasil diubah untuk semua orang di website!");
                                } else {
                                    const data = await res.json();
                                    alert("Gagal mengubah password di server: " + data.error);
                                }
                            } catch (cloudErr) {
                                const newHash = await sha256(newPass);
                                localStorage.setItem('admin_hash', newHash);
                                alert(`Password diubah secara lokal di browser ini.\n\nUntuk mengubah secara permanen bagi semua orang, silakan update hash berikut di file app.js Anda:\n\n${newHash}`);
                            }
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
                if (AppState.password) saveAbsencesCloud(AppState.password);
                renderKehadiranView();
            });
        });
        document.querySelectorAll('.btn-absen').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                const reason = btn.getAttribute('data-reason');
                AppState.absences[code] = reason;
                localStorage.setItem('absences', JSON.stringify(AppState.absences));
                if (AppState.password) saveAbsencesCloud(AppState.password);
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
                    if (AppState.password) saveAbsencesCloud(AppState.password);
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

async function saveScheduleCloud() {
    try {
        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduleData: AppState.data, password: AppState.password })
        });
        if (res.ok) {
            const resData = await res.json();
            if (resData.version) {
                AppState.data.version = resData.version;
            }
            alert("Semua perubahan jadwal berhasil disimpan website-wide ke Cloud!");
            render();
        } else {
            const data = await res.json();
            alert("Gagal menyimpan ke cloud: " + data.error);
        }
    } catch (err) {
        alert("Gagal menghubungkan ke cloud. Perubahan hanya tersimpan secara lokal di browser Anda.");
        console.error(err);
    }
}

async function renderKelolaView() {
    if (!AppState.password) {
        const password = prompt("Masukkan password untuk Kelola Jadwal:");
        if (password) {
            const isValid = await verifyPassword(password);
            if (isValid) {
                AppState.password = password;
            } else {
                alert("Password salah!");
                AppState.view = 'day';
                viewModeSelect.value = 'day';
                localStorage.setItem('view', 'day');
                populateSelector();
                render();
                return;
            }
        } else {
            AppState.view = 'day';
            viewModeSelect.value = 'day';
            localStorage.setItem('view', 'day');
            populateSelector();
            render();
            return;
        }
    }
    if (!AppState.editorTab) AppState.editorTab = 'teachers';
    if (!AppState.editorShift) AppState.editorShift = 'pagi';
    if (!AppState.editorClass) AppState.editorClass = AppState.data[AppState.editorShift].classes[0];
    if (!AppState.editorDay) AppState.editorDay = 'Senin';
    if (!AppState.editorPiketShift) AppState.editorPiketShift = 'pagi';
    renderEditorLayout();
}

function renderEditorLayout() {
    let html = `
        <div class="editor-container">
            <div class="editor-header">
                <h3 class="editor-title">PENGELOLA JADWAL & DATA GURU</h3>
                <div class="editor-header-buttons">
                    <button class="btn-save-cloud" id="btn-save-all-editor">Simpan Perubahan ke Cloud</button>
                    <button class="btn-exit-editor" id="btn-exit-all-editor">Keluar</button>
                </div>
            </div>
            <div class="editor-tabs">
                <button class="editor-tab-btn ${AppState.editorTab === 'teachers' ? 'active' : ''}" data-tab="teachers">Kelola Guru</button>
                <button class="editor-tab-btn ${AppState.editorTab === 'schedule' ? 'active' : ''}" data-tab="schedule">Jadwal Kelas</button>
                <button class="editor-tab-btn ${AppState.editorTab === 'piket' ? 'active' : ''}" data-tab="piket">Piket Roster</button>
            </div>
            <div class="editor-content-box" id="editor-tab-content"></div>
        </div>
    `;
    scheduleContainer.innerHTML = html;
    document.querySelectorAll('.editor-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            AppState.editorTab = e.target.getAttribute('data-tab');
            renderEditorLayout();
        });
    });
    document.getElementById('btn-save-all-editor').addEventListener('click', () => {
        saveScheduleCloud();
    });
    document.getElementById('btn-exit-all-editor').addEventListener('click', () => {
        if (confirm("Keluar dari menu pengelola jadwal? Pastikan Anda sudah menyimpan perubahan ke cloud.")) {
            AppState.password = '';
            AppState.adminMode = false;
            AppState.view = 'day';
            viewModeSelect.value = 'day';
            localStorage.setItem('view', 'day');
            populateSelector();
            render();
        }
    });
    if (AppState.editorTab === 'teachers') renderTeacherEditor();
    else if (AppState.editorTab === 'schedule') renderScheduleEditor();
    else if (AppState.editorTab === 'piket') renderPiketEditor();
}

function renderTeacherEditor() {
    const contentBox = document.getElementById('editor-tab-content');
    const teachers = AppState.data.teachers;
    const editingCode = AppState.editingTeacherCode;
    const editingInfo = editingCode ? teachers[editingCode] : null;
    let html = `
        <div class="editor-form">
            <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:700;">${editingCode ? `Edit Guru (${editingCode})` : 'Tambah Guru Baru'}</h4>
            <div class="editor-form-row">
                <div class="editor-field" style="max-width: 100px;">
                    <label>Kode Guru</label>
                    <input type="text" id="teacher-form-code" maxlength="3" placeholder="Misal: A1" value="${editingCode || ''}" ${editingCode ? 'disabled' : ''}>
                </div>
                <div class="editor-field">
                    <label>Nama Lengkap & Gelar</label>
                    <input type="text" id="teacher-form-name" placeholder="Nama Guru" value="${editingInfo ? editingInfo.name : ''}">
                </div>
                <div class="editor-field">
                    <label>Mata Pelajaran Utama</label>
                    <input type="text" id="teacher-form-subject" placeholder="Mata Pelajaran" value="${editingInfo ? editingInfo.subject : ''}">
                </div>
                <button class="editor-btn-action" id="btn-save-teacher-form" style="margin-top: 10px;">${editingCode ? 'Simpan' : 'Tambah'}</button>
                ${editingCode ? '<button class="editor-btn-action" id="btn-cancel-teacher-form" style="margin-top: 10px; background-color: var(--border-color);">Batal</button>' : ''}
            </div>
        </div>
        <div style="margin-bottom:15px;">
            <input type="text" id="teacher-editor-search" class="kehadiran-search" placeholder="Cari guru..." style="width:100%;">
        </div>
        <div class="editor-teachers-grid" id="editor-teachers-grid-container"></div>
    `;
    contentBox.innerHTML = html;
    const updateGrid = () => {
        const query = document.getElementById('teacher-editor-search').value.toLowerCase();
        const grid = document.getElementById('editor-teachers-grid-container');
        let gridHtml = '';
        Object.entries(teachers).sort((a, b) => a[0].localeCompare(b[0])).forEach(([code, info]) => {
            if (code.toLowerCase().includes(query) || info.name.toLowerCase().includes(query) || info.subject.toLowerCase().includes(query)) {
                gridHtml += `
                    <div class="editor-teacher-item">
                        <div class="editor-teacher-info">
                            <h5><span class="teacher-code">${code}</span>${info.name}</h5>
                            <p>${info.subject}</p>
                        </div>
                        <div class="editor-teacher-actions">
                            <button class="btn-edit-teacher" data-code="${code}">Edit</button>
                            <button class="btn-delete-teacher" data-code="${code}">Hapus</button>
                        </div>
                    </div>
                `;
            }
        });
        grid.innerHTML = gridHtml;
        document.querySelectorAll('.btn-edit-teacher').forEach(btn => {
            btn.addEventListener('click', (e) => {
                AppState.editingTeacherCode = e.target.getAttribute('data-code');
                renderTeacherEditor();
            });
        });
        document.querySelectorAll('.btn-delete-teacher').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const code = e.target.getAttribute('data-code');
                if (confirm(`Hapus guru ${code} (${teachers[code].name})? Ini tidak akan menghapus sel jadwal secara otomatis.`)) {
                    delete AppState.data.teachers[code];
                    renderTeacherEditor();
                }
            });
        });
    };
    updateGrid();
    document.getElementById('teacher-editor-search').addEventListener('input', updateGrid);
    document.getElementById('btn-save-teacher-form').addEventListener('click', () => {
        const codeInput = document.getElementById('teacher-form-code');
        const nameInput = document.getElementById('teacher-form-name');
        const subjInput = document.getElementById('teacher-form-subject');
        const code = codeInput.value.trim().toUpperCase();
        const name = nameInput.value.trim();
        const subject = subjInput.value.trim();
        if (!code || !name || !subject) {
            alert("Harap isi semua kolom!");
            return;
        }
        if (editingCode) {
            AppState.data.teachers[editingCode] = { name, subject };
            AppState.editingTeacherCode = null;
        } else {
            if (teachers[code]) {
                alert(`Kode guru ${code} sudah digunakan oleh ${teachers[code].name}!`);
                return;
            }
            AppState.data.teachers[code] = { name, subject };
        }
        renderTeacherEditor();
    });
    if (editingCode) {
        document.getElementById('btn-cancel-teacher-form').addEventListener('click', () => {
            AppState.editingTeacherCode = null;
            renderTeacherEditor();
        });
    }
}

function renderScheduleEditor() {
    const contentBox = document.getElementById('editor-tab-content');
    const shift = AppState.editorShift;
    const className = AppState.editorClass;
    const day = AppState.editorDay;
    const classesList = AppState.data[shift].classes;
    const periodRows = AppState.data[shift].schedule[day];
    const teachersList = Object.entries(AppState.data.teachers).sort((a, b) => a[0].localeCompare(b[0]));
    let html = `
        <div class="editor-schedule-header">
            <div class="editor-field" style="max-width:120px;">
                <label>Shift</label>
                <select id="schedule-edit-shift">
                    <option value="pagi" ${shift === 'pagi' ? 'selected' : ''}>Pagi</option>
                    <option value="siang" ${shift === 'siang' ? 'selected' : ''}>Siang</option>
                </select>
            </div>
            <div class="editor-field" style="max-width:120px;">
                <label>Kelas</label>
                <select id="schedule-edit-class">
                    ${classesList.map(c => `<option value="${c}" ${className === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <div class="editor-field" style="max-width:120px;">
                <label>Hari</label>
                <select id="schedule-edit-day">
                    ${['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map(d => `<option value="${d}" ${day === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="editor-schedule-rows">
    `;
    periodRows.forEach((row, rowIndex) => {
        if (row.isEvent) {
            html += `
                <div class="editor-period-row" style="background-color: var(--break-bg); color: var(--break-text);">
                    <div class="editor-period-info">
                        <div class="editor-period-num" style="background-color: var(--break-text);">E</div>
                        <div class="editor-period-time">${row.text} (${row.time})</div>
                    </div>
                    <div style="font-weight:700; font-size:12px; text-transform:uppercase;">Istirahat/Upacara</div>
                </div>
            `;
        } else {
            const currentCode = row.cells[className] || '';
            html += `
                <div class="editor-period-row">
                    <div class="editor-period-info">
                        <div class="editor-period-num">${row.period}</div>
                        <div class="editor-period-time">Jam ${row.period} (${row.time})</div>
                    </div>
                    <div class="editor-period-select-field">
                        <select class="schedule-period-cell-select" data-row-idx="${rowIndex}">
                            <option value="">- Kosong / Tidak Ada Kelas -</option>
                            ${teachersList.map(([code, info]) => `
                                <option value="${code}" ${currentCode === code ? 'selected' : ''}>
                                    ${code} - ${info.name} (${info.subject})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            `;
        }
    });
    html += `</div>`;
    contentBox.innerHTML = html;
    document.getElementById('schedule-edit-shift').addEventListener('change', (e) => {
        AppState.editorShift = e.target.value;
        AppState.editorClass = AppState.data[AppState.editorShift].classes[0];
        renderScheduleEditor();
    });
    document.getElementById('schedule-edit-class').addEventListener('change', (e) => {
        AppState.editorClass = e.target.value;
        renderScheduleEditor();
    });
    document.getElementById('schedule-edit-day').addEventListener('change', (e) => {
        AppState.editorDay = e.target.value;
        renderScheduleEditor();
    });
    document.querySelectorAll('.schedule-period-cell-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const rowIdx = parseInt(e.target.getAttribute('data-row-idx'));
            const selectedCode = e.target.value;
            if (!periodRows[rowIdx].cells) {
                periodRows[rowIdx].cells = {};
            }
            if (selectedCode) {
                periodRows[rowIdx].cells[className] = selectedCode;
            } else {
                delete periodRows[rowIdx].cells[className];
            }
        });
    });
}

function renderPiketEditor() {
    const contentBox = document.getElementById('editor-tab-content');
    const shift = AppState.editorPiketShift;
    const day = AppState.editorDay;
    const piketData = AppState.data.piket[shift];
    const guruVal = (piketData.guru[day] || []).join('\n');
    const wksVal = (piketData.wakasek[day] || []).join('\n');
    const bkVal = (piketData.bk[day] || []).join('\n');
    let html = `
        <div class="editor-schedule-header">
            <div class="editor-field" style="max-width:120px;">
                <label>Shift</label>
                <select id="piket-edit-shift">
                    <option value="pagi" ${shift === 'pagi' ? 'selected' : ''}>Pagi</option>
                    <option value="siang" ${shift === 'siang' ? 'selected' : ''}>Siang</option>
                </select>
            </div>
            <div class="editor-field" style="max-width:120px;">
                <label>Hari</label>
                <select id="piket-edit-day">
                    ${['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map(d => `<option value="${d}" ${day === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="editor-piket-grid">
            <div class="editor-piket-card">
                <h5>Petugas Piket Guru</h5>
                <p style="font-size:11px; color:var(--text-muted); margin:0 0 5px 0;">Tuliskan satu nama per baris:</p>
                <textarea id="piket-input-guru">${guruVal}</textarea>
            </div>
            <div class="editor-piket-card">
                <h5>Wakasek & Staff Piket</h5>
                <p style="font-size:11px; color:var(--text-muted); margin:0 0 5px 0;">Tuliskan satu nama per baris:</p>
                <textarea id="piket-input-wakasek">${wksVal}</textarea>
            </div>
            <div class="editor-piket-card">
                <h5>Piket Guru BK</h5>
                <p style="font-size:11px; color:var(--text-muted); margin:0 0 5px 0;">Tuliskan satu nama per baris:</p>
                <textarea id="piket-input-bk">${bkVal}</textarea>
            </div>
        </div>
    `;
    contentBox.innerHTML = html;
    document.getElementById('piket-edit-shift').addEventListener('change', (e) => {
        AppState.editorPiketShift = e.target.value;
        renderPiketEditor();
    });
    document.getElementById('piket-edit-day').addEventListener('change', (e) => {
        AppState.editorDay = e.target.value;
        renderPiketEditor();
    });
    const savePiketLocal = () => {
        const guruText = document.getElementById('piket-input-guru').value;
        const wksText = document.getElementById('piket-input-wakasek').value;
        const bkText = document.getElementById('piket-input-bk').value;
        piketData.guru[day] = guruText.split('\n').map(s => s.trim()).filter(s => s !== '');
        piketData.wakasek[day] = wksText.split('\n').map(s => s.trim()).filter(s => s !== '');
        piketData.bk[day] = bkText.split('\n').map(s => s.trim()).filter(s => s !== '');
    };
    document.getElementById('piket-input-guru').addEventListener('input', savePiketLocal);
    document.getElementById('piket-input-wakasek').addEventListener('input', savePiketLocal);
    document.getElementById('piket-input-bk').addEventListener('input', savePiketLocal);
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
