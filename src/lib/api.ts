import { getSupabaseClient } from './supabase';
import {
  User,
  Exam,
  Question,
  StudentResponse,
  Log,
  SavedImage,
  AppConfig,
  MasterData,
  StudentExamState,
  QuestionAnswerDetail,
} from '../types';

// Default initial seed data (matches Apps Script database)
const INITIAL_CONFIG: AppConfig = {
  app_name: 'SIPADU CBT Online',
  app_subtitle: 'Sistem Ujian Online Terintegrasi Supabase & React',
  app_logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg/250px-Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg.png',
  app_background: 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1986&auto=format&fit=crop',
  show_exam_result: 'true',
  school_dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  school_uptd: 'UPTD SATUAN PENDIDIKAN',
  school_name: 'SMP NEGERI 1 ANAK RATU AJI',
  school_address: 'Jl. Merdeka Kampung Gedung Sari Kec. Anak Ratu Aji Kab. Lampung Tengah',
  principal_name: 'SUKAMTO, S.Si',
  principal_nip: '19700101 200902 1 002',
  timezone: 'Asia/Jakarta',
};

const INITIAL_USERS: User[] = [
  { id: 'ADM-001', username: 'Admin Utama', password: 'admin123', role: 'Admin', class: '-', is_active: true },
  { id: 'GUR-001', username: 'Pak Budi Hartono, S.Pd', password: 'guru123', role: 'Guru', class: 'Matematika:XII-RPL, Fisika:XII-TKJ', is_active: true },
  { id: 'SIS-001', username: 'Ahmad Siswa RPL', password: 'siswa123', role: 'Siswa', class: 'XII-RPL', is_active: true },
  { id: 'SIS-002', username: 'Budi Santoso', password: 'siswa123', role: 'Siswa', class: 'XII-RPL', is_active: true },
  { id: 'SIS-003', username: 'Citra Lestari', password: 'siswa123', role: 'Siswa', class: 'XII-TKJ', is_active: true },
];

const INITIAL_EXAMS: Exam[] = [
  {
    id: 'EXM-DEMO-001',
    exam_name: 'Simulasi Ujian Akhir Semester',
    subject: 'Matematika',
    class: 'XII-RPL,XII-TKJ',
    date: new Date(Date.now() - 3600000).toISOString(),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    duration: 60,
    pin: '12345',
    status: 'Aktif',
    end_token: 'SELESAI2026',
    created_by_name: 'Pak Budi Hartono, S.Pd',
    kkm: 75,
    shuffle_config: { PG: false, PG_KOMPLEKS: false, BS: false, JODOH: false, Esai: false },
  },
];

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'Q-DEMO-01',
    exam_id: 'EXM-DEMO-001',
    type: 'PG',
    content: 'Berapakah hasil dari 15 + 25 x 2?',
    options: ['65', '80', '50', '90', '55'],
    correct_answer: '65',
    is_required: true,
    point: 20,
  },
  {
    id: 'Q-DEMO-02',
    exam_id: 'EXM-DEMO-001',
    type: 'PG_KOMPLEKS',
    content: 'Manakah di bawah ini yang merupakan bilangan prima? (Pilih semua yang benar)',
    options: ['2', '3', '4', '5', '9'],
    correct_answer: '["2", "3", "5"]',
    is_required: true,
    point: 20,
  },
  {
    id: 'Q-DEMO-03',
    exam_id: 'EXM-DEMO-001',
    type: 'BS',
    content: 'Tentukan kebenaran dari pernyataan matematika berikut:',
    options: [
      'Sudut siku-siku memiliki besar 90 derajat.',
      'Jumlah sudut dalam sebuah segitiga adalah 360 derajat.',
      'Bilangan negatif dikalikan bilangan negatif menghasilkan bilangan positif.',
    ],
    correct_answer: '{"0": "Benar", "1": "Salah", "2": "Benar"}',
    is_required: true,
    point: 20,
  },
  {
    id: 'Q-DEMO-04',
    exam_id: 'EXM-DEMO-001',
    type: 'JODOH',
    content: 'Cocokkan bentuk bangun datar dengan rumus luasnya:',
    options: [
      { q: 'Persegi Panjang', a: 'Panjang x Lebar' },
      { q: 'Segitiga', a: '1/2 x Alas x Tinggi' },
      { q: 'Lingkaran', a: 'pi x r^2' },
    ],
    correct_answer: 'Persegi Panjang ➔ Panjang x Lebar | Segitiga ➔ 1/2 x Alas x Tinggi | Lingkaran ➔ pi x r^2',
    is_required: true,
    point: 20,
  },
  {
    id: 'Q-DEMO-05',
    exam_id: 'EXM-DEMO-001',
    type: 'Esai',
    content: 'Jelaskan mengapa matematika sering disebut sebagai ratu ilmu pengetahuan (queen of science) dalam kehidupan modern!',
    options: [],
    correct_answer: 'analitis, logika, pemodelan',
    is_required: true,
    point: 20,
  },
];

const INITIAL_MASTER_DATA: MasterData = {
  classes: ['X-IPA 1', 'X-IPA 2', 'X-IPS 1', 'XI-IPA 1', 'XI-IPA 2', 'XI-IPS 1', 'XII-RPL', 'XII-TKJ', 'XII-MM'],
  subjects: ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'Fisika', 'Kimia', 'Biologi', 'Sejarah', 'Geografi', 'Informatika'],
};

