import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { AppConfig, Exam, MasterData, Question, SavedImage, User } from '../types';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Database,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Home,
  Image as ImageIcon,
  Key,
  Layers,
  Lock,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  downloadClassReportExcel,
  downloadQuestionTemplateExcel,
  downloadResultsAsExcel,
  downloadUserTemplateExcel,
  parseQuestionsExcel,
  parseUsersExcel,
} from '../lib/excelExport';
import { ConfirmModal } from './ConfirmModal';

interface AdminDashboardProps {
  user: User;
  config: AppConfig;
  onLogout: () => void;
  onUpdateConfig: (cfg: AppConfig) => void;
  onOpenSupabaseModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  config,
  onLogout,
  onUpdateConfig,
  onOpenSupabaseModal,
}) => {
  const [activeTab, setActiveTab] = useState<string>('dash-home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Cached data
  const [exams, setExams] = useState<Exam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [masterData, setMasterData] = useState<MasterData>({ classes: [], subjects: [] });
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);

  // Exam Management State
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examForm, setExamForm] = useState({
    exam_name: '',
    subject: '',
    class: [] as string[],
    date: '',
    end_date: '',
    duration: 60,
    pin: '',
    end_token: '',
    created_by_name: '',
    kkm: 75,
    shuffle_config: { PG: false, PG_KOMPLEKS: false, BS: false, JODOH: false, Esai: false },
  });

  // Question Bank State
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [qSearch, setQSearch] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Results State
  const [selectedResultExamId, setSelectedResultExamId] = useState<string>('');
  const [resultRows, setResultRows] = useState<any[]>([]);
  const [resultClassFilter, setResultClassFilter] = useState<string>('');
  const [resultSearch, setResultSearch] = useState<string>('');
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [gradingResponseId, setGradingResponseId] = useState<string>('');
  const [gradingDetail, setGradingDetail] = useState<any>(null);
  const [essayScoreInput, setEssayScoreInput] = useState<number>(0);

  // User Management State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [userForm, setUserForm] = useState({
    id: '',
    username: '',
    password: '',
    role: 'Siswa' as 'Admin' | 'Guru' | 'Siswa',
    class: '',
  });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Dynamically discover all active classes from master data, exams, and existing users
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    masterData.classes.forEach((c) => {
      if (c && c.trim() && c.trim() !== '-') set.add(c.trim());
    });
    exams.forEach((ex) => {
      if (ex.class) {
        ex.class.split(',').forEach((c) => {
          const clean = c.trim();
          if (clean && clean !== '-') set.add(clean);
        });
      }
    });
    users.forEach((u) => {
      if (u.role === 'Siswa' && u.class && u.class !== '-') {
        set.add(u.class.trim());
      }
    });
    const arr = Array.from(set);
    return arr.length > 0 ? arr.sort() : ['7A', '7B', '7C'];
  }, [masterData.classes, exams, users]);

  // Real-time Monitor State
  const [monitorData, setMonitorData] = useState<any>(null);
  const [monitorTab, setMonitorTab] = useState('semua');
  const [monitorSearch, setMonitorSearch] = useState('');
  const [monitorClassFilter, setMonitorClassFilter] = useState('');
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorSelectedIds, setMonitorSelectedIds] = useState<string[]>([]);

  // Config State
  const [configForm, setConfigForm] = useState<AppConfig>(config);

  // Master Data State
  const [newClassInput, setNewClassInput] = useState('');
  const [newSubjectInput, setNewSubjectInput] = useState('');

  // Images State
  const [folderUrlInput, setFolderUrlInput] = useState('');

  // Confirmation & Alert Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    isAlertOnly?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, type: 'danger' | 'warning' | 'info' | 'success' = 'info') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'OK',
      isAlertOnly: true,
      onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
    });
  };

  // Initial fetch
  const refreshAllData = async () => {
    try {
      const [exList, uList, mData, imgs] = await Promise.all([
        api.getExamList(),
        api.getUserList(),
        api.getMasterData(),
        api.getSavedImages(),
      ]);
      setExams(exList);
      setUsers(uList);
      setMasterData(mData);
      setSavedImages(imgs);
      const currentSelectedExamValid = exList.some((e) => e.id === selectedExamId);
      if (exList.length > 0 && (!selectedExamId || !currentSelectedExamValid)) {
        setSelectedExamId(exList[0].id);
      } else if (exList.length === 0) {
        setSelectedExamId('');
      }

      const currentResultExamValid = exList.some((e) => e.id === selectedResultExamId);
      if (exList.length > 0 && (!selectedResultExamId || !currentResultExamValid)) {
        setSelectedResultExamId(exList[0].id);
      } else if (exList.length === 0) {
        setSelectedResultExamId('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Fetch questions when selectedExamId changes
  useEffect(() => {
    if (selectedExamId) {
      api.getQuestionsByExam(selectedExamId).then(setQuestions);
    } else {
      setQuestions([]);
    }
  }, [selectedExamId]);

  // Fetch results when selectedResultExamId changes
  useEffect(() => {
    if (selectedResultExamId) {
      api.getExamResults(selectedResultExamId).then(setResultRows);
    } else {
      setResultRows([]);
    }
  }, [selectedResultExamId]);

  // Load monitor data
  const loadMonitor = async () => {
    setMonitorLoading(true);
    try {
      const res = await api.getExamMonitorData();
      if (res.success) {
        setMonitorData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMonitorLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dash-monitor') {
      loadMonitor();
      const interval = setInterval(loadMonitor, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Role permissions
  const isGuru = user.role === 'Guru';

  // --- Handlers: Exams ---
  const handleOpenExamModal = (ex?: Exam) => {
    if (ex) {
      setEditingExam(ex);
      setExamForm({
        exam_name: ex.exam_name,
        subject: ex.subject,
        class: ex.class.split(',').map((c) => c.trim()),
        date: ex.date.slice(0, 16),
        end_date: ex.end_date ? ex.end_date.slice(0, 16) : '',
        duration: ex.duration,
        pin: ex.pin,
        end_token: ex.end_token || '',
        created_by_name: ex.created_by_name || user.username,
        kkm: ex.kkm || 75,
        shuffle_config: ex.shuffle_config || { PG: false, PG_KOMPLEKS: false, BS: false, JODOH: false, Esai: false },
      });
    } else {
      const now = new Date();
      const next = new Date(now.getTime() + 2 * 3600000);
      setEditingExam(null);
      setExamForm({
        exam_name: '',
        subject: masterData.subjects[0] || 'Matematika',
        class: masterData.classes[0] ? [masterData.classes[0]] : ['XII-RPL'],
        date: now.toISOString().slice(0, 16),
        end_date: next.toISOString().slice(0, 16),
        duration: 60,
        pin: String(Math.floor(10000 + Math.random() * 90000)),
        end_token: 'SELESAI2026',
        created_by_name: user.username,
        kkm: 75,
        shuffle_config: { PG: false, PG_KOMPLEKS: false, BS: false, JODOH: false, Esai: false },
      });
    }
    setExamModalOpen(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (examForm.class.length === 0) {
      showAlert('Pilih Kelas', 'Pilih atau masukkan minimal satu kelas untuk jadwal ujian ini!', 'warning');
      return;
    }
    if (!examForm.exam_name.trim()) {
      showAlert('Nama Ujian Diperlukan', 'Nama ujian tidak boleh kosong!', 'warning');
      return;
    }

    const payload = {
      ...examForm,
      class: examForm.class.join(','),
      date: new Date(examForm.date).toISOString(),
      end_date: new Date(examForm.end_date).toISOString(),
    };

    let res;
    if (editingExam) {
      res = await api.updateExam({ ...payload, id: editingExam.id });
    } else {
      res = await api.createExam(payload);
      if (res && res.success && res.exam) {
        setSelectedExamId(res.exam.id);
        setSelectedResultExamId(res.exam.id);
      }
    }

    if (res && !res.success) {
      showAlert('Gagal Menyimpan Jadwal', res.message || 'Terjadi kesalahan saat menyimpan jadwal.', 'warning');
      return;
    }

    setExamModalOpen(false);
    showAlert('Berhasil!', `Jadwal ujian "${payload.exam_name}" berhasil disimpan.`, 'success');
    refreshAllData();
  };

  const handleDeleteExam = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Jadwal Ujian?',
      message: 'Yakin ingin menghapus jadwal ujian ini? Data soal dan nilai terkait akan dihapus permanen.',
      type: 'danger',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await api.deleteExam(id);
        if (selectedExamId === id) {
          const remaining = exams.filter((e) => e.id !== id);
          setSelectedExamId(remaining.length > 0 ? remaining[0].id : '');
        }
        if (selectedResultExamId === id) {
          const remaining = exams.filter((e) => e.id !== id);
          setSelectedResultExamId(remaining.length > 0 ? remaining[0].id : '');
        }
        refreshAllData();
      },
    });
  };

  const handleToggleExamStatus = async (ex: Exam) => {
    await api.toggleExamStatus(ex.id, ex.status);
    refreshAllData();
  };

  // --- Handlers: Question Bank ---
  const handleOpenQuestionModal = (q?: Question) => {
    // Determine active valid exam ID
    let targetExamId = selectedExamId;
    if (!targetExamId || !exams.some((e) => e.id === targetExamId)) {
      targetExamId = exams.length > 0 ? exams[0].id : '';
      if (targetExamId) setSelectedExamId(targetExamId);
    }

    if (!targetExamId) {
      showAlert('Belum Ada Jadwal Ujian', 'Silakan buat jadwal ujian terlebih dahulu di menu "Jadwal Ujian" sebelum menambah butir soal.', 'warning');
      return;
    }

    if (q) {
      setEditingQuestion({ ...q, exam_id: q.exam_id || targetExamId });
    } else {
      setEditingQuestion({
        id: '',
        exam_id: targetExamId,
        type: 'PG',
        content: '',
        options: ['', '', '', '', ''],
        correct_answer: '',
        is_required: true,
        point: 20,
      });
    }
    setQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (q: Question) => {
    const rawTargetId = q.exam_id || selectedExamId;
    const targetExam = exams.find((e) => e.id === rawTargetId) || exams[0];

    if (!targetExam) {
      showAlert('Jadwal Tidak Valid', 'Jadwal ujian tidak ditemukan di database. Pastikan jadwal ujian sudah dibuat dan dipilih.', 'warning');
      return;
    }

    if (!q.content || !q.content.trim()) {
      showAlert('Soal Kosong', 'Teks pertanyaan tidak boleh kosong!', 'warning');
      return;
    }

    // Type-specific validations
    if (q.type === 'PG') {
      if (!q.correct_answer || !q.correct_answer.trim()) {
        showAlert('Kunci Jawaban Kosong', 'Silakan pilih kunci jawaban yang benar untuk soal Pilihan Ganda (klik huruf opsi A-E).', 'warning');
        return;
      }
    } else if (q.type === 'PG_KOMPLEKS') {
      let keys: any[] = [];
      try {
        keys = JSON.parse(q.correct_answer || '[]');
      } catch {
        keys = String(q.correct_answer || '').split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (!Array.isArray(keys) || keys.length === 0) {
        showAlert('Kunci Jawaban Kosong', 'Silakan centang setidaknya satu jawaban yang benar untuk soal PG Kompleks.', 'warning');
        return;
      }
    } else if (q.type === 'BS') {
      const stmts = Array.isArray(q.options) ? q.options : [];
      if (stmts.length === 0 || stmts.some((s) => !String(s).trim())) {
        showAlert('Pernyataan Belum Lengkap', 'Semua butir teks pernyataan Benar/Salah harus diisi.', 'warning');
        return;
      }
    } else if (q.type === 'JODOH') {
      const pairs = Array.isArray(q.options) ? q.options : [];
      if (pairs.length === 0 || pairs.some((p: any) => !p.q || !p.q.trim() || !p.a || !p.a.trim())) {
        showAlert('Pasangan Menjodohkan Belum Lengkap', 'Pastikan semua baris premis kiri dan pasangan jawaban kanan sudah terisi.', 'warning');
        return;
      }
    }

    const finalQ = { ...q, exam_id: targetExam.id };
    if (q.type === 'JODOH') {
      const pairs = Array.isArray(q.options) ? q.options : [];
      finalQ.correct_answer = pairs.map((p: any) => `${p.q.trim()} ➔ ${p.a.trim()}`).join(' | ');
    }

    let res;
    if (editingQuestion && editingQuestion.id) {
      res = await api.updateQuestion(finalQ);
    } else {
      res = await api.addQuestion(finalQ);
    }

    if (res && !res.success) {
      showAlert('Gagal Menyimpan Soal', res.message || 'Terjadi kesalahan saat menyimpan soal.', 'warning');
      return;
    }

    setQuestionModalOpen(false);
    showAlert('Berhasil!', 'Butir soal berhasil disimpan ke bank soal.', 'success');
    api.getQuestionsByExam(targetExam.id).then(setQuestions);
  };

  const handleImportQuestionsExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rawTargetId = selectedExamId || (exams[0] ? exams[0].id : '');
    const targetExam = exams.find((e) => e.id === rawTargetId) || exams[0];
    if (!targetExam) {
      showAlert('Pilih Ujian', 'Silakan buat atau pilih jadwal ujian yang valid terlebih dahulu sebelum mengimport soal.', 'warning');
      e.target.value = '';
      return;
    }

    try {
      const parsedQuestions = await parseQuestionsExcel(file);
      if (parsedQuestions.length === 0) {
        showAlert(
          'File Kosong / Format Salah',
          'Tidak ada butir soal yang terbaca. Pastikan menggunakan format kolom sesuai Template Excel (Tipe, Pertanyaan, Opsi_A..E, Kunci_Jawaban, Bobot, Wajib).',
          'warning'
        );
        e.target.value = '';
        return;
      }

      const res = await api.saveImportedQuestions(targetExam.id, parsedQuestions);
      if (res.success) {
        showAlert('Import Berhasil!', `Berhasil mengimport ${res.count || parsedQuestions.length} butir soal ke bank soal ujian "${targetExam.exam_name}"!`, 'success');
        api.getQuestionsByExam(targetExam.id).then(setQuestions);
      } else {
        showAlert('Import Gagal', res.message || 'Terjadi kesalahan saat menyimpan soal ke database.', 'warning');
      }
    } catch (err: any) {
      showAlert('Gagal Membaca File', err.message || 'Format file Excel tidak dapat dibaca.', 'danger');
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteQuestion = (qid: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Soal?',
      message: 'Soal ini akan dihapus dari bank soal ujian.',
      type: 'danger',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await api.deleteQuestion(qid);
        api.getQuestionsByExam(selectedExamId).then(setQuestions);
      },
    });
  };

  const handleBulkDeleteQuestions = () => {
    if (selectedQuestionIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: `Hapus ${selectedQuestionIds.length} Soal?`,
      message: 'Semua butir soal yang dipilih akan dihapus permanen.',
      type: 'danger',
      confirmText: 'Ya, Hapus Semua',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await api.deleteQuestionsBulk(selectedQuestionIds);
        setSelectedQuestionIds([]);
        api.getQuestionsByExam(selectedExamId).then(setQuestions);
      },
    });
  };

  // Batch Parser: 1. Soal ... A. ... B. ... Jawaban: A
  const parseBatchQuestions = () => {
    if (!batchText.trim()) return;
    const blocks = batchText.trim().split(/\n\s*\n/);
    const parsedList: any[] = [];

    blocks.forEach((b) => {
      const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      let content = '';
      const options: string[] = [];
      let correctLetter = '';

      lines.forEach((line) => {
        if (/^(jawaban|kunci|answer)\s*:\s*([a-e])/i.test(line)) {
          const match = line.match(/:\s*([a-e])/i);
          if (match) correctLetter = match[1].toUpperCase();
          return;
        }
        const optMatch = line.match(/^([a-e])[.)]\s+(.+)/i);
        if (optMatch) {
          options.push(optMatch[2].trim());
          return;
        }
        const numMatch = line.match(/^\d+[.)]\s+(.+)/);
        if (numMatch) {
          content = numMatch[1].trim();
          return;
        }
        if (!content) content = line;
      });

      if (content && options.length >= 2) {
        let correctText = '';
        if (correctLetter) {
          const charCode = correctLetter.charCodeAt(0) - 65;
          if (options[charCode]) correctText = options[charCode];
        }
        parsedList.push({
          type: 'PG',
          content,
          options,
          correct: correctText,
          point: 20,
          isRequired: 'TRUE',
        });
      }
    });

    if (parsedList.length === 0) {
      showAlert('Format Belum Sesuai', 'Tidak ada soal yang berhasil dikenali. Pastikan format ada nomor dan pilihan A-E.', 'warning');
      return;
    }

    const rawTargetId = selectedExamId || (exams[0] ? exams[0].id : '');
    const targetExam = exams.find((e) => e.id === rawTargetId) || exams[0];
    if (!targetExam) {
      showAlert('Pilih Ujian', 'Silakan buat atau pilih jadwal ujian terlebih dahulu.', 'warning');
      return;
    }

    api.saveImportedQuestions(targetExam.id, parsedList).then((res) => {
      if (res && res.success) {
        setBatchModalOpen(false);
        setBatchText('');
        showAlert('Berhasil!', `Berhasil mengimport ${parsedList.length} butir soal ke bank soal ujian "${targetExam.exam_name}".`, 'success');
        api.getQuestionsByExam(targetExam.id).then(setQuestions);
      } else {
        showAlert('Gagal Import', (res && res.message) || 'Terjadi kesalahan saat menyimpan soal ke database.', 'warning');
      }
    });
  };

  // --- Handlers: Results & Grading ---
  const handleOpenGradingModal = async (responseId: string) => {
    setGradingResponseId(responseId);
    setGradingModalOpen(true);
    setGradingDetail(null);
    try {
      const res = await api.getStudentAnswerDetail(responseId);
      if (res.success && res.data) {
        setGradingDetail(res);
        const existingEssay = res.data.find((d: any) => d.type === 'Esai');
        setEssayScoreInput(existingEssay ? existingEssay.point : 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGrading = async () => {
    if (!gradingResponseId) return;
    await api.saveEssayGrade(gradingResponseId, essayScoreInput);
    setGradingModalOpen(false);
    api.getExamResults(selectedResultExamId).then(setResultRows);
  };

  const handleUnlockStudent = (respId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Buka Akses Siswa?',
      message: 'Siswa dapat login kembali dan melanjutkan pengerjaan ujian.',
      type: 'success',
      confirmText: 'Buka Akses',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await api.unlockStudentExam(respId);
        api.getExamResults(selectedResultExamId).then(setResultRows);
      },
    });
  };

  const handleResetStudent = (respId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Ujian Siswa?',
      message: 'Semua jawaban siswa akan dihapus dan siswa dapat mengulang ujian dari awal.',
      type: 'danger',
      confirmText: 'Ya, Reset',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await api.resetStudentExam(respId);
        api.getExamResults(selectedResultExamId).then(setResultRows);
      },
    });
  };

  // --- Handlers: User Management ---
  const handleOpenUserModal = (u?: User) => {
    if (u) {
      setEditingUser(u);
      const isKnown = availableClasses.includes(u.class || '');
      setIsCustomClass(!isKnown && Boolean(u.class && u.class !== '-'));
      setUserForm({
        id: u.id,
        username: u.username,
        password: u.password || '123456',
        role: u.role,
        class: u.class || '-',
      });
    } else {
      setEditingUser(null);
      setIsCustomClass(false);
      const prefix = isGuru ? 'SIS' : 'SIS';
      const randomNum = Math.floor(100 + Math.random() * 900);
      const defaultClass = availableClasses[0] || '7A';
      setUserForm({
        id: `${prefix}-${randomNum}`,
        username: '',
        password: 'siswa123',
        role: 'Siswa',
        class: defaultClass,
      });
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.id || !userForm.id.trim()) {
      showAlert('ID Diperlukan', 'User ID / NIS tidak boleh kosong!', 'warning');
      return;
    }
    if (!userForm.username || !userForm.username.trim()) {
      showAlert('Nama Diperlukan', 'Nama lengkap pengguna tidak boleh kosong!', 'warning');
      return;
    }

    let res;
    if (editingUser) {
      res = await api.updateUser(userForm);
    } else {
      res = await api.createUser(userForm);
    }

    if (res && !res.success) {
      showAlert('Gagal Menyimpan Pengguna', res.message || 'Terjadi kesalahan saat menyimpan pengguna.', 'warning');
      return;
    }

    setUserModalOpen(false);
    showAlert('Berhasil!', `Pengguna "${userForm.username}" (${userForm.id}) berhasil disimpan!`, 'success');
    api.getUserList().then(setUsers);
  };

  const handleImportUsersExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedUsers = await parseUsersExcel(file);
      if (parsedUsers.length === 0) {
        showAlert(
          'File Kosong / Format Salah',
          'Tidak ada data pengguna yang terbaca. Pastikan format kolom sesuai dengan Template Excel (Username, Password, Role, Mapel, Kelas, ID).',
          'warning'
        );
        e.target.value = '';
        return;
      }

      const res = await api.importUsersBulk(parsedUsers);
      if (res.success) {
        showAlert('Import User Berhasil!', `Berhasil mengimport ${res.count || parsedUsers.length} data pengguna ke sistem!`, 'success');
        api.getUserList().then(setUsers);
      } else {
        showAlert('Import Gagal', res.message || 'Terjadi kesalahan saat menyimpan data pengguna.', 'warning');
      }
    } catch (err: any) {
      showAlert('Gagal Membaca File', err.message || 'Format file Excel tidak dapat dibaca.', 'danger');
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteUser = (uid: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Pengguna?',
      message: 'Akun pengguna ini akan dihapus dari sistem.',
      type: 'danger',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await api.deleteUser(uid);
        api.getUserList().then(setUsers);
      },
    });
  };

  const handleToggleUserStatus = async (u: User) => {
    await api.toggleUserStatus(u.id, u.is_active);
    api.getUserList().then(setUsers);
  };

  // Selected exam object
  const currentExamObj = exams.find((e) => e.id === selectedResultExamId) || exams[0];

  return (
    <div className="flex h-screen bg-[#EFEAE0] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`sidebar-bg fixed md:relative z-40 h-full flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Sidebar Brand Lockup */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-700/50 bg-[#0f172a]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <GraduationCap className="w-5 h-5 text-amber-300" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <h1 className="text-white font-bold text-base tracking-tight truncate">
                  {config.app_name || 'SIPADU CBT'}
                </h1>
                <p className="text-[11px] text-slate-400">Admin Console v3.3</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex text-slate-400 hover:text-white"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-4 border-b border-slate-700/50">
          <div className="bg-slate-800/60 rounded-xl p-3 flex items-center gap-3 border border-slate-700">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.username}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{user.role}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button
            onClick={() => setActiveTab('dash-home')}
            className={`sidebar-item w-full ${activeTab === 'dash-home' ? 'active' : ''}`}
          >
            <Home className="w-4 h-4 mr-3 shrink-0" />
            {!sidebarCollapsed && <span>Dashboard Overview</span>}
          </button>

          <button
            onClick={() => setActiveTab('dash-exams')}
            className={`sidebar-item w-full ${activeTab === 'dash-exams' ? 'active' : ''}`}
          >
            <Calendar className="w-4 h-4 mr-3 shrink-0" />
            {!sidebarCollapsed && <span>Jadwal Ujian</span>}
          </button>

          <button
            onClick={() => setActiveTab('dash-questions')}
            className={`sidebar-item w-full ${activeTab === 'dash-questions' ? 'active' : ''}`}
          >
            <BookOpen className="w-4 h-4 mr-3 shrink-0" />
            {!sidebarCollapsed && <span>Bank Soal</span>}
          </button>

          <button
            onClick={() => setActiveTab('dash-results')}
            className={`sidebar-item w-full ${activeTab === 'dash-results' ? 'active' : ''}`}
          >
            <FileSpreadsheet className="w-4 h-4 mr-3 shrink-0" />
            {!sidebarCollapsed && <span>Hasil &amp; Nilai</span>}
          </button>

          <button
            onClick={() => setActiveTab('dash-users')}
            className={`sidebar-item w-full ${activeTab === 'dash-users' ? 'active' : ''}`}
          >
            <Users className="w-4 h-4 mr-3 shrink-0" />
            {!sidebarCollapsed && <span>Manajemen User</span>}
          </button>

          <button
            onClick={() => setActiveTab('dash-monitor')}
            className={`sidebar-item w-full ${activeTab === 'dash-monitor' ? 'active' : ''}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-3 shrink-0" />
            {!sidebarCollapsed && <span>Monitor Real-time</span>}
          </button>

          <button
            onClick={() => setActiveTab('dash-master')}
            className={`sidebar-item w-full ${activeTab === 'dash-master' ? 'active' : ''}`}
          >
            <Layers className="w-4 h-4 mr-3 shrink-0" />
            {!sidebarCollapsed && <span>Data Master</span>}
          </button>

          <button
            onClick={() => setActiveTab('dash-images')}
            className={`sidebar-item w-full ${activeTab === 'dash-images' ? 'active' : ''}`}
          >
            <ImageIcon className="w-4 h-4 mr-3 shrink-0" />
            {!sidebarCollapsed && <span>Folder Gambar</span>}
          </button>

          {!isGuru && (
            <button
              onClick={() => setActiveTab('dash-config')}
              className={`sidebar-item w-full ${activeTab === 'dash-config' ? 'active' : ''}`}
            >
              <Settings className="w-4 h-4 mr-3 shrink-0" />
              {!sidebarCollapsed && <span>Konfigurasi Sekolah</span>}
            </button>
          )}

          {/* Database & Vercel Guide Tab */}
          <button
            onClick={() => setActiveTab('dash-supabase')}
            className={`sidebar-item w-full text-emerald-300 hover:text-emerald-200 ${
              activeTab === 'dash-supabase' ? 'active bg-emerald-600/80 text-white' : ''
            }`}
          >
            <Database className="w-4 h-4 mr-3 shrink-0 text-emerald-400" />
            {!sidebarCollapsed && <span className="font-bold">Panduan Supabase &amp; Vercel</span>}
          </button>
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-200 bg-red-950/40 hover:bg-red-600 hover:text-white transition border border-red-800/40"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 font-heading">
              {activeTab === 'dash-home' && 'Dashboard Overview'}
              {activeTab === 'dash-exams' && 'Manajemen Jadwal Ujian'}
              {activeTab === 'dash-questions' && 'Bank Soal Ujian'}
              {activeTab === 'dash-results' && 'Laporan Hasil & Penilaian'}
              {activeTab === 'dash-users' && 'Manajemen Pengguna'}
              {activeTab === 'dash-monitor' && 'Monitor Ujian Real-time'}
              {activeTab === 'dash-master' && 'Data Master Kelas & Mapel'}
              {activeTab === 'dash-images' && 'Generator Link Gambar'}
              {activeTab === 'dash-config' && 'Konfigurasi Aplikasi'}
              {activeTab === 'dash-supabase' && 'Migrasi Supabase, GitHub & Vercel'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSupabaseModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-100 transition"
              title="Setelan Supabase Database"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Supabase Database</span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold shadow-sm hover:bg-red-600 hover:text-white transition"
              title="Keluar dari akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
            <div className="hidden sm:block text-right border-l border-slate-200 pl-3 text-xs text-slate-500 font-medium">
              <div>{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {/* TAB 1: DASHBOARD HOME OVERVIEW */}
          {activeTab === 'dash-home' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Welcome banner */}
              <div className="dash-card p-6 bg-gradient-to-r from-white via-white to-amber-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 font-heading">
                    Selamat datang kembali, {user.username}!
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Sistem ujian CBT kini terhubung langsung dengan Supabase PostgreSQL dan siap deploy ke Vercel.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenExamModal()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Jadwal Baru</span>
                  </button>
                  <button
                    onClick={refreshAllData}
                    className="px-3.5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="dash-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Total Jadwal Ujian
                      </p>
                      <h4 className="text-3xl font-black text-slate-800 mt-1">{exams.length}</h4>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    <span className="text-emerald-600 font-bold">
                      {exams.filter((e) => e.status === 'Aktif').length} Aktif
                    </span>{' '}
                    berlangsung
                  </p>
                </div>

                <div className="dash-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Total Siswa &amp; Guru
                      </p>
                      <h4 className="text-3xl font-black text-slate-800 mt-1">{users.length}</h4>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    {users.filter((u) => u.role === 'Siswa').length} Siswa terdaftar
                  </p>
                </div>

                <div className="dash-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Mata Pelajaran
                      </p>
                      <h4 className="text-3xl font-black text-slate-800 mt-1">
                        {masterData.subjects.length}
                      </h4>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">{masterData.classes.length} Rombongan Belajar</p>
                </div>

                <div className="dash-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Engine Status
                      </p>
                      <h4 className="text-xl font-black text-emerald-600 mt-2">Active &amp; Ready</h4>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Server className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">PostgreSQL · Vercel Edge</p>
                </div>
              </div>

              {/* Quick Actions & Guidelines Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="dash-card p-6">
                  <h4 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Panduan Alur Kerja CBT
                  </h4>
                  <ul className="space-y-3 text-xs text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-[10px]">
                        1
                      </span>
                      <span>
                        <b>Kelola Jadwal Ujian:</b> Tentukan nama ujian, mapel, kelas peserta, durasi, PIN sesi, dan token akhir sesi.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-[10px]">
                        2
                      </span>
                      <span>
                        <b>Siapkan Bank Soal:</b> Tambahkan soal secara manual, gunakan batch paste (otomatis mengenali nomor dan opsi), atau import file Excel.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-[10px]">
                        3
                      </span>
                      <span>
                        <b>Pantau Real-time:</b> Buka menu Monitor Real-time saat ujian untuk memantau status siswa, membuka blokir curang, atau force-finish.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-[10px]">
                        4
                      </span>
                      <span>
                        <b>Rekap &amp; Cetak:</b> Unduh rekap Excel lengkap dengan kop surat resmi sekolah dan tanda tangan kepala sekolah.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="dash-card p-6">
                  <h4 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    Migrasi Dari Spreadsheet ke Supabase
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Kelebihan utama database Supabase dibandingkan Google Sheets adalah performa concurrency tinggi (tahan ratusan siswa submit serentak tanpa lock timeout), integritas relasional, dan API REST instan.
                  </p>
                  <button
                    onClick={() => setActiveTab('dash-supabase')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-2"
                  >
                    <span>Buka Panduan SQL &amp; Vercel Deployment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JADWAL UJIAN */}
          {activeTab === 'dash-exams' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="dash-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Manajemen Jadwal Ujian</h3>
                  <p className="text-xs text-slate-500">Kelola jadwal, durasi waktu, PIN sesi, dan token akhir.</p>
                </div>
                <button
                  onClick={() => handleOpenExamModal()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Jadwal Baru</span>
                </button>
              </div>

              <div className="dash-card overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <th className="p-3 text-center w-12">No</th>
                        <th className="p-3">Nama Ujian &amp; Mapel</th>
                        <th className="p-3">Kelas</th>
                        <th className="p-3">Waktu Pelaksanaan</th>
                        <th className="p-3 text-center">PIN</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exams.map((ex, idx) => (
                        <tr key={ex.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{ex.exam_name}</div>
                            <div className="text-xs text-slate-500">{ex.subject}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                              {ex.class}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 text-xs space-y-0.5">
                            <div>Mulai: {new Date(ex.date).toLocaleString('id-ID')}</div>
                            <div className="text-slate-400">Durasi: {ex.duration} menit</div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold bg-amber-50/50 text-amber-800 text-xs">
                            {ex.pin}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleExamStatus(ex)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                                ex.status === 'Aktif'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {ex.status}
                            </button>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => handleOpenExamModal(ex)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                              title="Edit Jadwal"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExam(ex.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANK SOAL */}
          {activeTab === 'dash-questions' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="dash-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1 w-full md:w-auto">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Pilih Ujian untuk Mengelola Soal:
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full md:w-96 px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.exam_name} — {e.subject} ({e.class})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleOpenQuestionModal()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Tambah Soal
                  </button>
                  <button
                    onClick={() => setBatchModalOpen(true)}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" /> Batch Paste
                  </button>
                  <label className="cursor-pointer px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Excel</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={handleImportQuestionsExcel}
                    />
                  </label>
                  <button
                    onClick={downloadQuestionTemplateExcel}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Template Excel
                  </button>
                </div>
              </div>

              {/* Question list table */}
              <div className="dash-card overflow-hidden bg-white">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">
                      Total: {questions.length} Butir Soal
                    </span>
                    {selectedQuestionIds.length > 0 && (
                      <button
                        onClick={handleBulkDeleteQuestions}
                        className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus ({selectedQuestionIds.length})
                      </button>
                    )}
                  </div>
                  <div className="relative w-48 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari teks soal..."
                      value={qSearch}
                      onChange={(e) => setQSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <th className="p-3 text-center w-10">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) setSelectedQuestionIds(questions.map((q) => q.id));
                              else setSelectedQuestionIds([]);
                            }}
                          />
                        </th>
                        <th className="p-3 text-center w-12">No</th>
                        <th className="p-3 w-28">Tipe</th>
                        <th className="p-3">Konten Pertanyaan</th>
                        <th className="p-3 w-40">Kunci Jawaban</th>
                        <th className="p-3 text-center w-16">Bobot</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {questions
                        .filter((q) => q.content.toLowerCase().includes(qSearch.toLowerCase()))
                        .map((q, idx) => (
                          <tr key={q.id} className="hover:bg-slate-50 transition">
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedQuestionIds.includes(q.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedQuestionIds([...selectedQuestionIds, q.id]);
                                  else setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== q.id));
                                }}
                              />
                            </td>
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {q.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="line-clamp-2 text-slate-800 font-medium">{q.content}</div>
                            </td>
                            <td className="p-3 max-w-xs">
                              {q.type === 'JODOH' ? (
                                <div className="space-y-1">
                                  {Array.isArray(q.options) && q.options.length > 0 ? (
                                    q.options.map((p: any, pI: number) => (
                                      <div
                                        key={pI}
                                        className="text-[11px] flex items-center gap-1.5 text-slate-700 bg-purple-50 hover:bg-purple-100/80 px-2 py-0.5 rounded border border-purple-200 transition"
                                      >
                                        <span className="font-semibold text-purple-900 truncate max-w-[100px]" title={p.q}>
                                          {p.q}
                                        </span>
                                        <span className="text-purple-600 font-black">➔</span>
                                        <span className="font-bold text-emerald-700 truncate max-w-[100px]" title={p.a}>
                                          {p.a}
                                        </span>
                                      </div>
                                    ))
                                  ) : q.correct_answer ? (
                                    <span className="text-xs font-semibold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 block truncate" title={q.correct_answer}>
                                      {q.correct_answer}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">Belum ada pasangan</span>
                                  )}
                                </div>
                              ) : q.type === 'BS' ? (
                                <div className="space-y-1">
                                  {(() => {
                                    let keyObj: Record<string, string> = {};
                                    try {
                                      keyObj = typeof q.correct_answer === 'object' ? q.correct_answer : JSON.parse(q.correct_answer || '{}');
                                    } catch {
                                      keyObj = {};
                                    }
                                    const entries = Object.entries(keyObj);
                                    if (entries.length === 0) {
                                      return <span className="text-xs text-slate-400 italic">{q.correct_answer || '-'}</span>;
                                    }
                                    return (
                                      <div className="flex flex-wrap gap-1">
                                        {entries.map(([sI, sVal]) => (
                                          <span
                                            key={sI}
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                              sVal === 'Benar'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                : 'bg-rose-50 text-rose-700 border-rose-300'
                                            }`}
                                          >
                                            #{Number(sI) + 1}: {sVal}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : q.type === 'PG_KOMPLEKS' ? (
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    let keys: string[] = [];
                                    try {
                                      const parsed = JSON.parse(q.correct_answer || '[]');
                                      keys = Array.isArray(parsed) ? parsed : [];
                                    } catch {
                                      keys = String(q.correct_answer || '').split(',').map((s) => s.trim()).filter(Boolean);
                                    }
                                    if (keys.length === 0) return <span className="text-xs text-slate-400 italic">-</span>;
                                    return keys.map((k, kI) => (
                                      <span
                                        key={kI}
                                        className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                      >
                                        {k}
                                      </span>
                                    ));
                                  })()}
                                </div>
                              ) : (
                                <span className="font-semibold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block truncate max-w-xs">
                                  {q.correct_answer || '-'}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700">{q.point}</td>
                            <td className="p-3 text-right space-x-1">
                              <button
                                onClick={() => handleOpenQuestionModal(q)}
                                className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HASIL & NILAI */}
          {activeTab === 'dash-results' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="dash-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="w-full md:w-auto flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Pilih Mata Pelajaran:
                  </label>
                  <select
                    value={selectedResultExamId}
                    onChange={(e) => setSelectedResultExamId(e.target.value)}
                    className="w-full md:w-96 px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.exam_name} — {e.subject} ({e.class})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadResultsAsExcel(currentExamObj, resultRows)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Rekap Excel
                  </button>
                  <button
                    disabled={!resultClassFilter}
                    onClick={() => downloadClassReportExcel(currentExamObj, resultRows, resultClassFilter, config)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                    title="Pilih kelas di bawah untuk mencetak daftar nilai per kelas dengan kop sekolah"
                  >
                    <FileText className="w-3.5 h-3.5" /> Nilai per Kelas
                  </button>
                </div>
              </div>

              {/* Class Filter & Search */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span>Filter Kelas:</span>
                  <select
                    value={resultClassFilter}
                    onChange={(e) => setResultClassFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none bg-white"
                  >
                    <option value="">Semua Kelas</option>
                    {currentExamObj?.class.split(',').map((c) => (
                      <option key={c.trim()} value={c.trim()}>
                        {c.trim()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama / NIS siswa..."
                    value={resultSearch}
                    onChange={(e) => setResultSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              {/* Results table */}
              <div className="dash-card overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <th className="p-3 text-center w-12">No</th>
                        <th className="p-3">Identitas Siswa</th>
                        <th className="p-3">Kelas</th>
                        <th className="p-3">Waktu Selesai</th>
                        <th className="p-3 text-center w-24">Nilai</th>
                        <th className="p-3 text-center w-28">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultRows
                        .filter((r) => !resultClassFilter || r.class.toLowerCase() === resultClassFilter.toLowerCase())
                        .filter(
                          (r) =>
                            !resultSearch ||
                            r.name.toLowerCase().includes(resultSearch.toLowerCase()) ||
                            r.studentId.toLowerCase().includes(resultSearch.toLowerCase())
                        )
                        .map((r, idx) => (
                          <tr key={r.responseId} className="hover:bg-slate-50 transition">
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{r.name}</div>
                              <div className="text-xs text-slate-400 font-mono">{r.studentId}</div>
                            </td>
                            <td className="p-3 text-slate-600">{r.class}</td>
                            <td className="p-3 text-slate-500 text-xs">{r.submitTime || '-'}</td>
                            <td className="p-3 text-center font-bold text-base text-blue-600">
                              {Number(r.score).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.status === 'Completed' || r.status === 'Selesai'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : r.status === 'Curang'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              {r.status === 'Curang' && (
                                <button
                                  onClick={() => handleUnlockStudent(r.responseId)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
                                  title="Buka Kunci Siswa"
                                >
                                  Buka Akses
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenGradingModal(r.responseId)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-bold"
                                title="Koreksi Jawaban Esai"
                              >
                                Koreksi Esai
                              </button>
                              <button
                                onClick={() => handleResetStudent(r.responseId)}
                                className="p-1 rounded hover:bg-red-50 text-red-600"
                                title="Reset Ujian Siswa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MANAJEMEN USER */}
          {activeTab === 'dash-users' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="dash-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Manajemen Pengguna</h3>
                  <p className="text-xs text-slate-500">Kelola akun Siswa, Guru, dan Administrator.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleOpenUserModal()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" /> Tambah User
                  </button>
                  <label className="cursor-pointer px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Excel</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={handleImportUsersExcel}
                    />
                  </label>
                  <button
                    onClick={downloadUserTemplateExcel}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium border border-slate-300 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Template Excel
                  </button>
                </div>
              </div>

              {/* Users search & role filter */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none bg-white"
                  >
                    <option value="">Semua Role</option>
                    <option value="Admin">Admin</option>
                    <option value="Guru">Guru</option>
                    <option value="Siswa">Siswa</option>
                  </select>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama, ID, atau kelas..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              {/* Users table */}
              <div className="dash-card overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <th className="p-3 text-center w-12">No</th>
                        <th className="p-3">User ID</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Kelas / Tugas</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users
                        .filter((u) => !userRoleFilter || u.role === userRoleFilter)
                        .filter(
                          (u) =>
                            !userSearch ||
                            u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                            u.id.toLowerCase().includes(userSearch.toLowerCase()) ||
                            u.class.toLowerCase().includes(userSearch.toLowerCase())
                        )
                        .map((u, idx) => (
                          <tr key={u.id} className="hover:bg-slate-50 transition">
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-mono font-bold text-slate-700">{u.id}</td>
                            <td className="p-3 font-medium text-slate-800">{u.username}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  u.role === 'Admin'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : u.role === 'Guru'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">{u.class}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                }`}
                              >
                                {u.is_active ? 'Aktif' : 'Non-Aktif'}
                              </button>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <button
                                onClick={() => handleOpenUserModal(u)}
                                className="p-1 rounded hover:bg-blue-50 text-blue-600"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1 rounded hover:bg-red-50 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MONITOR UJIAN REAL-TIME */}
          {activeTab === 'dash-monitor' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="dash-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Monitor Ujian Real-time
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pantau siswa yang sedang mengerjakan, selesai, atau terdeteksi curang secara langsung.
                  </p>
                </div>
                <button
                  onClick={loadMonitor}
                  disabled={monitorLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${monitorLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Status</span>
                </button>
              </div>

              {/* Status categories badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div
                  onClick={() => setMonitorTab('mengerjakan')}
                  className={`dash-card p-4 cursor-pointer text-center border-2 transition ${
                    monitorTab === 'mengerjakan' ? 'border-amber-400 ring-2 ring-amber-200' : 'border-transparent'
                  }`}
                >
                  <p className="text-xs text-slate-500 font-bold uppercase">Mengerjakan</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">
                    {monitorData?.mengerjakan?.length || 0}
                  </p>
                </div>

                <div
                  onClick={() => setMonitorTab('selesai')}
                  className={`dash-card p-4 cursor-pointer text-center border-2 transition ${
                    monitorTab === 'selesai' ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-transparent'
                  }`}
                >
                  <p className="text-xs text-slate-500 font-bold uppercase">Selesai</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {monitorData?.selesai?.length || 0}
                  </p>
                </div>

                <div
                  onClick={() => setMonitorTab('curang')}
                  className={`dash-card p-4 cursor-pointer text-center border-2 transition ${
                    monitorTab === 'curang' ? 'border-red-400 ring-2 ring-red-200' : 'border-transparent'
                  }`}
                >
                  <p className="text-xs text-slate-500 font-bold uppercase">Curang (Kunci)</p>
                  <p className="text-2xl font-black text-red-600 mt-1">
                    {monitorData?.curang?.length || 0}
                  </p>
                </div>

                <div
                  onClick={() => setMonitorTab('sudahLogin')}
                  className={`dash-card p-4 cursor-pointer text-center border-2 transition ${
                    monitorTab === 'sudahLogin' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-transparent'
                  }`}
                >
                  <p className="text-xs text-slate-500 font-bold uppercase">Sudah Login</p>
                  <p className="text-2xl font-black text-blue-600 mt-1">
                    {monitorData?.sudahLogin?.length || 0}
                  </p>
                </div>

                <div
                  onClick={() => setMonitorTab('belumLogin')}
                  className={`dash-card p-4 cursor-pointer text-center border-2 transition ${
                    monitorTab === 'belumLogin' ? 'border-slate-400 ring-2 ring-slate-200' : 'border-transparent'
                  }`}
                >
                  <p className="text-xs text-slate-500 font-bold uppercase">Belum Login</p>
                  <p className="text-2xl font-black text-slate-500 mt-1">
                    {monitorData?.belumLogin?.length || 0}
                  </p>
                </div>
              </div>

              {/* Monitor Table */}
              <div className="dash-card overflow-hidden bg-white">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold">
                  <span>Kategori Aktif: {monitorTab.toUpperCase()}</span>
                  <span>Otomatis refresh berkala</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <th className="p-3 text-center w-12">No</th>
                        <th className="p-3">Nama Siswa</th>
                        <th className="p-3">Kelas</th>
                        <th className="p-3">Ujian</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Mulai / Submit</th>
                        <th className="p-3 text-right">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(monitorData ? monitorData[monitorTab] || [] : []).map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{row.nama}</div>
                            <div className="text-xs text-slate-400 font-mono">{row.userID}</div>
                          </td>
                          <td className="p-3 text-slate-600">{row.kelas}</td>
                          <td className="p-3 text-slate-600">{row.mapel}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row._status === 'mengerjakan'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : row._status === 'curang'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : row._status === 'selesai'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {row._status}
                            </span>
                          </td>
                          <td className="p-3 text-center text-xs text-slate-500 font-mono">
                            {row.startTime} / {row.submitTime}
                          </td>
                          <td className="p-3 text-right space-x-1">
                            {row.responseId && row._status === 'curang' && (
                              <button
                                onClick={async () => {
                                  await api.unlockStudentExam(row.responseId);
                                  loadMonitor();
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
                              >
                                Buka Kunci
                              </button>
                            )}
                            {row.responseId && row._status === 'mengerjakan' && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Selesaikan ujian ${row.nama} secara paksa?`)) {
                                    await api.forceFinishStudentExam(row.responseId);
                                    loadMonitor();
                                  }
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
                              >
                                Selesaikan
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DATA MASTER (KELAS & MAPEL) */}
          {activeTab === 'dash-master' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="dash-card p-6">
                <h3 className="font-bold text-slate-800 text-lg">Manajemen Data Master</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola daftar Rombongan Belajar (Kelas) dan Mata Pelajaran untuk seluruh sistem.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Classes */}
                <div className="dash-card p-6 bg-white">
                  <h4 className="font-bold text-slate-800 text-base mb-3 pb-2 border-b">
                    Daftar Kelas ({masterData.classes.length})
                  </h4>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Nama kelas baru..."
                      value={newClassInput}
                      onChange={(e) => setNewClassInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none"
                    />
                    <button
                      onClick={async () => {
                        if (newClassInput.trim()) {
                          const updated = {
                            ...masterData,
                            classes: [...new Set([...masterData.classes, newClassInput.trim()])],
                          };
                          setMasterData(updated);
                          await api.saveMasterData(updated);
                          setNewClassInput('');
                          showAlert('Berhasil!', `Kelas "${newClassInput.trim()}" berhasil ditambahkan.`, 'success');
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                    >
                      Tambah
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-1.5">
                    {masterData.classes.map((cls) => (
                      <div
                        key={cls}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border text-xs"
                      >
                        <span className="font-medium text-slate-700">{cls}</span>
                        <button
                          onClick={async () => {
                            const updated = {
                              ...masterData,
                              classes: masterData.classes.filter((c) => c !== cls),
                            };
                            setMasterData(updated);
                            await api.saveMasterData(updated);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subjects */}
                <div className="dash-card p-6 bg-white">
                  <h4 className="font-bold text-slate-800 text-base mb-3 pb-2 border-b">
                    Daftar Mata Pelajaran ({masterData.subjects.length})
                  </h4>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Nama mapel baru..."
                      value={newSubjectInput}
                      onChange={(e) => setNewSubjectInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none"
                    />
                    <button
                      onClick={async () => {
                        if (newSubjectInput.trim()) {
                          const updated = {
                            ...masterData,
                            subjects: [...new Set([...masterData.subjects, newSubjectInput.trim()])],
                          };
                          setMasterData(updated);
                          await api.saveMasterData(updated);
                          setNewSubjectInput('');
                          showAlert('Berhasil!', `Mata pelajaran "${newSubjectInput.trim()}" berhasil ditambahkan.`, 'success');
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                    >
                      Tambah
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-1.5">
                    {masterData.subjects.map((sub) => (
                      <div
                        key={sub}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border text-xs"
                      >
                        <span className="font-medium text-slate-700">{sub}</span>
                        <button
                          onClick={async () => {
                            const updated = {
                              ...masterData,
                              subjects: masterData.subjects.filter((s) => s !== sub),
                            };
                            setMasterData(updated);
                            await api.saveMasterData(updated);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: FOLDER GAMBAR */}
          {activeTab === 'dash-images' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="dash-card p-6">
                <h3 className="font-bold text-slate-800 text-lg">Generator &amp; Galeri Gambar</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Simpan link gambar permanen untuk digunakan di soal ujian atau logo.
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Nama file gambar..."
                    id="new-img-name"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-xs flex-1"
                  />
                  <input
                    type="url"
                    placeholder="Direct URL gambar..."
                    id="new-img-link"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-xs flex-1"
                  />
                  <button
                    onClick={async () => {
                      const nameEl = document.getElementById('new-img-name') as HTMLInputElement;
                      const linkEl = document.getElementById('new-img-link') as HTMLInputElement;
                      if (nameEl.value && linkEl.value) {
                        await api.addSavedImage(nameEl.value, linkEl.value);
                        nameEl.value = '';
                        linkEl.value = '';
                        showAlert('Berhasil!', 'Link gambar berhasil disimpan ke galeri.', 'success');
                        api.getSavedImages().then(setSavedImages);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Simpan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {savedImages.map((img) => (
                  <div key={img.id} className="dash-card p-4 bg-white space-y-2">
                    <img src={img.link} alt={img.name} className="h-36 w-full object-cover rounded-lg border" />
                    <p className="font-bold text-xs text-slate-800 truncate">{img.name}</p>
                    <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded text-[11px] font-mono text-slate-600 truncate">
                      <span className="truncate flex-1">{img.link}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(img.link);
                          showAlert('Tersalin!', 'Link gambar berhasil disalin ke clipboard.', 'success');
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: KONFIGURASI APLIKASI */}
          {activeTab === 'dash-config' && !isGuru && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="dash-card p-6 bg-white">
                <h3 className="font-bold text-slate-800 text-lg mb-4">Konfigurasi Sekolah &amp; Aplikasi</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await api.saveAppConfig(configForm);
                    onUpdateConfig(configForm);
                    showAlert('Berhasil!', 'Konfigurasi aplikasi berhasil disimpan.', 'success');
                  }}
                  className="space-y-4 text-xs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-600 uppercase mb-1">Nama Aplikasi</label>
                      <input
                        type="text"
                        value={configForm.app_name}
                        onChange={(e) => setConfigForm({ ...configForm, app_name: e.target.value })}
                        className="w-full p-2.5 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 uppercase mb-1">Sub Judul</label>
                      <input
                        type="text"
                        value={configForm.app_subtitle}
                        onChange={(e) => setConfigForm({ ...configForm, app_subtitle: e.target.value })}
                        className="w-full p-2.5 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 uppercase mb-1">URL Logo Sekolah</label>
                    <input
                      type="url"
                      value={configForm.app_logo}
                      onChange={(e) => setConfigForm({ ...configForm, app_logo: e.target.value })}
                      className="w-full p-2.5 border rounded-lg font-mono text-xs"
                    />
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">Kop Surat Laporan &amp; Cetak</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Dinas Pendidikan</label>
                        <input
                          type="text"
                          value={configForm.school_dinas}
                          onChange={(e) => setConfigForm({ ...configForm, school_dinas: e.target.value })}
                          className="w-full p-2.5 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Nama Sekolah</label>
                        <input
                          type="text"
                          value={configForm.school_name}
                          onChange={(e) => setConfigForm({ ...configForm, school_name: e.target.value })}
                          className="w-full p-2.5 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">Nama Kepala Sekolah</label>
                        <input
                          type="text"
                          value={configForm.principal_name}
                          onChange={(e) => setConfigForm({ ...configForm, principal_name: e.target.value })}
                          className="w-full p-2.5 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">NIP Kepala Sekolah</label>
                        <input
                          type="text"
                          value={configForm.principal_nip}
                          onChange={(e) => setConfigForm({ ...configForm, principal_nip: e.target.value })}
                          className="w-full p-2.5 border rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow text-xs"
                  >
                    Simpan Perubahan
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 10: PANDUAN SUPABASE, GITHUB & VERCEL */}
          {activeTab === 'dash-supabase' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="dash-card p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      Panduan Lengkap Migrasi ke Supabase, GitHub &amp; Vercel
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Langkah demi langkah menghubungkan database PostgreSQL Supabase dan mendeploy frontend ke Vercel dengan CI/CD GitHub.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1: Supabase Setup */}
              <div className="dash-card p-6 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Setup Database Supabase &amp; Jalankan SQL Skema
                    </h4>
                  </div>
                  <button
                    onClick={onOpenSupabaseModal}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow"
                  >
                    Setelan Kredensial Live
                  </button>
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    1. Buka <b>Supabase Dashboard</b> di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">supabase.com</a> dan buat project baru.
                  </p>
                  <p>
                    2. Masuk ke menu <b>SQL Editor</b> di sidebar kiri Supabase.
                  </p>
                  <p>
                    3. Buka file <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800 font-bold">/supabase-schema.sql</code> yang sudah dibuat di proyek ini, salin seluruh kodenya, lalu klik <b>Run</b> di Supabase SQL Editor.
                  </p>
                  <p>
                    4. Dapatkan <b>Project URL</b> dan <b>Anon Public Key</b> dari <i>Project Settings → API</i>, lalu masukkan ke tombol Setelan Kredensial di atas atau file <code className="font-mono bg-slate-100 px-1">.env</code>.
                  </p>
                </div>
              </div>

              {/* Step 2: GitHub Version Control */}
              <div className="dash-card p-6 bg-white space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Inisialisasi Git &amp; Push ke GitHub
                  </h4>
                </div>

                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 space-y-1">
                  <div>git init</div>
                  <div>git add .</div>
                  <div>git commit -m &quot;feat: initial commit CBT Supabase React&quot;</div>
                  <div>git branch -M main</div>
                  <div>git remote add origin https://github.com/USERNAME/NAMA-REPO.git</div>
                  <div>git push -u origin main</div>
                </div>
              </div>

              {/* Step 3: Vercel Deploy & CI/CD */}
              <div className="dash-card p-6 bg-white space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Deploy Otomatis ke Vercel (CI/CD)
                  </h4>
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    1. Masuk ke <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">vercel.com</a> dan pilih <b>Add New Project</b>.
                  </p>
                  <p>
                    2. Import repositori GitHub Anda. Vercel otomatis mendeteksi framework <b>Vite</b>.
                  </p>
                  <p>
                    3. Buka bagian <b>Environment Variables</b> di konfigurasi Vercel dan tambahkan:
                  </p>
                  <div className="bg-slate-50 p-2.5 rounded-lg border font-mono text-[11px] space-y-1 text-slate-700">
                    <div><b>VITE_SUPABASE_URL</b> = https://your-project.supabase.co</div>
                    <div><b>VITE_SUPABASE_ANON_KEY</b> = your-anon-key-here</div>
                  </div>
                  <p>
                    4. Klik <b>Deploy</b>. Setiap kali Anda melakukan commit dan push ke GitHub, Vercel akan otomatis membangun (build) dan menyebarkan (deploy) versi terbaru dalam hitungan detik!
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: CREATE / EDIT EXAM */}
      {examModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                {editingExam ? 'Edit Jadwal Ujian' : 'Buat Jadwal Ujian Baru'}
              </h3>
              <button onClick={() => setExamModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Nama Ujian</label>
                <input
                  type="text"
                  placeholder="Contoh: Ulangan Harian 1, UTS, UAS"
                  value={examForm.exam_name}
                  onChange={(e) => setExamForm({ ...examForm, exam_name: e.target.value })}
                  className="w-full p-2.5 border rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Mata Pelajaran</label>
                  <select
                    value={examForm.subject}
                    onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white"
                  >
                    {masterData.subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">KKM (0-100)</label>
                  <input
                    type="number"
                    value={examForm.kkm}
                    onChange={(e) => setExamForm({ ...examForm, kkm: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-lg font-bold text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">
                  Pilih Kelas Peserta (Bisa Lebih Dari Satu)
                </label>
                <div className="max-h-28 overflow-y-auto p-2 border rounded-lg bg-slate-50 space-y-1">
                  {masterData.classes.map((c) => (
                    <label key={c} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={examForm.class.includes(c)}
                        onChange={(e) => {
                          if (e.target.checked) setExamForm({ ...examForm, class: [...examForm.class, c] });
                          else setExamForm({ ...examForm, class: examForm.class.filter((x) => x !== c) });
                        }}
                      />
                      <span className="font-semibold text-slate-700">{c}</span>
                    </label>
                  ))}
                  {examForm.class.filter((c) => !masterData.classes.includes(c)).map((c) => (
                    <label key={c} className="flex items-center justify-between p-1 rounded bg-blue-50 text-blue-800">
                      <span className="font-bold">{c} (Kustom)</span>
                      <button
                        type="button"
                        onClick={() => setExamForm({ ...examForm, class: examForm.class.filter((x) => x !== c) })}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Hapus
                      </button>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-1.5">
                  <input
                    type="text"
                    placeholder="Tambah kelas manual (contoh: XII-IPA 3)..."
                    id="input-custom-exam-class"
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.currentTarget.value || '').trim();
                        if (val && !examForm.class.includes(val)) {
                          setExamForm({ ...examForm, class: [...examForm.class, val] });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('input-custom-exam-class') as HTMLInputElement;
                      if (el && el.value.trim()) {
                        const val = el.value.trim();
                        if (!examForm.class.includes(val)) {
                          setExamForm({ ...examForm, class: [...examForm.class, val] });
                          el.value = '';
                        }
                      }
                    }}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    + Tambah
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Waktu Mulai</label>
                  <input
                    type="datetime-local"
                    value={examForm.date}
                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                    className="w-full p-2.5 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Waktu Selesai</label>
                  <input
                    type="datetime-local"
                    value={examForm.end_date}
                    onChange={(e) => setExamForm({ ...examForm, end_date: e.target.value })}
                    className="w-full p-2.5 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">PIN Sesi</label>
                  <input
                    type="text"
                    value={examForm.pin}
                    onChange={(e) => setExamForm({ ...examForm, pin: e.target.value })}
                    className="w-full p-2.5 border rounded-lg font-mono font-bold bg-amber-50 text-amber-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Token Akhir</label>
                  <input
                    type="text"
                    value={examForm.end_token}
                    onChange={(e) => setExamForm({ ...examForm, end_token: e.target.value })}
                    className="w-full p-2.5 border rounded-lg font-mono font-bold bg-rose-50 text-rose-800"
                    placeholder="SELESAI2026"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExamModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT QUESTION */}
      {questionModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                {editingQuestion.id ? 'Edit Soal' : 'Tambah Soal Baru'}
              </h3>
              <button onClick={() => setQuestionModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveQuestion(editingQuestion);
              }}
              className="p-6 overflow-y-auto space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Jadwal Ujian Tujuan</label>
                <select
                  value={editingQuestion.exam_id}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, exam_id: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold text-slate-800"
                  required
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.exam_name} ({ex.subject} - {ex.class})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Tipe Soal</label>
                  <select
                    value={editingQuestion.type}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      let newOpts: any = editingQuestion.options;
                      let newKey = editingQuestion.correct_answer;

                      if (newType === 'PG') {
                        if (!Array.isArray(newOpts) || typeof newOpts[0] === 'object') {
                          newOpts = ['', '', '', '', ''];
                        }
                        while (newOpts.length < 5) newOpts.push('');
                        newKey = newKey && !newKey.startsWith('[') && !newKey.startsWith('{') ? newKey : '';
                      } else if (newType === 'PG_KOMPLEKS') {
                        if (!Array.isArray(newOpts) || typeof newOpts[0] === 'object') {
                          newOpts = ['', '', '', '', ''];
                        }
                        while (newOpts.length < 5) newOpts.push('');
                        try {
                          JSON.parse(newKey || '[]');
                        } catch {
                          newKey = '[]';
                        }
                      } else if (newType === 'BS') {
                        if (!Array.isArray(newOpts) || typeof newOpts[0] === 'object' || newOpts.length === 0) {
                          newOpts = [
                            'Pernyataan pertama berkaitan dengan materi...',
                            'Pernyataan kedua berkaitan dengan materi...',
                          ];
                        }
                        try {
                          const parsed = JSON.parse(newKey || '{}');
                          if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
                        } catch {
                          newKey = JSON.stringify({ '0': 'Benar', '1': 'Salah' });
                        }
                      } else if (newType === 'JODOH') {
                        if (!Array.isArray(newOpts) || typeof newOpts[0] !== 'object' || newOpts.length === 0) {
                          newOpts = [
                            { q: 'Pernyataan / Soal 1', a: 'Pasangan Jawaban 1' },
                            { q: 'Pernyataan / Soal 2', a: 'Pasangan Jawaban 2' },
                            { q: 'Pernyataan / Soal 3', a: 'Pasangan Jawaban 3' },
                          ];
                        }
                        newKey = '';
                      } else if (newType === 'Esai') {
                        newOpts = [];
                      }

                      setEditingQuestion({
                        ...editingQuestion,
                        type: newType,
                        options: newOpts,
                        correct_answer: newKey,
                      });
                    }}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold text-slate-800"
                  >
                    <option value="PG">Pilihan Ganda (PG)</option>
                    <option value="PG_KOMPLEKS">PG Kompleks (Multi Select)</option>
                    <option value="BS">Benar / Salah (AKM)</option>
                    <option value="JODOH">Menjodohkan</option>
                    <option value="Esai">Esai</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Bobot Nilai (Poin)</label>
                  <input
                    type="number"
                    value={editingQuestion.point}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, point: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Teks Pertanyaan</label>
                <textarea
                  rows={4}
                  value={editingQuestion.content}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  placeholder="Tuliskan butir soal atau teks pengantar di sini..."
                  className="w-full p-3 border rounded-lg outline-none font-serif text-sm leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Direct URL Gambar (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editingQuestion.image_url || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, image_url: e.target.value })}
                  className="w-full p-2 border rounded-lg font-mono text-xs"
                />
              </div>

              {/* 1. Tipe PG (Pilihan Ganda Biasa) */}
              {editingQuestion.type === 'PG' && (
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700 uppercase">
                      Pilihan Jawaban (A - E) & Kunci Jawaban
                    </label>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                      Klik huruf lingkaran untuk menandai kunci benar
                    </span>
                  </div>

                  {['A', 'B', 'C', 'D', 'E'].map((letter, idx) => {
                    const opts = Array.isArray(editingQuestion.options) ? [...editingQuestion.options] : [];
                    const currentOpt = opts[idx] || '';
                    const isCorrect =
                      editingQuestion.correct_answer === letter ||
                      (currentOpt && editingQuestion.correct_answer === currentOpt);

                    return (
                      <div
                        key={letter}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          title={`Tandai Opsi ${letter} sebagai Kunci Jawaban`}
                          onClick={() => {
                            setEditingQuestion({
                              ...editingQuestion,
                              correct_answer: currentOpt.trim() ? currentOpt.trim() : letter,
                            });
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition ${
                            isCorrect
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-emerald-100 hover:text-emerald-700'
                          }`}
                        >
                          {isCorrect ? '✓' : letter}
                        </button>
                        <input
                          type="text"
                          value={currentOpt}
                          onChange={(e) => {
                            opts[idx] = e.target.value;
                            const updated: any = { ...editingQuestion, options: opts };
                            if (isCorrect) {
                              updated.correct_answer = e.target.value.trim() || letter;
                            }
                            setEditingQuestion(updated);
                          }}
                          placeholder={`Teks Jawaban Pilihan ${letter}`}
                          className="flex-1 p-2 bg-transparent outline-none text-sm font-medium text-slate-800"
                          required={idx < 2}
                        />
                        {isCorrect && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase mr-1">
                            Kunci Benar
                          </span>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Kunci Jawaban Aktif:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      {editingQuestion.correct_answer || 'Belum dipilih'}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Tipe PG KOMPLEKS (Multi Select) */}
              {editingQuestion.type === 'PG_KOMPLEKS' && (
                <div className="space-y-3 p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase">
                      Pilihan Jawaban (A - E) & Centang Kunci Jawaban
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Siswa dapat memilih beberapa jawaban. Beri tanda centang pada semua opsi yang benar.
                    </p>
                  </div>

                  {['A', 'B', 'C', 'D', 'E'].map((letter, idx) => {
                    const opts = Array.isArray(editingQuestion.options) ? [...editingQuestion.options] : [];
                    const currentOpt = opts[idx] || '';

                    let checkedList: string[] = [];
                    try {
                      const parsed = JSON.parse(editingQuestion.correct_answer || '[]');
                      checkedList = Array.isArray(parsed) ? parsed : [];
                    } catch {
                      checkedList = String(editingQuestion.correct_answer || '')
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                    }

                    const isChecked =
                      checkedList.includes(letter) || (currentOpt && checkedList.includes(currentOpt));

                    const toggleCheck = () => {
                      const keyItem = currentOpt.trim() ? currentOpt.trim() : letter;
                      let nextList: string[];
                      if (isChecked) {
                        nextList = checkedList.filter(
                          (x) => x !== letter && x !== currentOpt && x !== keyItem
                        );
                      } else {
                        nextList = [...checkedList, keyItem];
                      }
                      setEditingQuestion({
                        ...editingQuestion,
                        correct_answer: JSON.stringify(nextList),
                      });
                    };

                    return (
                      <div
                        key={letter}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                          isChecked
                            ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          title={`Centang Opsi ${letter} sebagai Kunci Benar`}
                          onClick={toggleCheck}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border transition ${
                            isChecked
                              ? 'bg-blue-600 text-white border-blue-600 shadow'
                              : 'bg-white text-slate-400 border-slate-300 hover:border-blue-400'
                          }`}
                        >
                          {isChecked ? '✓' : letter}
                        </button>

                        <input
                          type="text"
                          value={currentOpt}
                          onChange={(e) => {
                            const oldVal = opts[idx];
                            opts[idx] = e.target.value;
                            const nextVal = e.target.value.trim();

                            let nextList = [...checkedList];
                            if (isChecked && oldVal && nextList.includes(oldVal)) {
                              nextList = nextList.map((x) => (x === oldVal ? nextVal || letter : x));
                            }

                            setEditingQuestion({
                              ...editingQuestion,
                              options: opts,
                              correct_answer: JSON.stringify(nextList),
                            });
                          }}
                          placeholder={`Teks Jawaban Pilihan ${letter}`}
                          className="flex-1 p-2 bg-transparent outline-none text-sm font-medium text-slate-800"
                          required={idx < 2}
                        />

                        <label
                          className="flex items-center gap-1.5 cursor-pointer pr-2 select-none"
                          onClick={toggleCheck}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span
                            className={`text-[10px] font-bold ${
                              isChecked ? 'text-blue-700' : 'text-slate-400'
                            }`}
                          >
                            {isChecked ? 'Kunci Benar' : 'Bukan Kunci'}
                          </span>
                        </label>
                      </div>
                    );
                  })}

                  <div className="pt-2 border-t border-blue-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Kunci Jawaban Terpilih:</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded border border-blue-300">
                      {editingQuestion.correct_answer || '[]'}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Tipe BS (Benar / Salah - AKM) */}
              {editingQuestion.type === 'BS' && (
                <div className="space-y-3 p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase">
                        Tabel Pernyataan & Kunci Kebenaran
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Tuliskan butir pernyataan dan pilih apakah pernyataan tersebut Benar (Sesuai) atau Salah (Tidak Sesuai).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const currentStmts = Array.isArray(editingQuestion.options)
                          ? [...editingQuestion.options]
                          : [];
                        let currentKeyObj: Record<string, string> = {};
                        try {
                          currentKeyObj =
                            typeof editingQuestion.correct_answer === 'object'
                              ? editingQuestion.correct_answer
                              : JSON.parse(editingQuestion.correct_answer || '{}');
                        } catch {
                          currentKeyObj = {};
                        }
                        const nextIdx = currentStmts.length;
                        currentStmts.push(`Pernyataan ${nextIdx + 1}`);
                        currentKeyObj[String(nextIdx)] = 'Benar';
                        setEditingQuestion({
                          ...editingQuestion,
                          options: currentStmts,
                          correct_answer: JSON.stringify(currentKeyObj),
                        });
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Baris
                    </button>
                  </div>

                  {(() => {
                    const stmts =
                      Array.isArray(editingQuestion.options) && editingQuestion.options.length > 0
                        ? editingQuestion.options
                        : ['Pernyataan 1', 'Pernyataan 2'];

                    let keyObj: Record<string, string> = {};
                    try {
                      keyObj =
                        typeof editingQuestion.correct_answer === 'object'
                          ? editingQuestion.correct_answer
                          : JSON.parse(editingQuestion.correct_answer || '{}');
                    } catch {
                      keyObj = { '0': 'Benar', '1': 'Salah' };
                    }

                    return (
                      <div className="space-y-2.5">
                        {stmts.map((stmt: string, sIdx: number) => {
                          const currentVal = keyObj[String(sIdx)] || 'Benar';

                          const setChoice = (choice: 'Benar' | 'Salah') => {
                            const updatedKey = { ...keyObj, [String(sIdx)]: choice };
                            setEditingQuestion({
                              ...editingQuestion,
                              correct_answer: JSON.stringify(updatedKey),
                            });
                          };

                          const updateStmtText = (text: string) => {
                            const nextStmts = [...stmts];
                            nextStmts[sIdx] = text;
                            setEditingQuestion({
                              ...editingQuestion,
                              options: nextStmts,
                            });
                          };

                          const removeStmt = () => {
                            if (stmts.length <= 1) return;
                            const nextStmts = stmts.filter((_, i) => i !== sIdx);
                            const nextKeyObj: Record<string, string> = {};
                            nextStmts.forEach((_, newI) => {
                              const oldI = newI >= sIdx ? newI + 1 : newI;
                              nextKeyObj[String(newI)] = keyObj[String(oldI)] || 'Benar';
                            });
                            setEditingQuestion({
                              ...editingQuestion,
                              options: nextStmts,
                              correct_answer: JSON.stringify(nextKeyObj),
                            });
                          };

                          return (
                            <div
                              key={sIdx}
                              className="p-3 rounded-lg border border-slate-200 bg-white space-y-2 shadow-sm"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                <span>Pernyataan #{sIdx + 1}</span>
                                {stmts.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={removeStmt}
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                    title="Hapus Pernyataan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <textarea
                                rows={2}
                                value={stmt}
                                onChange={(e) => updateStmtText(e.target.value)}
                                placeholder={`Tuliskan teks butir pernyataan nomor ${sIdx + 1}...`}
                                className="w-full p-2 border border-slate-200 rounded-lg text-xs leading-relaxed outline-none focus:ring-1 focus:ring-amber-500"
                                required
                              />

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] font-bold text-slate-600">Kunci Kebenaran:</span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setChoice('Benar')}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 border ${
                                      currentVal === 'Benar'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                    }`}
                                  >
                                    ✓ Benar / Sesuai
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setChoice('Salah')}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 border ${
                                      currentVal === 'Salah'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                    }`}
                                  >
                                    ✗ Salah / Tidak Sesuai
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 4. Tipe JODOH (Menjodohkan / Matching Pairs) */}
              {editingQuestion.type === 'JODOH' && (
                <div className="space-y-3 p-4 bg-purple-50/50 border border-purple-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase">
                        Pasangan Menjodohkan (Premis Kiri ↔ Jawaban Kanan)
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Masukkan item di sisi kiri (soal) dan pasangannya di sisi kanan (kunci jawaban).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const currentPairs =
                          Array.isArray(editingQuestion.options) &&
                          editingQuestion.options.length > 0 &&
                          typeof editingQuestion.options[0] === 'object'
                            ? [...editingQuestion.options]
                            : [];
                        currentPairs.push({ q: '', a: '' });
                        setEditingQuestion({
                          ...editingQuestion,
                          options: currentPairs,
                        });
                      }}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Pasangan
                    </button>
                  </div>

                  {(() => {
                    const pairs: { q: string; a: string }[] =
                      Array.isArray(editingQuestion.options) &&
                      editingQuestion.options.length > 0 &&
                      typeof editingQuestion.options[0] === 'object'
                        ? editingQuestion.options
                        : [
                            { q: 'Pernyataan / Soal 1', a: 'Pasangan Jawaban 1' },
                            { q: 'Pernyataan / Soal 2', a: 'Pasangan Jawaban 2' },
                          ];

                    return (
                      <div className="space-y-2.5">
                        {pairs.map((pair, pIdx) => {
                          const updateLeft = (val: string) => {
                            const next = [...pairs];
                            next[pIdx] = { ...next[pIdx], q: val };
                            setEditingQuestion({ ...editingQuestion, options: next });
                          };

                          const updateRight = (val: string) => {
                            const next = [...pairs];
                            next[pIdx] = { ...next[pIdx], a: val };
                            setEditingQuestion({ ...editingQuestion, options: next });
                          };

                          const removePair = () => {
                            if (pairs.length <= 1) return;
                            const next = pairs.filter((_, i) => i !== pIdx);
                            setEditingQuestion({ ...editingQuestion, options: next });
                          };

                          return (
                            <div
                              key={pIdx}
                              className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm"
                            >
                              <span className="w-5 text-center font-bold text-slate-400 text-xs">
                                {pIdx + 1}.
                              </span>
                              <input
                                type="text"
                                value={pair.q || ''}
                                onChange={(e) => updateLeft(e.target.value)}
                                placeholder={`Premis Kiri #${pIdx + 1} (Soal)`}
                                className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                                required
                              />
                              <span className="font-bold text-purple-600 text-base">↔</span>
                              <input
                                type="text"
                                value={pair.a || ''}
                                onChange={(e) => updateRight(e.target.value)}
                                placeholder={`Jawaban Kanan #${pIdx + 1} (Kunci)`}
                                className="flex-1 p-2 border border-purple-200 bg-purple-50/50 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500 font-bold text-purple-900"
                                required
                              />
                              {pairs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={removePair}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                  title="Hapus Pasangan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        <div className="pt-2 border-t border-purple-200 text-xs flex flex-col gap-1 bg-purple-100/60 p-2.5 rounded-lg">
                          <span className="font-bold text-purple-900 flex items-center gap-1">
                            <span>✓ Kunci Jawaban Pasangan yang Terbentuk:</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {pairs.filter((p: any) => p.q && p.a).map((p: any, pI: number) => (
                              <span
                                key={pI}
                                className="text-[11px] font-bold bg-white text-purple-900 px-2 py-0.5 rounded border border-purple-300 shadow-sm flex items-center gap-1"
                              >
                                <span>{p.q}</span>
                                <span className="text-purple-600 font-black">➔</span>
                                <span className="text-emerald-700">{p.a}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 5. Tipe Esai */}
              {editingQuestion.type === 'Esai' && (
                <div className="space-y-2 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <label className="block font-bold text-slate-700 uppercase">
                    Panduan Penilaian / Kata Kunci Referensi Guru
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Jawaban esai dinilai secara fleksibel oleh guru di menu Nilai. Tuliskan kata kunci atau kriteria jawaban untuk memudahkan koreksi.
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Contoh kata kunci: fotosintesis, klorofil, karbon dioksida, stomata"
                    value={editingQuestion.correct_answer || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}
                    className="w-full p-2.5 border rounded-lg text-xs leading-relaxed bg-white"
                  />
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BATCH PASTE SOAL */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
              <h3 className="font-bold text-purple-900 text-base">Batch Paste Soal Pilihan Ganda</h3>
              <button onClick={() => setBatchModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-800 space-y-1">
                <p className="font-bold">Format yang Dikenali Otomatis:</p>
                <pre className="font-mono text-[11px] bg-white p-2 rounded border border-purple-200">
                  {`1. Berapakah 5 x 5?
A. 10
B. 25
C. 30
D. 50
Jawaban: B`}
                </pre>
              </div>

              <textarea
                rows={10}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="Tempelkan soal-soal Anda di sini..."
                className="w-full p-3 border rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-purple-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={parseBatchQuestions}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow"
                >
                  Simpan Semua Soal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESSAY GRADING */}
      {gradingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Koreksi Jawaban Esai</h3>
              <button onClick={() => setGradingModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {gradingDetail ? (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border">
                    <p className="font-bold text-slate-800 text-sm">{gradingDetail.name}</p>
                    <p className="text-slate-500">{gradingDetail.examSubject}</p>
                  </div>

                  <div className="space-y-3">
                    {gradingDetail.data
                      .filter((d: any) => d.type === 'Esai')
                      .map((d: any, idx: number) => (
                        <div key={d.id} className="p-3 rounded-xl border bg-amber-50/20 border-amber-200">
                          <p className="font-bold text-slate-700 mb-1">
                            Soal #{idx + 1}: {d.q}
                          </p>
                          <div className="bg-white p-2.5 rounded border text-slate-800 font-serif italic text-sm">
                            {d.studentAns || '(Tidak ada jawaban)'}
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-yellow-900 text-sm">Total Nilai Poin Esai:</p>
                      <p className="text-slate-500">Nilai akhir akan otomatis dihitung ulang skala 100.</p>
                    </div>
                    <input
                      type="number"
                      value={essayScoreInput}
                      onChange={(e) => setEssayScoreInput(Number(e.target.value))}
                      className="w-24 p-2 text-center font-bold text-lg border rounded-lg bg-white"
                    />
                  </div>

                  <button
                    onClick={handleSaveGrading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow text-sm"
                  >
                    Simpan Nilai &amp; Hitung Ulang
                  </button>
                </>
              ) : (
                <p className="text-center py-6 text-slate-400">Memuat jawaban siswa...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button onClick={() => setUserModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">User ID / NIS / NIP</label>
                <input
                  type="text"
                  value={userForm.id}
                  disabled={Boolean(editingUser)}
                  onChange={(e) => setUserForm({ ...userForm, id: e.target.value })}
                  placeholder="Contoh: SIS-001 atau NIS/NIP"
                  className="w-full p-2.5 border rounded-lg font-mono disabled:bg-slate-100"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">ID unik pengguna. Untuk siswa baru bisa gunakan NIS.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="Nama lengkap siswa / guru"
                  className="w-full p-2.5 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Password</label>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full p-2.5 border rounded-lg font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value as any;
                      let updatedId = userForm.id;
                      if (!editingUser) {
                        const prefix = newRole === 'Guru' ? 'GUR' : newRole === 'Admin' ? 'ADM' : 'SIS';
                        const num = Math.floor(100 + Math.random() * 900);
                        updatedId = `${prefix}-${num}`;
                      }
                      const defaultClass = newRole === 'Admin' ? '-' : (availableClasses[0] || '7A');
                      setUserForm({
                        ...userForm,
                        role: newRole,
                        id: updatedId,
                        class: userForm.class && userForm.class !== '-' ? userForm.class : defaultClass,
                      });
                    }}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  >
                    <option value="Siswa">Siswa</option>
                    <option value="Guru">Guru</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  {userForm.role === 'Siswa' ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-600 uppercase">Kelas Siswa</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomClass(!isCustomClass);
                            if (!isCustomClass) setUserForm({ ...userForm, class: '' });
                            else setUserForm({ ...userForm, class: availableClasses[0] || '7A' });
                          }}
                          className="text-[10px] text-blue-600 hover:underline font-bold"
                        >
                          {isCustomClass ? 'Pilih dari Daftar' : '+ Kelas Baru'}
                        </button>
                      </div>
                      {isCustomClass ? (
                        <input
                          type="text"
                          value={userForm.class}
                          onChange={(e) => setUserForm({ ...userForm, class: e.target.value })}
                          placeholder="Ketik kelas baru (contoh: 7D)..."
                          className="w-full p-2.5 border rounded-lg"
                          required
                          autoFocus
                        />
                      ) : (
                        <select
                          value={userForm.class}
                          onChange={(e) => setUserForm({ ...userForm, class: e.target.value })}
                          className="w-full p-2.5 border rounded-lg bg-white font-semibold text-slate-800"
                          required
                        >
                          <option value="" disabled>-- Pilih Kelas --</option>
                          {availableClasses.map((c: string) => (
                            <option key={c} value={c}>
                              Kelas {c}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : userForm.role === 'Guru' ? (
                    <div>
                      <label className="block font-bold text-slate-600 uppercase mb-1">Tugas / Mapel</label>
                      <input
                        type="text"
                        value={userForm.class}
                        onChange={(e) => setUserForm({ ...userForm, class: e.target.value })}
                        placeholder="Contoh: IPA:7A, 7B, 7C"
                        className="w-full p-2.5 border rounded-lg font-medium"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-600 uppercase mb-1">Keterangan</label>
                      <input
                        type="text"
                        disabled
                        value="Hak Akses Administrator Sistem"
                        className="w-full p-2.5 border rounded-lg bg-slate-100 text-slate-500 font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Class Badges for Guru */}
              {userForm.role === 'Guru' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Pilih Kelas yang Diajar (Klik untuk menambah/hapus):</span>
                    <span className="text-[10px] text-blue-600 font-semibold">{availableClasses.length} kelas di database</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableClasses.map((c: string) => {
                      const isSelected = userForm.class.split(',').some((p) => p.trim().includes(c));
                      return (
                        <button
                          type="button"
                          key={c}
                          onClick={() => {
                            const raw = userForm.class && userForm.class !== '-' ? userForm.class : '';
                            const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
                            let updated: string[];
                            if (isSelected) {
                              updated = parts.filter((p) => !p.includes(c));
                            } else {
                              updated = [...parts, c];
                            }
                            setUserForm({ ...userForm, class: updated.join(', ') || '-' });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? '✓ Kelas ' : '+ Kelas '} {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
                >
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
        isAlertOnly={confirmDialog.isAlertOnly}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
