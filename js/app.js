/**
 * Aplikasi Portal Orang Tua - Online Server Mode
 */

let appData = {
  students: [],
  meetings: [],
  attendance: [],
  assessments: []
};

let currentStudent = null;

// Load JSON saat halaman dibuka
document.addEventListener('DOMContentLoaded', () => {
  loadDataFromJSON();
});

async function loadDataFromJSON() {
  const badge = document.getElementById('data-status-badge');
  try {
    const response = await fetch(`data.json?v=${new Date().getTime()}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('File data.json tidak ditemukan.');
    }

    const data = await response.json();

    if (data.students && data.meetings) {
      appData = data;
      badge.innerText = '● Terhubung';
      badge.className = 'badge-status badge-hadir';
    } else {
      throw new Error('Format JSON tidak sesuai.');
    }
  } catch (error) {
    console.error('Fetch Error:', error);
    badge.innerText = '● Data Offline';
    badge.className = 'badge-status badge-alpa';
  }
}

function searchStudent() {
  const query = document.getElementById('student-search-input').value.toLowerCase().trim();
  const resultsContainer = document.getElementById('search-results');

  if (!query) {
    resultsContainer.style.display = 'none';
    return;
  }

  const matches = appData.students.filter(s => 
    s.name.toLowerCase().includes(query) || s.nis.toLowerCase().includes(query)
  );

  if (matches.length === 0) {
    resultsContainer.innerHTML = `<div class="search-item">Siswa tidak ditemukan</div>`;
  } else {
    resultsContainer.innerHTML = matches.map(s => `
      <div class="search-item" onclick="selectStudent('${s.id}')">
        <strong>${s.name}</strong> <small style="color:var(--text-muted);">(${s.nis} - ${s.class})</small>
      </div>
    `).join('');
  }
  resultsContainer.style.display = 'block';
}

function selectStudent(studentId) {
  currentStudent = appData.students.find(s => s.id === studentId);
  if (!currentStudent) return;

  document.getElementById('search-results').style.display = 'none';
  document.getElementById('search-section').style.display = 'none';
  document.getElementById('student-dashboard').style.display = 'block';

  document.getElementById('disp-student-name').innerText = currentStudent.name;
  document.getElementById('disp-student-nis').innerText = currentStudent.nis;
  document.getElementById('disp-student-class').innerText = currentStudent.class;

  loadAttendanceData();
  populateMeetingDropdown();
  switchTab('attendance');
}

function resetStudentSelection() {
  currentStudent = null;
  document.getElementById('student-search-input').value = '';
  document.getElementById('student-dashboard').style.display = 'none';
  document.getElementById('search-section').style.display = 'block';
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  const activeBtn = Array.from(document.querySelectorAll('.tab-btn'))
    .find(b => b.getAttribute('onclick').includes(tabName));
  if (activeBtn) activeBtn.classList.add('active');

  if (tabName === 'reports') renderIndividualReport();
  if (tabName === 'semester') renderSemesterReport();
}

// 1. DATA ABSENSI
function loadAttendanceData() {
  const studentAtt = appData.attendance.filter(a => a.studentId === currentStudent.id);
  
  let count = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
  studentAtt.forEach(a => { if (count[a.status] !== undefined) count[a.status]++; });

  document.getElementById('att-count-hadir').innerText = count.Hadir;
  document.getElementById('att-count-izin').innerText = count.Izin;
  document.getElementById('att-count-sakit').innerText = count.Sakit;
  document.getElementById('att-count-alpa').innerText = count.Alpa;

  const meetings = [...appData.meetings].sort((a,b) => a.number - b.number);

  const tbody = document.getElementById('attendance-table-body');
  tbody.innerHTML = meetings.map(m => {
    const att = studentAtt.find(a => a.meetingId === m.id);
    const status = att ? att.status : 'Belum Ada';
    const badgeClass = status.toLowerCase();

    return `
      <tr>
        <td>Ke-${m.number}</td>
        <td>${m.date}</td>
        <td><b>${m.topic}</b></td>
        <td><span class="badge badge-${badgeClass}">${status}</span></td>
      </tr>
    `;
  }).join('');
}

function populateMeetingDropdown() {
  const select = document.getElementById('select-meeting-report');
  const meetings = [...appData.meetings].sort((a,b) => a.number - b.number);
  
  select.innerHTML = meetings.map(m => 
    `<option value="${m.id}">Pertemuan ${m.number}: ${m.topic}</option>`
  ).join('');
}

// LAPORAN INDIVIDUAL (MENYESUAIKAN FORMAT JSON BARU)
function renderIndividualReport() {
  const meetingId = document.getElementById('select-meeting-report').value;
  const container = document.getElementById('individual-report-container');
  
  if (!meetingId) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Data pertemuan belum tersedia.</p>';
    return;
  }

  const meeting = appData.meetings.find(m => m.id === meetingId);
  const assess = appData.assessments.find(a => a.meetingId === meetingId && a.studentId === currentStudent.id) || {};
  const indicatorStatuses = assess.indicatorStatuses || {};

  // Render Indikator Capaian Pembelajaran (Array String & Index Key)
  let indicatorsHTML = '';
  if (meeting.indicators && meeting.indicators.length > 0) {
    indicatorsHTML = `
      <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.4rem;">C. INDIKATOR CAPAIAN PEMBELAJARAN</h4>
      <table style="margin-bottom:1.5rem; width:100%;">
        <thead>
          <tr>
            <th style="width:70%;">Indikator Capaian</th>
            <th style="width:30%; text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${meeting.indicators.map((indicatorText, index) => {
            // Ambil status berdasarkan index angka dalam bentuk string ("0", "1", "2")
            const status = indicatorStatuses[index.toString()] || 'Belum Dinilai';
            const isSuccess = status === 'Tercapai';
            const bgStyle = isSuccess ? 'background:#dcfce7; color:#15803d;' : 'background:#ffe4e6; color:#be123c;';
            
            return `
              <tr>
                <td>${indicatorText}</td>
                <td style="text-align:center;">
                  <span style="padding:0.2rem 0.6rem; border-radius:4px; font-weight:bold; font-size:0.75rem; ${bgStyle}">
                    ${status}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } else {
    indicatorsHTML = `
      <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.4rem;">C. INDIKATOR CAPAIAN PEMBELAJARAN</h4>
      <p style="margin-bottom: 1.5rem; font-size:0.85rem; color:#64748b;">Belum ada indikator capaian yang ditambahkan pada pertemuan ini.</p>
    `;
  }

  container.innerHTML = `
    <div class="action-buttons-group no-print">
      <button class="btn btn-primary-outline" onclick="window.print()">🖨️ Cetak Laporan</button>
      <button class="btn btn-secondary" onclick="exportPDF('report-individual-doc', 'Laporan_Pertemuan_${meeting.number}_${currentStudent.name}.pdf')">📄 Export PDF</button>
    </div>

    <div class="card report-document" id="report-individual-doc">
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h2 style="font-size:1.2rem; font-weight:800;">LAPORAN CAPAIAN PEMBELAJARAN</h2>
        <h3 style="font-size:0.95rem; font-weight:600; color:#475569;">EKSTRAKURIKULER CODING</h3>
      </div>

      <table style="width:100%; border:none; margin-bottom:1.5rem;">
        <tr>
          <td style="border:none; padding:0.3rem 0;"><strong>Nama Siswa:</strong> ${currentStudent.name}</td>
          <td style="border:none; padding:0.3rem 0;"><strong>Pertemuan:</strong> Ke-${meeting.number}</td>
        </tr>
        <tr>
          <td style="border:none; padding:0.3rem 0;"><strong>Kelas:</strong> ${currentStudent.class}</td>
          <td style="border:none; padding:0.3rem 0;"><strong>Materi:</strong> ${meeting.topic}</td>
        </tr>
      </table>

      <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.4rem;">A. TUJUAN PEMBELAJARAN</h4>
      <p style="margin-bottom: 1rem; font-size:0.85rem; line-height:1.5;">${meeting.goals || '-'}</p>

      <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.4rem;">B. CAPAIAN PEMBELAJARAN</h4>
      <p style="margin-bottom: 1rem; font-size:0.85rem; line-height:1.5;">${meeting.achievements || '-'}</p>

      ${indicatorsHTML}

      <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.4rem;">D. PENILAIAN INDIVIDUAL</h4>
      <table style="margin-bottom:1.5rem;">
        <thead>
          <tr>
            <th>Aspek Assessment</th>
            <th>Nilai (0-100)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Pemahaman Konsep (25%)</td><td>${assess.concept || 0}</td></tr>
          <tr><td>Keterampilan Pemrograman (40%)</td><td>${assess.skill || 0}</td></tr>
          <tr><td>Kreativitas (20%)</td><td>${assess.creativity || 0}</td></tr>
          <tr><td>Sikap & Kemandirian (15%)</td><td>${assess.attitude || 0}</td></tr>
          <tr><th>NILAI AKHIR</th><th>${assess.finalScore || 0} (${assess.category || '-'})</th></tr>
        </tbody>
      </table>

      <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.4rem;">E. DESKRIPSI PERKEMBANGAN</h4>
      <div style="border: 1px solid #cbd5e1; padding: 0.85rem; border-radius: 6px; font-size:0.85rem; line-height:1.5; background:#f8fafc;">
        ${assess.desc || 'Belum ada deskripsi catatan perkembangan dari guru.'}
      </div>
    </div>
  `;
}

// 3. LAPORAN SEMESTER
function renderSemesterReport() {
  const container = document.getElementById('semester-report-container');
  const meetings = [...appData.meetings].sort((a,b) => a.number - b.number);
  const studentAssess = appData.assessments.filter(a => a.studentId === currentStudent.id);
  const studentAtt = appData.attendance.filter(a => a.studentId === currentStudent.id);

  const hadirCount = studentAtt.filter(a => a.status === 'Hadir').length;
  const attRate = meetings.length ? Math.round((hadirCount / meetings.length) * 100) : 0;

  let totalScore = 0;
  studentAssess.forEach(a => totalScore += (a.finalScore || 0));
  const avgScore = studentAssess.length ? Math.round(totalScore / studentAssess.length) : 0;

  container.innerHTML = `
    <div class="action-buttons-group no-print">
      <button class="btn btn-primary-outline" onclick="window.print()">🖨️ Cetak Laporan Semester</button>
      <button class="btn btn-secondary" onclick="exportPDF('semester-doc', 'Laporan_Semester_${currentStudent.name}.pdf')">📄 Export PDF</button>
    </div>

    <div class="card report-document" id="semester-doc">
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h2 style="font-size:1.2rem; font-weight:800;">LAPORAN REKAPITULASI SEMESTER</h2>
        <h3 style="font-size:0.95rem; font-weight:600; color:#475569;">EKSTRAKURIKULER CODING</h3>
      </div>

      <table style="width:100%; border:none; margin-bottom:1rem;">
        <tr>
          <td style="border:none; padding:0.3rem 0;"><strong>Nama Siswa:</strong> ${currentStudent.name}</td>
          <td style="border:none; padding:0.3rem 0;"><strong>Kelas:</strong> ${currentStudent.class}</td>
        </tr>
      </table>

      <div class="card-grid" style="margin-bottom: 1.5rem;">
        <div class="metric-card" style="background:#e0f2fe; border:1px solid #bae6fd;">
          <h4 style="color:#0369a1;">Kehadiran</h4>
          <div class="metric-val" style="color:#0284c7;">${attRate}%</div>
        </div>
        <div class="metric-card" style="background:#dcfce7; border:1px solid #bbf7d0;">
          <h4 style="color:#15803d;">Rata-Rata Nilai</h4>
          <div class="metric-val" style="color:#16a34a;">${avgScore}</div>
        </div>
      </div>

      <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.5rem;">Riwayat Capaian Per Pertemuan</h4>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Pertemuan</th>
              <th>Materi</th>
              <th>Nilai Final</th>
              <th>Kategori</th>
            </tr>
          </thead>
          <tbody>
            ${meetings.map(m => {
              const ass = studentAssess.find(a => a.meetingId === m.id);
              return `
                <tr>
                  <td>Ke-${m.number}</td>
                  <td>${m.topic}</td>
                  <td>${ass ? ass.finalScore : '-'}</td>
                  <td>${ass ? ass.category : '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function exportPDF(elementId, fileName) {
  const element = document.getElementById(elementId);
  const opt = {
    margin:       10,
    filename:     fileName,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}