// Local storage helper for fallback/standalone mode
class LocalDB {
  static get<T>(key: string, defaultVal: T): T {
    if (typeof window === 'undefined') return defaultVal;
    try {
      const data = localStorage.getItem(`sipadu_local_${key}`);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  static set<T>(key: string, val: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`sipadu_local_${key}`, JSON.stringify(val));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }
}

// -------------------------------------------------------------
// Scoring Logic (identical to Code.gs calculateExamScore)
// -------------------------------------------------------------
export function calculateExamScore(questions: Question[], answers: Record<string, any>) {
  let totalPoints = 0;
  let maxPoints = 0;

  function stripHtml(str: any): string {
    return String(str || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  questions.forEach((q) => {
    const weight = Number(q.point) || 10;
    maxPoints += weight;
    const userAns = answers[q.id];
    const keyRaw = q.correct_answer || '';
    const type = q.type;

    if (type === 'PG') {
      const cleanUser = stripHtml(userAns);
      const cleanKey = String(keyRaw).trim();
      let isCorrect = false;
      const mapHuruf = ['A', 'B', 'C', 'D', 'E'];
      const keyIndex = mapHuruf.indexOf(cleanKey.toUpperCase());

      if (keyIndex !== -1 && Array.isArray(q.options) && q.options[keyIndex]) {
        const correctText = stripHtml(q.options[keyIndex]);
        if (cleanUser === correctText && correctText !== '') isCorrect = true;
      } else {
        if (cleanUser !== '' && cleanKey !== '' && cleanUser === stripHtml(cleanKey)) isCorrect = true;
      }

      if (isCorrect) totalPoints += weight;
    } else if (type === 'PG_KOMPLEKS') {
      let keyArr: string[] = [];
      try {
        const parsed = JSON.parse(keyRaw);
        keyArr = Array.isArray(parsed) ? parsed : [];
      } catch {
        keyArr = String(keyRaw).split(',').map((s) => s.trim()).filter(Boolean);
      }

      let userArr: string[] = [];
      if (Array.isArray(userAns)) {
        userArr = userAns;
      } else {
        try {
          const parsed = JSON.parse(userAns);
          userArr = Array.isArray(parsed) ? parsed : [];
        } catch {
          userArr = String(userAns || '').split(',').map((s) => s.trim()).filter(Boolean);
        }
      }

      const mapHuruf = ['A', 'B', 'C', 'D', 'E'];
      const optionsArr = Array.isArray(q.options) ? q.options : [];
      const realKeyValues = keyArr.map((k) => {
        const cleanK = String(k).trim().toUpperCase();
        const idx = mapHuruf.indexOf(cleanK);
        if (idx !== -1 && optionsArr[idx]) {
          return stripHtml(optionsArr[idx]);
        }
        return stripHtml(k);
      }).filter(Boolean);

      const realUserValues = userArr.map((u) => stripHtml(u)).filter(Boolean);
      let matchCount = 0;
      let wrongCount = 0;

      realUserValues.forEach((val) => {
        if (realKeyValues.includes(val)) matchCount++;
        else wrongCount++;
      });

      if (wrongCount === 0 && matchCount > 0 && realKeyValues.length > 0) {
        totalPoints += (matchCount / realKeyValues.length) * weight;
      }
    } else if (type === 'BS') {
      let keyObj: Record<string, string> = {};
      try {
        keyObj = typeof keyRaw === 'object' ? keyRaw : JSON.parse(keyRaw);
      } catch {
        keyObj = {};
      }

      const ansObj = typeof userAns === 'object' && userAns !== null ? userAns : {};
      const totalRows = Object.keys(keyObj).length;
      if (totalRows > 0) {
        let matches = 0;
        for (const idx in keyObj) {
          const kVal = String(keyObj[idx]).trim().toLowerCase();
          const uVal = String(ansObj[idx] || '').trim().toLowerCase();
          const isMatch =
            kVal === uVal ||
            (kVal === 'benar' && uVal === 'sesuai') ||
            (kVal === 'salah' && uVal === 'tidak sesuai');
          if (isMatch) matches++;
        }
        totalPoints += (matches / totalRows) * weight;
      }
    } else if (type === 'JODOH') {
      let correctPairs: { q: string; a: string }[] = [];
      try {
        correctPairs = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
      } catch {
        correctPairs = [];
      }

      if (correctPairs.length > 0 && userAns && typeof userAns === 'object') {
        let matches = 0;
        correctPairs.forEach((pair) => {
          if (pair.q && userAns[pair.q] === pair.a) matches++;
        });
        totalPoints += (matches / correctPairs.length) * weight;
      }
    }
  });

  // Calculate final score 0-100 rounded to 2 decimals
  const finalScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100 * 100) / 100 : 0;
  return { score: finalScore, maxPoints, totalPoints };
}

// -------------------------------------------------------------
// Unified API Implementation (Supabase + Local fallback)
// -------------------------------------------------------------
export const api = {
  // Authentication
  async loginUser(userIdInput: string, passwordInput: string, isAdminLogin: boolean) {
    const cleanId = String(userIdInput).trim().toLowerCase();
    const cleanPass = String(passwordInput).trim();
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .ilike('id', cleanId)
          .eq('password', cleanPass)
          .maybeSingle();

        if (error) throw error;
        if (!data) return { success: false, message: 'User ID atau Password salah.' };
        if (!data.is_active) return { success: false, message: 'Akun Anda dinonaktifkan. Hubungi Admin.' };

        if ((data.role === 'Admin' || data.role === 'Guru') && !isAdminLogin) {
          return { success: false, message: 'Akses ditolak. Harap centang "Login sebagai Admin / Guru".' };
        }
        if (data.role === 'Siswa' && isAdminLogin) {
          return { success: false, message: 'Siswa tidak boleh login lewat akses Admin.' };
        }

        const token = crypto.randomUUID();
        await supabase.from('users').update({ session_token: token }).eq('id', data.id);

        return {
          success: true,
          token,
          role: data.role,
          userID: data.id,
          username: data.username,
          class: data.class,
        };
      } catch (err: any) {
        console.warn('Supabase login error, falling back:', err);
      }
    }

    // Local DB Fallback
    const users = LocalDB.get<User[]>('users', INITIAL_USERS);
    const user = users.find(
      (u) => u.id.toLowerCase() === cleanId && String(u.password).trim() === cleanPass
    );

    if (!user) return { success: false, message: 'User ID atau Password salah.' };
    if (!user.is_active) return { success: false, message: 'Akun Anda dinonaktifkan. Hubungi Admin.' };

    if ((user.role === 'Admin' || user.role === 'Guru') && !isAdminLogin) {
      return { success: false, message: 'Akses ditolak. Harap centang "Login sebagai Admin / Guru".' };
    }
    if (user.role === 'Siswa' && isAdminLogin) {
      return { success: false, message: 'Siswa tidak boleh login lewat akses Admin.' };
    }

    const token = crypto.randomUUID();
    user.session_token = token;
    LocalDB.set('users', users);

    return {
      success: true,
      token,
      role: user.role,
      userID: user.id,
      username: user.username,
      class: user.class,
    };
  },

  // Student: Get available exams
  async getStudentExamList(userId: string, userClass: string): Promise<{ success: boolean; exams?: StudentExamState[]; message?: string }> {
    const supabase = getSupabaseClient();
    let exams: Exam[] = [];
    let responses: StudentResponse[] = [];

    if (supabase) {
      try {
        const { data: examData } = await supabase.from('exams').select('*');
        if (examData) exams = examData;
        const { data: respData } = await supabase.from('responses').select('*').eq('user_id', userId);
        if (respData) responses = respData;
      } catch (err) {
        console.warn('Supabase fetch exams error:', err);
      }
    }

    if (exams.length === 0) {
      exams = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS);
      responses = LocalDB.get<StudentResponse[]>('responses', []).filter((r) => r.user_id === userId);
    }

    const now = new Date();
    const list: StudentExamState[] = [];

    exams.forEach((ex) => {
      const allowedClasses = String(ex.class).split(',').map((c) => c.trim().toLowerCase());
      if (userClass && !allowedClasses.includes(userClass.trim().toLowerCase())) return;

      const startObj = new Date(ex.date);
      const endObj = ex.end_date ? new Date(ex.end_date) : null;
      const myResp = responses.find((r) => r.exam_id === ex.id);

      let state: StudentExamState['state'] = 'aktif';

      if (myResp && myResp.status === 'Curang') {
        state = 'curang';
      } else if (myResp && (myResp.status === 'Completed' || myResp.status === 'Selesai')) {
        state = 'selesai';
      } else if (ex.status === 'Completed') {
        state = 'berakhir';
      } else if (ex.status !== 'Aktif') {
        state = 'nonaktif';
      } else if (now < startObj) {
        state = 'belum_mulai';
      } else if (endObj && now > endObj) {
        state = 'berakhir';
      } else {
        state = 'aktif';
      }

      list.push({
        id: ex.id,
        subject: ex.subject,
        examName: ex.exam_name || ex.subject,
        createdByName: ex.created_by_name || '',
        dateStr: new Date(ex.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        endDateStr: ex.end_date ? new Date(ex.end_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '',
        duration: ex.duration,
        state,
        responseId: myResp ? myResp.id : null,
        kkm: ex.kkm || 75,
      });
    });

    const priority = { aktif: 0, belum_mulai: 1, selesai: 2, curang: 3, berakhir: 4, nonaktif: 5 };
    list.sort((a, b) => priority[a.state] - priority[b.state]);

    return { success: true, exams: list };
  },

  // Student: Validate PIN & Start Exam
  async startExamWithPin(examId: string, pin: string, userId: string): Promise<{ success: boolean; examData?: Exam; message?: string }> {
    const supabase = getSupabaseClient();
    let exam: Exam | null = null;
    let existingResponse: StudentResponse | null = null;

    if (supabase) {
      try {
        const { data: ex } = await supabase.from('exams').select('*').eq('id', examId).maybeSingle();
        exam = ex;
        const { data: resp } = await supabase
          .from('responses')
          .select('*')
          .eq('exam_id', examId)
          .eq('user_id', userId)
          .maybeSingle();
        existingResponse = resp;
      } catch (err) {
        console.warn('Supabase startExam error:', err);
      }
    }

    if (!exam) {
      const exams = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS);
      exam = exams.find((e) => e.id === examId) || null;
      const responses = LocalDB.get<StudentResponse[]>('responses', []);
      existingResponse = responses.find((r) => r.exam_id === examId && r.user_id === userId) || null;
    }

    if (!exam) return { success: false, message: 'Ujian tidak ditemukan.' };

    if (existingResponse) {
      if (existingResponse.status === 'Curang') {
        return { success: false, message: 'AKSES DITOLAK: Anda telah didiskualifikasi dari ujian ini karena terdeteksi melakukan kecurangan. Hubungi pengawas/admin.' };
      }
      if (existingResponse.status === 'Completed' || existingResponse.status === 'Selesai') {
        return { success: false, message: 'Anda sudah menyelesaikan ujian ini.' };
      }
    }

    if (String(exam.pin).trim() !== String(pin).trim()) {
      return { success: false, message: 'PIN salah. Silakan tanyakan PIN sesi ke pengawas/guru.' };
    }

    if (exam.status !== 'Aktif') {
      return { success: false, message: 'Ujian ini belum diaktifkan oleh admin.' };
    }

    const now = new Date();
    if (new Date(exam.date) > now) {
      return { success: false, message: 'Waktu mulai ujian belum tiba.' };
    }
    if (exam.end_date && new Date(exam.end_date) < now) {
      return { success: false, message: 'Waktu ujian telah berakhir.' };
    }

    return { success: true, examData: exam };
  },

