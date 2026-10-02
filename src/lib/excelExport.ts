import * as XLSX from 'xlsx';
import { AppConfig, Exam, ExamResultRow, User } from '../types';

export function downloadResultsAsExcel(exam: Exam, results: ExamResultRow[]) {
  const cleanTitle = (exam.exam_name || exam.subject).replace(/[^a-zA-Z0-9_-]/g, '_');
  const headers = ['No', 'ID Siswa', 'Nama Lengkap', 'Kelas', 'Nilai Akhir', 'Status', 'Waktu Mulai', 'Waktu Selesai'];

  const rows = results.map((r, i) => [
    i + 1,
    r.studentId,
    r.name,
    r.class,
    typeof r.score === 'number' ? r.score : Number(r.score) || 0,
    r.status,
    r.startTime,
    r.submitTime,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Hasil');

  XLSX.writeFile(workbook, `Rekap_Hasil_${cleanTitle}.xlsx`);
}

export function downloadClassReportExcel(exam: Exam, results: ExamResultRow[], selectedClass: string, config: AppConfig) {
  const kkm = exam.kkm || 75;
  const filtered = results
    .filter((r) => r.class.toLowerCase() === selectedClass.toLowerCase())
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));

  const headerRows = [
    [config.school_dinas || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'],
    [config.school_uptd || 'UPTD SATUAN PENDIDIKAN'],
    [config.school_name || 'SMP NEGERI 1 ANAK RATU AJI'],
    [config.school_address || 'Jl. Merdeka Kampung Gedung Sari'],
    [''],
    ['DAFTAR NILAI HASIL UJIAN SISWA'],
    [`Nama Ujian  : ${exam.exam_name || exam.subject}`],
    [`Mata Pelajaran: ${exam.subject}`],
    [`Kelas         : ${selectedClass}`],
    [`KKM           : ${kkm}`],
    [''],
    ['No', 'Nama Siswa', 'NIS / ID', 'Kelas', 'Nilai', 'Status Ketuntasan', 'Tanda Tangan'],
  ];

  const dataRows = filtered.map((s, idx) => {
    const score = typeof s.score === 'number' ? s.score : Number(s.score) || 0;
    const isTuntas = score >= kkm;
    return [
      idx + 1,
      s.name,
      s.studentId,
      s.class,
      score,
      isTuntas ? 'Tuntas' : 'Remedial',
      '',
    ];
  });

  const footerRows = [
    [''],
    ['', 'Mengetahui,', '', '', '', `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`],
    ['', 'Kepala Sekolah,', '', '', '', 'Guru Mata Pelajaran,'],
    [''],
    [''],
    [''],
    ['', config.principal_name || '( .................................... )', '', '', '', exam.created_by_name || '( .................................... )'],
    ['', `NIP. ${config.principal_nip || '.......................'}`, '', '', '', 'NIP. ....................................'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, ...footerRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Nilai_${selectedClass}`);

  const cleanExamName = (exam.exam_name || exam.subject).replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(workbook, `Daftar_Nilai_${cleanExamName}_${selectedClass}.xlsx`);
}

export function downloadQuestionTemplateExcel() {
  const headers = ['Tipe', 'Pertanyaan', 'Opsi_A', 'Opsi_B', 'Opsi_C', 'Opsi_D', 'Opsi_E', 'Kunci_Jawaban', 'Bobot', 'Wajib'];
  const samples = [
    ['PG', 'Berapakah hasil dari 12 x 12?', '124', '144', '164', '184', '200', '144', '20', 'TRUE'],
    ['PG', 'Ibu kota negara Indonesia saat ini adalah?', 'Bandung', 'Jakarta', 'Surabaya', 'Medan', 'Makassar', 'Jakarta', '20', 'TRUE'],
    ['BS', 'Bumi mengelilingi matahari dalam tata surya.', 'Benar', 'Salah', '', '', '', 'Benar', '20', 'TRUE'],
    ['JODOH', 'Pasangkan negara dengan ibukotanya (Format: Negara=IbuKota)', 'Indonesia=Jakarta', 'Jepang=Tokyo', 'Inggris=London', '', '', 'Auto-Check', '20', 'TRUE'],
    ['Esai', 'Jelaskan konsep dasar hukum kekekalan energi!', '', '', '', '', '', 'energi tidak dapat diciptakan atau dimusnahkan', '20', 'FALSE'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...samples]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Soal');
  XLSX.writeFile(workbook, 'Template_Bank_Soal_CBT.xlsx');
}

export function downloadUserTemplateExcel() {
  const headers = ['Username', 'Password', 'Role', 'Mapel', 'Kelas', 'ID (Opsional)'];
  const samples = [
    ['Ahmad Fauzi', 'siswa123', 'Siswa', '-', 'XII-RPL', 'SIS-010'],
    ['Budi Santoso', 'siswa123', 'Siswa', '-', 'XII-RPL', 'SIS-011'],
    ['Dewi Sartika', 'siswa123', 'Siswa', '-', 'XII-TKJ', 'SIS-012'],
    ['Pak Guru Matematika', 'guru123', 'Guru', 'Matematika', 'XII-RPL', 'GUR-005'],
    ['Bu Guru Fisika', 'guru123', 'Guru', 'Fisika', 'XII-TKJ', 'GUR-006'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...samples]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_User');
  XLSX.writeFile(workbook, 'Template_Import_User.xlsx');
}

export async function parseQuestionsExcel(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawRows.length <= 1) return [];

  const questions: any[] = [];

  // Skip header row
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const typeRaw = String(row[0] || 'PG').trim().toUpperCase();
    const content = String(row[1] || '').trim();
    if (!content) continue;

    let type: 'PG' | 'PG_KOMPLEKS' | 'BS' | 'JODOH' | 'Esai' = 'PG';
    if (['PG', 'PG_KOMPLEKS', 'BS', 'JODOH', 'ESAI'].includes(typeRaw)) {
      type = (typeRaw === 'ESAI' ? 'Esai' : typeRaw) as any;
    }

    const optA = String(row[2] ?? '').trim();
    const optB = String(row[3] ?? '').trim();
    const optC = String(row[4] ?? '').trim();
    const optD = String(row[5] ?? '').trim();
    const optE = String(row[6] ?? '').trim();

    const options = [optA, optB, optC, optD, optE].filter((o) => o !== '');
    const correct = String(row[7] ?? '').trim();
    const point = Number(row[8]) || 20;
    const isRequired = String(row[9] ?? 'TRUE').toUpperCase() !== 'FALSE';

    questions.push({
      type,
      content,
      options,
      correct,
      point,
      isRequired: isRequired ? 'TRUE' : 'FALSE',
    });
  }

  return questions;
}

export async function parseUsersExcel(file: File): Promise<Partial<User>[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawRows.length <= 1) return [];

  const users: Partial<User>[] = [];

  // Skip header row
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const username = String(row[0] || '').trim();
    if (!username) continue;

    const password = String(row[1] || 'siswa123').trim();
    const roleRaw = String(row[2] || 'Siswa').trim();
    const role = ['Admin', 'Guru', 'Siswa'].includes(roleRaw) ? roleRaw : 'Siswa';
    const mapel = String(row[3] || '').trim();
    const kelas = String(row[4] || '-').trim();
    const customId = String(row[5] || '').trim();

    let finalClass = kelas;
    if (role === 'Guru' && mapel && mapel !== '-') {
      finalClass = `${mapel}:${kelas}`;
    }

    const id = customId || `${role === 'Guru' ? 'GUR' : role === 'Admin' ? 'ADM' : 'SIS'}-${Date.now().toString().slice(-4)}${i}`;

    users.push({
      id,
      username,
      password,
      role: role as any,
      class: finalClass,
      is_active: true,
    });
  }

  return users;
}
