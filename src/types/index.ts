export type Role = 'Admin' | 'Guru' | 'Siswa';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
  class: string;
  session_token?: string;
  is_active: boolean;
  created_at?: string;
}

export interface ShuffleConfig {
  PG: boolean;
  PG_KOMPLEKS: boolean;
  BS: boolean;
  JODOH: boolean;
  Esai: boolean;
}

export interface Exam {
  id: string;
  exam_name: string;
  subject: string;
  class: string;
  date: string;
  end_date: string;
  duration: number;
  pin: string;
  status: 'Aktif' | 'Non-Aktif' | 'Completed';
  shuffle_config?: ShuffleConfig;
  end_token?: string;
  created_by_name?: string;
  kkm?: number;
  dateStr?: string;
  endDateStr?: string;
}

export type QuestionType = 'PG' | 'PG_KOMPLEKS' | 'BS' | 'JODOH' | 'Esai';

export interface MatchingPair {
  q: string;
  a: string;
}

export interface Question {
  id: string;
  exam_id: string;
  type: QuestionType;
  content: string;
  image_url?: string;
  options: string[] | MatchingPair[] | any;
  correct_answer?: string;
  is_required: boolean;
  point: number;
  shuffledRights?: string[];
}

export type ExamStatus = 'In Progress' | 'Completed' | 'Selesai' | 'Curang' | 'Ulangi';

export interface StudentResponse {
  id: string;
  user_id: string;
  exam_id: string;
  answers_json: Record<string, any>;
  score: number;
  start_time: string;
  submit_time?: string;
  status: ExamStatus;
  remaining_seconds?: number;
  // Enriched
  student_name?: string;
  student_class?: string;
}

export interface ExamResultRow {
  responseId: string;
  studentId: string;
  name: string;
  class: string;
  examId: string;
  answers: string;
  score: number;
  startTime: string;
  submitTime: string;
  status: string;
}

export interface QuestionAnswerDetail {
  id: string;
  number: number;
  q: string;
  type: QuestionType;
  studentAns: any;
  rawStudentAns?: any;
  key: string;
  pairs?: MatchingPair[] | null;
  isCorrect: boolean;
  image?: string;
  point: number;
  maxPoint: number;
}

export interface StudentExamState {
  id: string;
  subject: string;
  examName: string;
  createdByName?: string;
  dateStr: string;
  endDateStr?: string;
  duration: number;
  state: 'aktif' | 'belum_mulai' | 'selesai' | 'curang' | 'berakhir' | 'nonaktif';
  responseId?: string | null;
  kkm?: number;
}

export interface Log {
  id: string;
  user_id: string;
  exam_id: string;
  violation_count: number;
  details: string;
  timestamp: string;
}

export interface SavedImage {
  id: string;
  name: string;
  link: string;
  folderId?: string;
  date: string;
}

export interface AppConfig {
  app_name: string;
  app_subtitle: string;
  app_logo: string;
  app_background: string;
  show_exam_result: string;
  school_dinas: string;
  school_uptd: string;
  school_name: string;
  school_address: string;
  principal_name: string;
  principal_nip: string;
  timezone?: string;
}

export interface MasterData {
  classes: string[];
  subjects: string[];
}