  // Student: Get Questions for exam (shuffled according to exam config)
  async getExamQuestions(examId: string, userId: string) {
    const supabase = getSupabaseClient();
    let questions: Question[] = [];
    let exam: Exam | null = null;
    let savedAnswers: Record<string, any> = {};
    let savedRemainingSeconds: number | null = null;

    if (supabase) {
      try {
        const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', examId);
        if (qData) questions = qData;
        const { data: exData } = await supabase.from('exams').select('*').eq('id', examId).maybeSingle();
        if (exData) exam = exData;
        const { data: resp } = await supabase
          .from('responses')
          .select('*')
          .eq('exam_id', examId)
          .eq('user_id', userId)
          .maybeSingle();

        if (resp) {
          savedAnswers = resp.answers_json || {};
          savedRemainingSeconds = resp.remaining_seconds ?? null;
        }
      } catch (err) {
        console.warn('Supabase getExamQuestions error:', err);
      }
    }

    if (questions.length === 0) {
      questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS).filter((q) => q.exam_id === examId);
      exam = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS).find((e) => e.id === examId) || null;
      const responses = LocalDB.get<StudentResponse[]>('responses', []);
      const resp = responses.find((r) => r.exam_id === examId && r.user_id === userId);
      if (resp) {
        savedAnswers = resp.answers_json || {};
        savedRemainingSeconds = resp.remaining_seconds ?? null;
      }
    }

    const shuffleCfg = exam?.shuffle_config || { PG: false, PG_KOMPLEKS: false, BS: false, JODOH: false, Esai: false };

    // Group questions by type: PG, PG_KOMPLEKS, BS, JODOH, Esai
    const listPG = questions.filter((q) => q.type === 'PG');
    const listPGK = questions.filter((q) => q.type === 'PG_KOMPLEKS');
    const listBS = questions.filter((q) => q.type === 'BS');
    const listJodoh = questions.filter((q) => q.type === 'JODOH');
    const listEsai = questions.filter((q) => q.type === 'Esai');

    const shuffleArray = <T>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const finalQuestions = [
      ...(shuffleCfg.PG ? shuffleArray(listPG) : listPG),
      ...(shuffleCfg.PG_KOMPLEKS ? shuffleArray(listPGK) : listPGK),
      ...(shuffleCfg.BS ? shuffleArray(listBS) : listBS),
      ...(shuffleCfg.JODOH ? shuffleArray(listJodoh) : listJodoh),
      ...(shuffleCfg.Esai ? shuffleArray(listEsai) : listEsai),
    ];

    // Sanitize correct answers for student view
    const sanitized = finalQuestions.map((q) => ({
      ...q,
      correct_answer: undefined,
    }));

    return {
      questions: sanitized,
      savedAnswers,
      savedRemainingSeconds,
    };
  },

  // Student: Autosave answers & heartbeat
  async syncAnswers(userId: string, examId: string, answers: Record<string, any>, remainingSeconds: number) {
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('responses')
          .select('id')
          .eq('user_id', userId)
          .eq('exam_id', examId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('responses')
            .update({
              answers_json: answers,
              remaining_seconds: remainingSeconds,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('responses').insert({
            id: `RSP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            user_id: userId,
            exam_id: examId,
            answers_json: answers,
            score: 0,
            start_time: new Date().toISOString(),
            status: 'In Progress',
            remaining_seconds: remainingSeconds,
          });
        }
        return { success: true };
      } catch (err) {
        console.warn('Supabase syncAnswers error:', err);
      }
    }

    // Local DB Fallback
    const responses = LocalDB.get<StudentResponse[]>('responses', []);
    const idx = responses.findIndex((r) => r.user_id === userId && r.exam_id === examId);

    if (idx !== -1) {
      responses[idx].answers_json = answers;
      responses[idx].remaining_seconds = remainingSeconds;
    } else {
      responses.push({
        id: `RSP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id: userId,
        exam_id: examId,
        answers_json: answers,
        score: 0,
        start_time: new Date().toISOString(),
        status: 'In Progress',
        remaining_seconds: remainingSeconds,
      });
    }

    LocalDB.set('responses', responses);
    return { success: true };
  },

  // Student: Submit exam
  async submitExam(userId: string, examId: string, answers: Record<string, any>, status: string = 'Completed', endToken?: string) {
    const supabase = getSupabaseClient();
    let questions: Question[] = [];
    let exam: Exam | null = null;

    if (supabase) {
      try {
        const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', examId);
        if (qData) questions = qData;
        const { data: exData } = await supabase.from('exams').select('*').eq('id', examId).maybeSingle();
        if (exData) exam = exData;
      } catch (err) {
        console.warn('Supabase fetch questions error:', err);
      }
    }

    if (questions.length === 0) {
      questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS).filter((q) => q.exam_id === examId);
      exam = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS).find((e) => e.id === examId) || null;
    }

    // Validate end token if manual finish
    if (status === 'Completed' && exam && exam.end_token && exam.end_token.trim()) {
      if (String(endToken || '').trim() !== String(exam.end_token).trim()) {
        return { success: false, wrongToken: true, message: 'Token Akhir Sesi salah!' };
      }
    }

    const { score } = calculateExamScore(questions, answers);
    const submitTime = new Date().toISOString();

    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('responses')
          .select('id')
          .eq('user_id', userId)
          .eq('exam_id', examId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('responses')
            .update({
              answers_json: answers,
              score,
              submit_time: submitTime,
              status,
              remaining_seconds: 0,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('responses').insert({
            id: `RSP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            user_id: userId,
            exam_id: examId,
            answers_json: answers,
            score,
            start_time: submitTime,
            submit_time: submitTime,
            status,
            remaining_seconds: 0,
          });
        }
        return { success: true, score };
      } catch (err: any) {
        console.warn('Supabase submit error:', err);
      }
    }

    // Local DB Fallback
    const responses = LocalDB.get<StudentResponse[]>('responses', []);
    const idx = responses.findIndex((r) => r.user_id === userId && r.exam_id === examId);

    if (idx !== -1) {
      responses[idx].answers_json = answers;
      responses[idx].score = score;
      responses[idx].submit_time = submitTime;
      responses[idx].status = status as any;
      responses[idx].remaining_seconds = 0;
    } else {
      responses.push({
        id: `RSP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id: userId,
        exam_id: examId,
        answers_json: answers,
        score,
        start_time: submitTime,
        submit_time: submitTime,
        status: status as any,
        remaining_seconds: 0,
      });
    }

    LocalDB.set('responses', responses);
    return { success: true, score };
  },

  // Student: Flag Curang (Anti-cheat trigger)
  async saveAndFlagCurang(userId: string, examId: string, answers: Record<string, any>, reason: string, remainingSeconds: number) {
    const supabase = getSupabaseClient();
    const logId = `LOG-${Date.now()}`;
    const timestamp = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('logs').insert({
          id: logId,
          user_id: userId,
          exam_id: examId,
          violation_count: 1,
          details: reason,
          timestamp,
        });

        const { data: existing } = await supabase
          .from('responses')
          .select('id')
          .eq('user_id', userId)
          .eq('exam_id', examId)
          .maybeSingle();

        if (existing) {
          await supabase.from('responses').update({
            answers_json: answers,
            status: 'Curang',
            remaining_seconds: remainingSeconds,
          }).eq('id', existing.id);
        } else {
          await supabase.from('responses').insert({
            id: `RSP-${Date.now()}`,
            user_id: userId,
            exam_id: examId,
            answers_json: answers,
            score: 0,
            start_time: timestamp,
            status: 'Curang',
            remaining_seconds: remainingSeconds,
          });
        }
        return { success: true };
      } catch (err) {
        console.warn('Supabase flagCurang error:', err);
      }
    }

    // Local DB Fallback
    const logs = LocalDB.get<Log[]>('logs', []);
    logs.push({
      id: logId,
      user_id: userId,
      exam_id: examId,
      violation_count: 1,
      details: reason,
      timestamp,
    });
    LocalDB.set('logs', logs);

    const responses = LocalDB.get<StudentResponse[]>('responses', []);
    const idx = responses.findIndex((r) => r.user_id === userId && r.exam_id === examId);
    if (idx !== -1) {
      responses[idx].answers_json = answers;
      responses[idx].status = 'Curang';
      responses[idx].remaining_seconds = remainingSeconds;
    } else {
      responses.push({
        id: `RSP-${Date.now()}`,
        user_id: userId,
        exam_id: examId,
        answers_json: answers,
        score: 0,
        start_time: timestamp,
        status: 'Curang',
        remaining_seconds: remainingSeconds,
      });
    }
    LocalDB.set('responses', responses);
    return { success: true };
  },

  // Student & Admin: Get detailed results for a response
  async getStudentAnswerDetail(responseId: string) {
    const supabase = getSupabaseClient();
    let resp: StudentResponse | null = null;
    let questions: Question[] = [];
    let user: User | null = null;
    let exam: Exam | null = null;

    if (supabase) {
      try {
        const { data: r } = await supabase.from('responses').select('*').eq('id', responseId).maybeSingle();
        resp = r;
        if (r) {
          const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', r.exam_id);
          if (qData) questions = qData;
          const { data: u } = await supabase.from('users').select('*').eq('id', r.user_id).maybeSingle();
          if (u) user = u;
          const { data: ex } = await supabase.from('exams').select('*').eq('id', r.exam_id).maybeSingle();
          if (ex) exam = ex;
        }
      } catch (err) {
        console.warn('Supabase getDetail error:', err);
      }
    }

    if (!resp) {
      const responses = LocalDB.get<StudentResponse[]>('responses', []);
      resp = responses.find((r) => r.id === responseId) || null;
      if (resp) {
        questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS).filter((q) => q.exam_id === resp!.exam_id);
        user = LocalDB.get<User[]>('users', INITIAL_USERS).find((u) => u.id === resp!.user_id) || null;
        exam = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS).find((e) => e.id === resp!.exam_id) || null;
      }
    }

    if (!resp) return { success: false, message: 'Data respon tidak ditemukan.' };

    const studentAnswers = resp.answers_json || {};
    const manualEssayTotal = studentAnswers['_manual_essay_score'] !== undefined
      ? parseFloat(studentAnswers['_manual_essay_score'])
      : null;

    let totalEssayWeight = 0;
    questions.forEach((q) => {
      if (q.type === 'Esai') {
        totalEssayWeight += Number(q.point) || 10;
      }
    });

    const details: QuestionAnswerDetail[] = questions.map((q, idx) => {
      const weight = Number(q.point) || 10;
      const userAns = studentAnswers[q.id];
      const keyRaw = q.correct_answer || '';
      const type = q.type;

      let isCorrect = false;
      let pointItem = 0;

      if (type === 'Esai') {
        if (manualEssayTotal !== null && totalEssayWeight > 0) {
          pointItem = (weight / totalEssayWeight) * manualEssayTotal;
          isCorrect = pointItem > 0;
        }
      } else if (type === 'PG') {
        const cleanUser = String(userAns || '').trim().toLowerCase();
        const cleanKey = String(keyRaw).trim().toLowerCase();
        isCorrect = cleanUser !== '' && cleanKey !== '' && cleanUser === cleanKey;
        if (isCorrect) pointItem = weight;
      } else if (type === 'PG_KOMPLEKS') {
        let keyArr: string[] = [];
        try { keyArr = JSON.parse(keyRaw); } catch { keyArr = [keyRaw]; }
        let userArr: string[] = [];
        if (Array.isArray(userAns)) userArr = userAns;
        else { try { userArr = JSON.parse(userAns); } catch { userArr = [userAns]; } }

        const kNorm = keyArr.map((k) => String(k).trim().toLowerCase());
        const uNorm = userArr.map((u) => String(u).trim().toLowerCase());
        let matches = 0;
        let wrongs = 0;
        uNorm.forEach((u) => { if (kNorm.includes(u)) matches++; else wrongs++; });
        if (wrongs === 0 && matches > 0) {
          pointItem = (matches / kNorm.length) * weight;
          isCorrect = true;
        }
      } else if (type === 'BS') {
        let keyObj: Record<string, string> = {};
        try { keyObj = typeof keyRaw === 'object' ? keyRaw : JSON.parse(keyRaw); } catch {}
        const total = Object.keys(keyObj).length;
        if (total > 0 && typeof userAns === 'object' && userAns !== null) {
          let matches = 0;
          for (const k in keyObj) {
            const kv = String(keyObj[k]).trim().toLowerCase();
            const uv = String(userAns[k] || '').trim().toLowerCase();
            if (kv === uv || (kv === 'benar' && uv === 'sesuai') || (kv === 'salah' && uv === 'tidak sesuai')) matches++;
          }
          pointItem = (matches / total) * weight;
          isCorrect = pointItem > 0;
        }
      } else if (type === 'JODOH') {
        let pairs: { q: string; a: string }[] = [];
        try { pairs = Array.isArray(q.options) ? q.options : JSON.parse(q.options); } catch {}
        if (pairs.length > 0 && typeof userAns === 'object' && userAns !== null) {
          let matches = 0;
          pairs.forEach((p) => {
            if (p.q && userAns[p.q] === p.a) matches++;
          });
          pointItem = (matches / pairs.length) * weight;
          isCorrect = pointItem > 0;
        }
      }

      let displayAnswer = '';
      if (!userAns) displayAnswer = '(Tidak Dijawab)';
      else if (Array.isArray(userAns)) displayAnswer = userAns.join(', ');
      else if (typeof userAns === 'object') displayAnswer = Object.entries(userAns).map(([k, v]) => `${k} -> ${v}`).join(' | ');
      else displayAnswer = String(userAns);

      return {
        id: q.id,
        number: idx + 1,
        q: q.content,
        type: q.type,
        studentAns: displayAnswer,
        rawStudentAns: userAns,
        key: keyRaw,
        pairs: q.type === 'JODOH' ? (Array.isArray(q.options) ? q.options : []) : null,
        isCorrect,
        image: q.image_url,
        point: Math.round(pointItem * 100) / 100,
        maxPoint: weight,
      };
    });

    return {
      success: true,
      data: details,
      name: user?.username || resp.user_id,
      finalScore: resp.score,
      examSubject: exam?.subject || '',
      examName: exam?.exam_name || '',
    };
  },

  // Admin & Teacher: Get Exam List
  async getExamList(): Promise<Exam[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('exams').select('*').order('date', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase getExamList error:', err);
      }
    }
    return LocalDB.get<Exam[]>('exams', INITIAL_EXAMS);
  },

  // Admin: Create Exam
  async createExam(exam: Partial<Exam>) {
    const newId = `EXM-${String(exam.subject || 'MAPEL').toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Math.floor(1000 + Math.random() * 9000)}`;
    const fullExam: Exam = {
      id: newId,
      exam_name: exam.exam_name || 'Ujian Baru',
      subject: exam.subject || 'Umum',
      class: exam.class || 'XII-RPL',
      date: exam.date || new Date().toISOString(),
      end_date: exam.end_date || new Date(Date.now() + 86400000).toISOString(),
      duration: Number(exam.duration) || 60,
      pin: String(exam.pin || Math.floor(10000 + Math.random() * 90000)),
      status: exam.status || 'Aktif',
      shuffle_config: exam.shuffle_config || { PG: false, PG_KOMPLEKS: false, BS: false, JODOH: false, Esai: false },
      end_token: exam.end_token || '',
      created_by_name: exam.created_by_name || 'Admin',
      kkm: Number(exam.kkm) || 75,
    };

    const cleanExamData = {
      id: fullExam.id,
      exam_name: fullExam.exam_name,
      subject: fullExam.subject,
      class: fullExam.class,
      date: fullExam.date,
      end_date: fullExam.end_date,
      duration: fullExam.duration,
      pin: fullExam.pin,
      status: fullExam.status,
      shuffle_config: fullExam.shuffle_config,
      end_token: fullExam.end_token,
      created_by_name: fullExam.created_by_name,
      kkm: fullExam.kkm,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('exams').insert(cleanExamData);
        if (error) throw error;
        const exams = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS);
        exams.unshift(fullExam);
        LocalDB.set('exams', exams);
        return { success: true, exam: fullExam };
      } catch (err: any) {
        console.warn('Supabase createExam error:', err);
        return { success: false, message: err.message };
      }
    }

    const exams = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS);
    exams.unshift(fullExam);
    LocalDB.set('exams', exams);
    return { success: true, exam: fullExam };
  },

  // Admin: Update Exam
  async updateExam(exam: Partial<Exam> & { examId?: string; id?: string }) {
    const targetId = exam.examId || exam.id;
    if (!targetId) return { success: false, message: 'ID Ujian tidak ditemukan' };

    const cleanExamData: any = {};
    if (exam.exam_name !== undefined) cleanExamData.exam_name = exam.exam_name;
    if (exam.subject !== undefined) cleanExamData.subject = exam.subject;
    if (exam.class !== undefined) cleanExamData.class = exam.class;
    if (exam.date !== undefined) cleanExamData.date = exam.date;
    if (exam.end_date !== undefined) cleanExamData.end_date = exam.end_date;
    if (exam.duration !== undefined) cleanExamData.duration = Number(exam.duration);
    if (exam.pin !== undefined) cleanExamData.pin = String(exam.pin);
    if (exam.status !== undefined) cleanExamData.status = exam.status;
    if (exam.shuffle_config !== undefined) cleanExamData.shuffle_config = exam.shuffle_config;
    if (exam.end_token !== undefined) cleanExamData.end_token = exam.end_token;
    if (exam.created_by_name !== undefined) cleanExamData.created_by_name = exam.created_by_name;
    if (exam.kkm !== undefined) cleanExamData.kkm = Number(exam.kkm);
    cleanExamData.updated_at = new Date().toISOString();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('exams').update(cleanExamData).eq('id', targetId);
        if (error) throw error;
        const exams = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS);
        const idx = exams.findIndex((e) => e.id === targetId);
        if (idx !== -1) {
          exams[idx] = { ...exams[idx], ...cleanExamData } as Exam;
          LocalDB.set('exams', exams);
        }
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase updateExam error:', err);
        return { success: false, message: err.message };
      }
    }

    const exams = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS);
    const idx = exams.findIndex((e) => e.id === targetId);
    if (idx !== -1) {
      exams[idx] = { ...exams[idx], ...cleanExamData } as Exam;
      LocalDB.set('exams', exams);
      return { success: true };
    }
    return { success: false, message: 'Ujian tidak ditemukan' };
  },

  // Admin: Delete Exam
  async deleteExam(examId: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('exams').delete().eq('id', examId);
        if (error) throw error;
        const exams = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS).filter((e) => e.id !== examId);
        LocalDB.set('exams', exams);
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase deleteExam error:', err);
        return { success: false, message: err.message };
      }
    }

    const exams = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS).filter((e) => e.id !== examId);
    LocalDB.set('exams', exams);
    return { success: true };
  },

  // Admin: Toggle Exam Status
  async toggleExamStatus(examId: string, currentStatus: string) {
    const newStatus = currentStatus === 'Aktif' ? 'Non-Aktif' : 'Aktif';
    return this.updateExam({ id: examId, status: newStatus as any });
  },

  // Admin: Get Questions by Exam
  async getQuestionsByExam(examId: string): Promise<Question[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('questions').select('*').eq('exam_id', examId);
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase getQuestions error:', err);
      }
    }
    return LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS).filter((q) => q.exam_id === examId);
  },

  // Admin: Add Question
  async addQuestion(question: Partial<Question>) {
    const newQ: Question = {
      id: question.id || `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      exam_id: question.exam_id || '',
      type: question.type || 'PG',
      content: question.content || '',
      image_url: question.image_url || '',
      options: question.options || [],
      correct_answer: question.correct_answer || '',
      is_required: question.is_required !== false,
      point: Number(question.point) || 10,
    };

    const cleanQ = {
      id: newQ.id,
      exam_id: newQ.exam_id,
      type: newQ.type,
      content: newQ.content,
      image_url: newQ.image_url,
      options: newQ.options,
      correct_answer: newQ.correct_answer,
      is_required: newQ.is_required,
      point: newQ.point,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('questions').insert(cleanQ);
        if (error) throw error;
        const questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS);
        questions.push(newQ);
        LocalDB.set('questions', questions);
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase addQuestion error:', err);
        return { success: false, message: err.message };
      }
    }

    const questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS);
    questions.push(newQ);
    LocalDB.set('questions', questions);
    return { success: true };
  },

  // Admin: Update Question
  async updateQuestion(question: Partial<Question> & { id: string }) {
    const cleanQ: any = {};
    if (question.type !== undefined) cleanQ.type = question.type;
    if (question.content !== undefined) cleanQ.content = question.content;
    if (question.image_url !== undefined) cleanQ.image_url = question.image_url;
    if (question.options !== undefined) cleanQ.options = question.options;
    if (question.correct_answer !== undefined) cleanQ.correct_answer = question.correct_answer;
    if (question.is_required !== undefined) cleanQ.is_required = question.is_required;
    if (question.point !== undefined) cleanQ.point = Number(question.point);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('questions').update(cleanQ).eq('id', question.id);
        if (error) throw error;
        const questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS);
        const idx = questions.findIndex((q) => q.id === question.id);
        if (idx !== -1) {
          questions[idx] = { ...questions[idx], ...cleanQ };
          LocalDB.set('questions', questions);
        }
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase updateQuestion error:', err);
        return { success: false, message: err.message };
      }
    }

    const questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS);
    const idx = questions.findIndex((q) => q.id === question.id);
    if (idx !== -1) {
      questions[idx] = { ...questions[idx], ...cleanQ };
      LocalDB.set('questions', questions);
      return { success: true };
    }
    return { success: false, message: 'Soal tidak ditemukan' };
  },

  // Admin: Delete Question
  async deleteQuestion(qId: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('questions').delete().eq('id', qId);
        if (error) throw error;
        const questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS).filter((q) => q.id !== qId);
        LocalDB.set('questions', questions);
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase deleteQuestion error:', err);
        return { success: false, message: err.message };
      }
    }
    const questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS).filter((q) => q.id !== qId);
    LocalDB.set('questions', questions);
    return { success: true };
  },

  // Admin: Bulk Delete Questions
  async deleteQuestionsBulk(ids: string[]) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('questions').delete().in('id', ids);
        return { success: true, deleted: ids.length };
      } catch (err) {
        console.warn('Supabase bulk delete error:', err);
      }
    }
    const questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS).filter((q) => !ids.includes(q.id));
    LocalDB.set('questions', questions);
    return { success: true, deleted: ids.length };
  },

  // Admin: Save Imported Questions (Excel / Batch)
  async saveImportedQuestions(examId: string, questionsData: any[]) {
    const newItems: Question[] = questionsData.map((q, i) => ({
      id: `Q-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      exam_id: examId,
      type: q.type || 'PG',
      content: q.content || '',
      image_url: q.image || q.image_url || '',
      options: q.options || [],
      correct_answer: q.correct || q.correct_answer || '',
      is_required: q.isRequired === 'TRUE' || q.is_required !== false,
      point: Number(q.point) || 10,
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('questions').insert(newItems);
        if (error) throw error;
        const questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS);
        questions.push(...newItems);
        LocalDB.set('questions', questions);
        return { success: true, count: newItems.length };
      } catch (err: any) {
        console.warn('Supabase import questions error:', err);
        return { success: false, message: err.message || 'Gagal menyimpan soal ke Supabase', count: 0 };
      }
    }

    const questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS);
    questions.push(...newItems);
    LocalDB.set('questions', questions);
    return { success: true, count: newItems.length };
  },

  // Admin: Copy Questions from Exam to Exam
  async copyQuestions(sourceExamId: string, destExamId: string) {
    const sourceQuestions = await this.getQuestionsByExam(sourceExamId);
    if (sourceQuestions.length === 0) return { success: false, message: 'Tidak ada soal di ujian sumber' };

    const duplicated = sourceQuestions.map((q) => ({
      ...q,
      exam_id: destExamId,
    }));

    return this.saveImportedQuestions(destExamId, duplicated);
  },

  // Admin: Get Exam Results
  async getExamResults(examId: string) {
    const supabase = getSupabaseClient();
    let responses: StudentResponse[] = [];
    let users: User[] = [];

    if (supabase) {
      try {
        const { data: rData } = await supabase.from('responses').select('*').eq('exam_id', examId);
        if (rData) responses = rData;
        const { data: uData } = await supabase.from('users').select('*');
        if (uData) users = uData;
      } catch (err) {
        console.warn('Supabase getExamResults error:', err);
      }
    }

    if (responses.length === 0) {
      responses = LocalDB.get<StudentResponse[]>('responses', []).filter((r) => r.exam_id === examId);
      users = LocalDB.get<User[]>('users', INITIAL_USERS);
    }

    const userMap = new Map(users.map((u) => [u.id, u]));

    return responses.map((r) => {
      const u = userMap.get(r.user_id);
      return {
        responseId: r.id,
        studentId: r.user_id,
        name: u?.username || r.user_id,
        class: u?.class || '-',
        examId: r.exam_id,
        answers: JSON.stringify(r.answers_json || {}),
        score: r.score,
        startTime: r.start_time ? new Date(r.start_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-',
        submitTime: r.submit_time ? new Date(r.submit_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-',
        status: r.status,
      };
    });
  },

  // Admin: Save Essay Grade (Recalculates total score)
  async saveEssayGrade(responseId: string, essayScoreInput: number) {
    const supabase = getSupabaseClient();
    let resp: StudentResponse | null = null;
    let questions: Question[] = [];

    if (supabase) {
      try {
        const { data: r } = await supabase.from('responses').select('*').eq('id', responseId).maybeSingle();
        resp = r;
        if (r) {
          const { data: q } = await supabase.from('questions').select('*').eq('exam_id', r.exam_id);
          if (q) questions = q;
        }
      } catch (err) {
        console.warn('Supabase saveEssayGrade fetch error:', err);
      }
    }

    if (!resp) {
      const responses = LocalDB.get<StudentResponse[]>('responses', []);
      resp = responses.find((r) => r.id === responseId) || null;
      if (resp) {
        questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS).filter((q) => q.exam_id === resp!.exam_id);
      }
    }

    if (!resp) return { success: false, message: 'Data respon tidak ditemukan.' };

    const answers = resp.answers_json || {};
    answers['_manual_essay_score'] = essayScoreInput;

    const { score: baseObjScore, maxPoints } = calculateExamScore(
      questions.filter((q) => q.type !== 'Esai'),
      answers
    );

    const totalWeight = questions.reduce((sum, q) => sum + (Number(q.point) || 10), 0);
    const objWeight = questions.filter((q) => q.type !== 'Esai').reduce((sum, q) => sum + (Number(q.point) || 10), 0);
    const rawObjPoints = (baseObjScore / 100) * objWeight;
    const finalTotalPoints = rawObjPoints + Number(essayScoreInput);
    const newFinalScore = totalWeight > 0 ? Math.round((finalTotalPoints / totalWeight) * 100 * 100) / 100 : 0;

    if (supabase) {
      try {
        await supabase
          .from('responses')
          .update({
            answers_json: answers,
            score: newFinalScore,
          })
          .eq('id', responseId);
        return { success: true, finalScore: newFinalScore };
      } catch (err: any) {
        console.warn('Supabase saveEssayGrade update error:', err);
      }
    }

    const responses = LocalDB.get<StudentResponse[]>('responses', []);
    const idx = responses.findIndex((r) => r.id === responseId);
    if (idx !== -1) {
      responses[idx].answers_json = answers;
      responses[idx].score = newFinalScore;
      LocalDB.set('responses', responses);
    }

    return { success: true, finalScore: newFinalScore };
  },

  // Admin: Unlock Student (revert from Curang to In Progress)
  async unlockStudentExam(responseId: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('responses').update({ status: 'In Progress' }).eq('id', responseId);
        return { success: true, message: 'Akses siswa telah dibuka kembali.' };
      } catch (err: any) {
        console.warn('Supabase unlock error:', err);
      }
    }
    const responses = LocalDB.get<StudentResponse[]>('responses', []);
    const idx = responses.findIndex((r) => r.id === responseId);
    if (idx !== -1) {
      responses[idx].status = 'In Progress';
      LocalDB.set('responses', responses);
    }
    return { success: true, message: 'Akses siswa telah dibuka kembali.' };
  },

  // Admin: Reset Student Exam
  async resetStudentExam(responseId: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('responses').delete().eq('id', responseId);
        return { success: true, message: 'Data ujian berhasil di-reset.' };
      } catch (err: any) {
        console.warn('Supabase reset error:', err);
      }
    }
    const responses = LocalDB.get<StudentResponse[]>('responses', []).filter((r) => r.id !== responseId);
    LocalDB.set('responses', responses);
    return { success: true, message: 'Data ujian berhasil di-reset.' };
  },

  // Admin: Force Finish Student Exam
  async forceFinishStudentExam(responseId: string) {
    const supabase = getSupabaseClient();
    let resp: StudentResponse | null = null;
    let questions: Question[] = [];

    if (supabase) {
      try {
        const { data: r } = await supabase.from('responses').select('*').eq('id', responseId).maybeSingle();
        resp = r;
        if (r) {
          const { data: q } = await supabase.from('questions').select('*').eq('exam_id', r.exam_id);
          if (q) questions = q;
        }
      } catch (err) {}
    }

    if (!resp) {
      const responses = LocalDB.get<StudentResponse[]>('responses', []);
      resp = responses.find((r) => r.id === responseId) || null;
      if (resp) {
        questions = LocalDB.get<Question[]>('questions', INITIAL_QUESTIONS).filter((q) => q.exam_id === resp!.exam_id);
      }
    }

    if (!resp) return { success: false, message: 'Data respon tidak ditemukan.' };

    const { score } = calculateExamScore(questions, resp.answers_json || {});
    const now = new Date().toISOString();

    if (supabase) {
      try {
        await supabase
          .from('responses')
          .update({
            score,
            status: 'Completed',
            submit_time: now,
            remaining_seconds: 0,
          })
          .eq('id', responseId);
        return { success: true, message: `Ujian berhasil diselesaikan secara paksa (Skor: ${score}).`, score };
      } catch (err: any) {}
    }

    const responses = LocalDB.get<StudentResponse[]>('responses', []);
    const idx = responses.findIndex((r) => r.id === responseId);
    if (idx !== -1) {
      responses[idx].score = score;
      responses[idx].status = 'Completed';
      responses[idx].submit_time = now;
      responses[idx].remaining_seconds = 0;
      LocalDB.set('responses', responses);
    }
    return { success: true, message: `Ujian berhasil diselesaikan secara paksa (Skor: ${score}).`, score };
  },

  // Admin: Realtime Monitor Data
  async getExamMonitorData() {
    const supabase = getSupabaseClient();
    let users: User[] = [];
    let exams: Exam[] = [];
    let responses: StudentResponse[] = [];
    let logs: Log[] = [];

    if (supabase) {
      try {
        const [uRes, eRes, rRes, lRes] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('exams').select('*'),
          supabase.from('responses').select('*'),
          supabase.from('logs').select('*'),
        ]);
        if (uRes.data) users = uRes.data;
        if (eRes.data) exams = eRes.data;
        if (rRes.data) responses = rRes.data;
        if (lRes.data) logs = lRes.data;
      } catch (err) {}
    }

    if (users.length === 0) users = LocalDB.get<User[]>('users', INITIAL_USERS);
    if (exams.length === 0) exams = LocalDB.get<Exam[]>('exams', INITIAL_EXAMS);
    if (responses.length === 0) responses = LocalDB.get<StudentResponse[]>('responses', []);
    if (logs.length === 0) logs = LocalDB.get<Log[]>('logs', []);

    const examMap = new Map(exams.map((e) => [e.id, e]));
    const studentUsers = users.filter((u) => u.role === 'Siswa');

    const result = {
      belumLogin: [] as any[],
      sudahLogin: [] as any[],
      mengerjakan: [] as any[],
      selesai: [] as any[],
      curang: [] as any[],
    };

    const studentsWithResponse = new Set<string>();

    responses.forEach((r) => {
      const u = users.find((user) => user.id === r.user_id);
      const ex = examMap.get(r.exam_id);
      const violCount = logs.filter((l) => l.user_id === r.user_id && l.exam_id === r.exam_id).length;

      studentsWithResponse.add(`${r.user_id}|${r.exam_id}`);

      const entry = {
        responseId: r.id,
        userID: r.user_id,
        nama: u?.username || r.user_id,
        kelas: u?.class || '-',
        examID: r.exam_id,
        mapel: ex?.subject || '-',
        startTime: r.start_time ? new Date(r.start_time).toLocaleTimeString('id-ID') : '-',
        submitTime: r.submit_time ? new Date(r.submit_time).toLocaleTimeString('id-ID') : '-',
        score: r.score ?? '-',
        violations: violCount,
      };

      const s = String(r.status).toLowerCase();
      if (s === 'in progress' || s === 'ulangi') result.mengerjakan.push({ ...entry, _status: 'mengerjakan' });
      else if (s === 'completed' || s === 'selesai') result.selesai.push({ ...entry, _status: 'selesai' });
      else if (s === 'curang') result.curang.push({ ...entry, _status: 'curang' });
    });

    // Students with no response
    studentUsers.forEach((u) => {
      exams.forEach((ex) => {
        const allowed = ex.class.split(',').map((c) => c.trim().toLowerCase());
        if (!allowed.includes(u.class.trim().toLowerCase())) return;
        if (studentsWithResponse.has(`${u.id}|${ex.id}`)) return;

        const entry = {
          responseId: null,
          userID: u.id,
          nama: u.username,
          kelas: u.class,
          examID: ex.id,
          mapel: ex.subject,
          startTime: '-',
          submitTime: '-',
          score: '-',
          violations: 0,
        };

        if (u.session_token && u.session_token.length > 5) {
          result.sudahLogin.push({ ...entry, _status: 'sudahLogin' });
        } else {
          result.belumLogin.push({ ...entry, _status: 'belumLogin' });
        }
      });
    });

    const dropdownKelas = [...new Set(studentUsers.map((s) => s.class))].filter(Boolean).sort();
    const dropdownMapel = [...new Set(exams.map((e) => e.subject))].filter(Boolean).sort();

    return {
      success: true,
      data: result,
      meta: {
        dropdownKelas,
        dropdownMapel,
      },
    };
  },

  // Admin: User Management
  async getUserList(): Promise<User[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').order('username', { ascending: true });
        if (!error && data) return data;
      } catch (err) {}
    }
    return LocalDB.get<User[]>('users', INITIAL_USERS);
  },

  async createUser(user: Partial<User>) {
    const cleanId = (user.id || `SIS-${Date.now().toString().slice(-5)}`).trim();
    const cleanUsername = (user.username || 'User Baru').trim();
    const cleanPassword = (user.password || 'siswa123').trim();
    const cleanRole = user.role || 'Siswa';
    const cleanClass = (user.class || '-').trim();

    const newUser: User = {
      id: cleanId,
      username: cleanUsername,
      password: cleanPassword,
      role: cleanRole,
      class: cleanClass,
      is_active: user.is_active !== false,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('users').insert(newUser);
        if (error) {
          if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
            return { success: false, message: `ID Pengguna "${cleanId}" sudah terdaftar di database!` };
          }
          throw error;
        }
        const users = LocalDB.get<User[]>('users', INITIAL_USERS);
        const exists = users.findIndex((u) => u.id === newUser.id);
        if (exists !== -1) users[exists] = newUser;
        else users.push(newUser);
        LocalDB.set('users', users);
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase createUser error:', err);
        return { success: false, message: err.message || 'Gagal menyimpan pengguna ke database' };
      }
    }

    const users = LocalDB.get<User[]>('users', INITIAL_USERS);
    if (users.some((u) => u.id === newUser.id)) {
      return { success: false, message: `User ID "${cleanId}" sudah terdaftar!` };
    }
    users.push(newUser);
    LocalDB.set('users', users);
    return { success: true };
  },

  async updateUser(user: Partial<User> & { id: string }) {
    const cleanUser: any = {};
    if (user.username !== undefined) cleanUser.username = user.username;
    if (user.password !== undefined) cleanUser.password = user.password;
    if (user.role !== undefined) cleanUser.role = user.role;
    if (user.class !== undefined) cleanUser.class = user.class;
    if (user.is_active !== undefined) cleanUser.is_active = user.is_active;
    cleanUser.updated_at = new Date().toISOString();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('users').update(cleanUser).eq('id', user.id);
        if (error) throw error;
        const users = LocalDB.get<User[]>('users', INITIAL_USERS);
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...cleanUser };
          LocalDB.set('users', users);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    }

    const users = LocalDB.get<User[]>('users', INITIAL_USERS);
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...cleanUser };
      LocalDB.set('users', users);
      return { success: true };
    }
    return { success: false, message: 'User tidak ditemukan' };
  },

  async importUsersBulk(usersList: Partial<User>[]) {
    const cleanList = usersList.map((u, i) => ({
      id: u.id ? String(u.id).trim() : `SIS-${Date.now()}-${i}`,
      username: String(u.username || 'Siswa').trim(),
      password: String(u.password || 'siswa123').trim(),
      role: u.role || 'Siswa',
      class: String(u.class || '-').trim(),
      is_active: u.is_active !== false,
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('users').upsert(cleanList, { onConflict: 'id' });
        if (error) throw error;
        const current = LocalDB.get<User[]>('users', INITIAL_USERS);
        cleanList.forEach((item) => {
          const idx = current.findIndex((c) => c.id === item.id);
          if (idx !== -1) current[idx] = item as User;
          else current.push(item as User);
        });
        LocalDB.set('users', current);
        return { success: true, count: cleanList.length };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    }

    const current = LocalDB.get<User[]>('users', INITIAL_USERS);
    cleanList.forEach((item) => {
      const idx = current.findIndex((c) => c.id === item.id);
      if (idx !== -1) current[idx] = item as User;
      else current.push(item as User);
    });
    LocalDB.set('users', current);
    return { success: true, count: cleanList.length };
  },

  async deleteUser(userId: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('users').delete().eq('id', userId);
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    }

    const users = LocalDB.get<User[]>('users', INITIAL_USERS).filter((u) => u.id !== userId);
    LocalDB.set('users', users);
    return { success: true };
  },

  async toggleUserStatus(userId: string, currentStatus: boolean) {
    return this.updateUser({ id: userId, is_active: !currentStatus });
  },

  // Master Data
  async getMasterData(): Promise<MasterData> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('master_data').select('*');
        let classes: string[] = [];
        let subjects: string[] = [];

        if (data && data.length > 0) {
          classes = data.filter((d) => d.type === 'class').map((d) => d.value.trim()).filter(Boolean);
          subjects = data.filter((d) => d.type === 'subject').map((d) => d.value.trim()).filter(Boolean);
        }

        // Also discover any classes and subjects existing in exams or users table
        try {
          const { data: exData } = await supabase.from('exams').select('class, subject');
          if (exData) {
            exData.forEach((ex) => {
              if (ex.class) {
                ex.class.split(',').forEach((c: string) => {
                  const clean = c.trim();
                  if (clean && clean !== '-' && !classes.includes(clean)) classes.push(clean);
                });
              }
              if (ex.subject && !subjects.includes(ex.subject.trim())) {
                subjects.push(ex.subject.trim());
              }
            });
          }

          const { data: uData } = await supabase.from('users').select('class').eq('role', 'Siswa');
          if (uData) {
            uData.forEach((u) => {
              if (u.class) {
                const clean = u.class.trim();
                if (clean && clean !== '-' && !classes.includes(clean)) classes.push(clean);
              }
            });
          }
        } catch (e) {}

        if (classes.length > 0 || subjects.length > 0) {
          const result = {
            classes: classes.length > 0 ? Array.from(new Set(classes)).sort() : INITIAL_MASTER_DATA.classes,
            subjects: subjects.length > 0 ? Array.from(new Set(subjects)).sort() : INITIAL_MASTER_DATA.subjects,
          };
          LocalDB.set('master_data', result);
          return result;
        }
      } catch (err) {}
    }
    return LocalDB.get<MasterData>('master_data', INITIAL_MASTER_DATA);
  },

  async saveMasterData(data: MasterData) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('master_data').delete().neq('id', 0);
        const rows = [
          ...data.classes.map((c) => ({ type: 'class', value: c })),
          ...data.subjects.map((s) => ({ type: 'subject', value: s })),
        ];
        if (rows.length > 0) {
          await supabase.from('master_data').insert(rows);
        }
        return { success: true, message: 'Data Master berhasil disimpan di Supabase' };
      } catch (err: any) {
        console.warn('Supabase saveMasterData error:', err);
      }
    }

    LocalDB.set('master_data', data);
    return { success: true, message: 'Data Master berhasil disimpan' };
  },

  // App Configuration
  async getAppConfig(): Promise<AppConfig> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('konfigurasi').select('*');
        if (data && data.length > 0) {
          const cfg: any = { ...INITIAL_CONFIG };
          data.forEach((row) => {
            cfg[row.key] = row.value;
          });
          return cfg;
        }
      } catch (err) {}
    }
    return LocalDB.get<AppConfig>('config', INITIAL_CONFIG);
  },

  async saveAppConfig(cfg: Partial<AppConfig>) {
    const current = await this.getAppConfig();
    const updated = { ...current, ...cfg };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const entries = Object.entries(updated).map(([key, value]) => ({ key, value: String(value) }));
        await supabase.from('konfigurasi').upsert(entries);
        return { success: true, message: 'Konfigurasi berhasil diperbarui di Supabase' };
      } catch (err: any) {
        console.warn('Supabase saveConfig error:', err);
      }
    }

    LocalDB.set('config', updated);
    return { success: true, message: 'Konfigurasi berhasil disimpan' };
  },

  // Gallery Images
  async getSavedImages(): Promise<SavedImage[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('gambar').select('*').order('date_added', { ascending: false });
        if (data) {
          return data.map((d) => ({
            id: d.id,
            name: d.file_name,
            link: d.direct_link,
            date: d.date_added ? new Date(d.date_added).toLocaleDateString('id-ID') : '-',
          }));
        }
      } catch (err) {}
    }
    return LocalDB.get<SavedImage[]>('images', [
      { id: 'IMG-01', name: 'Logo Tut Wuri Handayani', link: INITIAL_CONFIG.app_logo, date: '01/01/2026' },
      { id: 'IMG-02', name: 'Background Sekolah Modern', link: INITIAL_CONFIG.app_background, date: '01/01/2026' },
    ]);
  },

  async addSavedImage(name: string, link: string) {
    const img: SavedImage = {
      id: `IMG-${Date.now()}`,
      name,
      link,
      date: new Date().toLocaleDateString('id-ID'),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('gambar').insert({
          id: img.id,
          file_name: img.name,
          direct_link: img.link,
          preview: img.link,
        });
        return { success: true };
      } catch (err) {}
    }

    const images = LocalDB.get<SavedImage[]>('images', []);
    images.unshift(img);
    LocalDB.set('images', images);
    return { success: true };
  },

  async deleteSavedImage(id: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('gambar').delete().eq('id', id);
        return { success: true };
      } catch (err) {}
    }
    const images = LocalDB.get<SavedImage[]>('images', []).filter((i) => i.id !== id);
    LocalDB.set('images', images);
    return { success: true };
  },
};
