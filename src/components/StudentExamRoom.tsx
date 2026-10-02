import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Exam, MatchingPair, Question, User } from '../types';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckSquare,
  Clock,
  Flag,
  List,
  Moon,
  Send,
  Sun,
  X,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface StudentExamRoomProps {
  user: User;
  exam: Exam;
  onFinishExam: (score: number) => void;
  onViolationKick: () => void;
}

export const StudentExamRoom: React.FC<StudentExamRoomProps> = ({
  user,
  exam,
  onFinishExam,
  onViolationKick,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(exam.duration * 60);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [darkMode, setDarkMode] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [shuffledRightMap, setShuffledRightMap] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showEndTokenModal, setShowEndTokenModal] = useState(false);
  const [endTokenInput, setEndTokenInput] = useState('');
  const [endTokenError, setEndTokenError] = useState('');
  const [violationTriggered, setViolationTriggered] = useState(false);
  const [violationReason, setViolationReason] = useState('');
  const [noticeDialog, setNoticeDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef<Record<string, any>>({});
  const remainingSecondsRef = useRef(remainingSeconds);

  answersRef.current = answers;
  remainingSecondsRef.current = remainingSeconds;

  // 1. Initial Load Questions
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await api.getExamQuestions(exam.id, user.id);
        const loadedQuestions = res.questions || [];
        setQuestions(loadedQuestions);

        // Build stable shuffled right choices for every JODOH question
        const sMap: Record<string, string[]> = {};
        loadedQuestions.forEach((q: Question) => {
          if (q.type === 'JODOH' && Array.isArray(q.options)) {
            const rawRights = q.options
              .map((p: any) => (typeof p === 'object' && p !== null ? p.a : ''))
              .filter(Boolean);

            if (rawRights.length > 0) {
              const shuffled = [...rawRights];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              // Ensure order is not identical if more than 1 option
              if (shuffled.length > 1 && shuffled.every((val, idx) => val === rawRights[idx])) {
                const first = shuffled.shift()!;
                shuffled.push(first);
              }
              sMap[q.id] = shuffled;
            }
          }
        });
        setShuffledRightMap(sMap);

        if (res.savedAnswers) {
          setAnswers(res.savedAnswers);
        }
        if (res.savedRemainingSeconds && res.savedRemainingSeconds > 0) {
          setRemainingSeconds(res.savedRemainingSeconds);
        } else {
          setRemainingSeconds(exam.duration * 60);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Try request fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
  }, [exam.id, exam.duration, user.id]);

  // 2. Timer Countdown & Periodic Autosave Heartbeat
  useEffect(() => {
    if (loading || violationTriggered) return;

    let heartbeatCounter = 0;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitTimeOut();
          return 0;
        }

        heartbeatCounter++;
        if (heartbeatCounter >= 15) {
          heartbeatCounter = 0;
          api.syncAnswers(user.id, exam.id, answersRef.current, prev - 1);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, violationTriggered, exam.id, user.id]);

  const handleAutoSubmitTimeOut = async () => {
    setSubmitting(true);
    try {
      const res = await api.submitExam(user.id, exam.id, answersRef.current, 'Completed');
      onFinishExam(res.score || 0);
    } catch (e) {
      console.error(e);
      onFinishExam(0);
    }
  };

  // 3. Debounced Autosave on user input
  const triggerDebouncedSync = (newAnswers: Record<string, any>) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      api.syncAnswers(user.id, exam.id, newAnswers, remainingSecondsRef.current);
    }, 2000);
  };

  // 4. Anti-Cheat Strict Event Listeners
  useEffect(() => {
    if (loading || violationTriggered) return;

    const handleViolation = (reason: string) => {
      if (violationTriggered) return;
      setViolationTriggered(true);
      setViolationReason(reason);
      api.saveAndFlagCurang(user.id, exam.id, answersRef.current, reason, remainingSecondsRef.current);
    };

    // Fullscreen change check
    const handleFsChange = () => {
      if (!document.fullscreenElement && !violationTriggered) {
        handleViolation('Keluar dari Mode Fullscreen');
      }
    };

    // Visibility change check
    let visGraceTimer: NodeJS.Timeout | null = null;
    const handleVisibility = () => {
      if (document.hidden) {
        visGraceTimer = setTimeout(() => {
          if (document.hidden && !violationTriggered) {
            handleViolation('Pindah Tab atau Minimize Browser');
          }
        }, 1500);
      } else {
        if (visGraceTimer) clearTimeout(visGraceTimer);
      }
    };

    // Window blur check
    const handleBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus() && !violationTriggered) {
          handleViolation('Membuka Aplikasi Lain atau Kehilangan Fokus Layar');
        }
      }, 300);
    };

    // Keyboard blocker
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'OS' || (e.altKey && e.key === 'Tab')) {
        e.preventDefault();
        handleViolation('Menekan Tombol Sistem / Windows');
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    // Context menu (right click) blocker
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      if (visGraceTimer) clearTimeout(visGraceTimer);
    };
  }, [loading, violationTriggered, user.id, exam.id]);

  // Answer change handlers
  const handleSelectPG = (qid: string, optionText: string) => {
    const updated = { ...answers, [qid]: optionText };
    setAnswers(updated);
    triggerDebouncedSync(updated);
  };

  const handleTogglePGKompleks = (qid: string, optionText: string) => {
    let currentArr: string[] = Array.isArray(answers[qid]) ? [...answers[qid]] : [];
    const idx = currentArr.indexOf(optionText);
    if (idx !== -1) {
      currentArr.splice(idx, 1);
    } else {
      currentArr.push(optionText);
    }
    const updated = { ...answers, [qid]: currentArr };
    setAnswers(updated);
    triggerDebouncedSync(updated);
  };

  const handleSelectBS = (qid: string, statementIdx: number, val: 'Benar' | 'Salah') => {
    const currentObj = typeof answers[qid] === 'object' && answers[qid] !== null ? { ...answers[qid] } : {};
    currentObj[statementIdx] = val;
    const updated = { ...answers, [qid]: currentObj };
    setAnswers(updated);
    triggerDebouncedSync(updated);
  };

  const handleSelectMatchingLeft = (val: string) => {
    if (selectedLeft === val) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(val);
    }
  };

  const handleSelectMatchingRight = (qid: string, rightVal: string) => {
    if (!selectedLeft) return;
    const currentObj = typeof answers[qid] === 'object' && answers[qid] !== null ? { ...answers[qid] } : {};

    // Remove any previous pairing to this rightVal to ensure 1-to-1 matching
    Object.keys(currentObj).forEach((k) => {
      if (currentObj[k] === rightVal) {
        delete currentObj[k];
      }
    });

    currentObj[selectedLeft] = rightVal;
    setSelectedLeft(null);
    const updated = { ...answers, [qid]: currentObj };
    setAnswers(updated);
    triggerDebouncedSync(updated);
  };

  const handleUnpairMatching = (qid: string, leftKey: string) => {
    const currentObj = typeof answers[qid] === 'object' && answers[qid] !== null ? { ...answers[qid] } : {};
    delete currentObj[leftKey];
    if (selectedLeft === leftKey) setSelectedLeft(null);
    const updated = { ...answers, [qid]: currentObj };
    setAnswers(updated);
    triggerDebouncedSync(updated);
  };

  const handleResetAllMatching = (qid: string) => {
    setSelectedLeft(null);
    const updated = { ...answers, [qid]: {} };
    setAnswers(updated);
    triggerDebouncedSync(updated);
  };

  const getShuffledRightChoices = (q: Question): string[] => {
    if (shuffledRightMap[q.id] && shuffledRightMap[q.id].length > 0) {
      return shuffledRightMap[q.id];
    }
    if (!Array.isArray(q.options)) return [];
    return q.options.map((p: any) => (typeof p === 'object' && p !== null ? p.a : '')).filter(Boolean);
  };

  const handleEssayChange = (qid: string, text: string) => {
    const updated = { ...answers, [qid]: text };
    setAnswers(updated);
    triggerDebouncedSync(updated);
  };

  // Nav validation
  const currentQ = questions[currentIndex];
  const isQuestionAnswered = (q: Question) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === 'object') return Object.keys(ans).length > 0;
    return String(ans).trim() !== '';
  };

  const validateCanProceed = () => {
    if (!currentQ || !currentQ.is_required) return true;
    return isQuestionAnswered(currentQ);
  };

  const handleNext = () => {
    if (!validateCanProceed()) {
      setNoticeDialog({
        isOpen: true,
        title: 'Soal Wajib Dijawab',
        message: 'Pertanyaan ini bertanda Wajib dan harus dijawab sebelum melanjutkan ke nomor berikutnya.',
      });
      return;
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleOpenFinishModal = () => {
    const emptyRequired: number[] = [];
    questions.forEach((q, idx) => {
      if (q.is_required && !isQuestionAnswered(q)) {
        emptyRequired.push(idx + 1);
      }
    });

    if (emptyRequired.length > 0) {
      setNoticeDialog({
        isOpen: true,
        title: 'Jawaban Belum Lengkap',
        message: `Anda belum menjawab butir soal nomor: ${emptyRequired.join(', ')}. Harap lengkapi seluruh soal bertanda Wajib sebelum mengumpulkan ujian.`,
      });
      return;
    }

    setEndTokenInput('');
    setEndTokenError('');
    setShowEndTokenModal(true);
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEndTokenError('');
    setSubmitting(true);

    try {
      const res = await api.submitExam(user.id, exam.id, answers, 'Completed', endTokenInput);
      if (res.wrongToken) {
        setEndTokenError('Token Akhir Sesi salah! Silakan tanyakan token ke guru/pengawas.');
        setSubmitting(false);
        return;
      }
      if (res.success) {
        onFinishExam(res.score || 0);
      }
    } catch (err: any) {
      setEndTokenError(err.message || 'Gagal menyimpan jawaban.');
      setSubmitting(false);
    }
  };

  // Format timer
  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = remainingSeconds % 60;
  const timeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#EFEAE0] text-slate-600">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold">Menyiapkan lembar soal ujian...</p>
      </div>
    );
  }

  // Matching color themes
  const matchingPalettes = [
    { border: 'border-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-800' },
    { border: 'border-blue-500', bg: 'bg-blue-100', text: 'text-blue-800' },
    { border: 'border-amber-500', bg: 'bg-amber-100', text: 'text-amber-800' },
    { border: 'border-purple-500', bg: 'bg-purple-100', text: 'text-purple-800' },
    { border: 'border-rose-500', bg: 'bg-rose-100', text: 'text-rose-800' },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col font-sans select-none transition-colors ${
        darkMode ? 'exam-dark bg-[#171208] text-[#f3ecd8]' : 'bg-[#EFEAE0] text-[#2c2a26]'
      } ${
        fontSize === 'small' ? 'exam-fs-small' : fontSize === 'large' ? 'exam-fs-large' : ''
      }`}
    >
      {/* Top Header */}
      <header className="h-16 px-4 md:px-6 flex items-center justify-between z-30 sticky top-0 bg-[#1D2B53] text-white shadow-md border-b-2 border-[#B08D57]">
        <div className="flex items-center gap-3 overflow-hidden mr-2">
          <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white border border-white/20 shrink-0">
            <BookOpen className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-sm md:text-base leading-tight truncate">
              {exam.exam_name}
            </h1>
            <p className="text-[11px] text-blue-200 truncate">
              {exam.subject} · <span className="font-mono bg-white/10 px-1 rounded">{user.id}</span> {user.username}
            </p>
          </div>
        </div>

        {/* Central Timer */}
        <div className="timer-capsule px-4 py-1.5 rounded-lg flex items-center gap-2 font-mono font-bold text-base md:text-lg">
          <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span>{timeFormatted}</span>
        </div>

        {/* Actions & Accessibility */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 border border-white/20">
            <button
              onClick={() => setFontSize('small')}
              className={`px-2 py-1 rounded text-xs font-bold ${fontSize === 'small' ? 'bg-white text-[#1D2B53]' : 'text-white'}`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('medium')}
              className={`px-2 py-1 rounded text-xs font-bold ${fontSize === 'medium' ? 'bg-white text-[#1D2B53]' : 'text-white'}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded text-xs font-bold ${fontSize === 'large' ? 'bg-white text-[#1D2B53]' : 'text-white'}`}
            >
              A+
            </button>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition border border-white/20"
            title="Toggle Mode Gelap"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-200" />}
          </button>

          <button
            onClick={() => setShowNavDrawer(!showNavDrawer)}
            className="md:hidden w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenFinishModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-4 py-1.5 rounded-lg font-bold text-xs md:text-sm shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Selesai</span>
          </button>
        </div>
      </header>

      {/* Main Workspace & Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          <div className="max-w-4xl mx-auto">
            {currentQ ? (
              <div className="exam-clipboard p-6 md:p-8 rounded-2xl">
                {/* Header Soal */}
                <div className="flex items-center justify-between border-b border-black/5 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Soal No.
                    </span>
                    <span className="text-2xl font-black text-slate-800">
                      {currentIndex + 1}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / {questions.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      {currentQ.type.replace('_', ' ')}
                    </span>
                    {currentQ.is_required && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
                        Wajib
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Content */}
                <div className="question-text text-base md:text-lg font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                  {currentQ.content}
                </div>

                {/* Question Image if present */}
                {currentQ.image_url && (
                  <div className="mb-6 p-2 rounded-xl bg-white border border-slate-200 inline-block shadow-sm">
                    <img
                      src={currentQ.image_url}
                      alt="Gambar Soal"
                      referrerPolicy="no-referrer"
                      className="max-h-72 max-w-full rounded-lg object-contain"
                    />
                  </div>
                )}

                {/* Options Area */}
                <div className="space-y-3 mt-4">
                  {/* PG (Pilihan Ganda Biasa) */}
                  {currentQ.type === 'PG' && (
                    <div className="space-y-2.5">
                      {Array.isArray(currentQ.options) &&
                        currentQ.options.map((optText, optIdx) => {
                          const isSelected = answers[currentQ.id] === optText;
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={optIdx}
                              onClick={() => handleSelectPG(currentQ.id, optText)}
                              className={`option-label ${isSelected ? 'checked' : ''}`}
                            >
                              <div className="custom-radio"></div>
                              <span className="font-bold text-slate-500 mr-2 text-sm">
                                {letter}.
                              </span>
                              <span className="text-sm font-medium leading-relaxed">
                                {optText}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* PG Kompleks (Multi Select) */}
                  {currentQ.type === 'PG_KOMPLEKS' && (
                    <div className="space-y-2.5">
                      <p className="text-xs font-bold text-blue-600 mb-2">
                        Pilih satu atau lebih jawaban yang benar:
                      </p>
                      {Array.isArray(currentQ.options) &&
                        currentQ.options.map((optText, optIdx) => {
                          const currentArr = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
                          const isSelected = currentArr.includes(optText);
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={optIdx}
                              onClick={() => handleTogglePGKompleks(currentQ.id, optText)}
                              className={`option-label ${isSelected ? 'checked' : ''}`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md border mr-3 flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <span className="font-bold text-slate-500 mr-2 text-sm">
                                {letter}.
                              </span>
                              <span className="text-sm font-medium leading-relaxed">
                                {optText}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Benar / Salah (AKM Table) */}
                  {currentQ.type === 'BS' && (
                    <div className="overflow-hidden border border-slate-300 rounded-xl bg-white shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3 text-left">Pernyataan</th>
                            <th className="p-3 text-center w-28 bg-emerald-50 text-emerald-800">Sesuai</th>
                            <th className="p-3 text-center w-28 bg-rose-50 text-rose-800">Tidak Sesuai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.isArray(currentQ.options) &&
                            currentQ.options.map((stmt, stmtIdx) => {
                              const ansObj = answers[currentQ.id] || {};
                              const choice = ansObj[stmtIdx];
                              return (
                                <tr key={stmtIdx} className="hover:bg-slate-50">
                                  <td className="p-3 font-medium text-slate-700 leading-relaxed">
                                    {stmt}
                                  </td>
                                  <td className="p-3 text-center">
                                    <label className="cursor-pointer inline-flex items-center justify-center p-2">
                                      <input
                                        type="radio"
                                        name={`bs_${currentQ.id}_${stmtIdx}`}
                                        checked={choice === 'Benar'}
                                        onChange={() => handleSelectBS(currentQ.id, stmtIdx, 'Benar')}
                                        className="w-4 h-4 text-emerald-600"
                                      />
                                    </label>
                                  </td>
                                  <td className="p-3 text-center">
                                    <label className="cursor-pointer inline-flex items-center justify-center p-2">
                                      <input
                                        type="radio"
                                        name={`bs_${currentQ.id}_${stmtIdx}`}
                                        checked={choice === 'Salah'}
                                        onChange={() => handleSelectBS(currentQ.id, stmtIdx, 'Salah')}
                                        className="w-4 h-4 text-rose-600"
                                      />
                                    </label>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Menjodohkan (JODOH) */}
                  {currentQ.type === 'JODOH' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                        <div className="text-amber-900">
                          <span className="font-bold">Petunjuk Menjodohkan:</span> Klik butir pertanyaan di kolom kiri, lalu klik pilihan jawaban pasangannya di kolom kanan (posisi pilihan jawaban telah diacak).
                        </div>
                        {answers[currentQ.id] && Object.keys(answers[currentQ.id]).length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleResetAllMatching(currentQ.id)}
                            className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-bold shrink-0 shadow-sm transition"
                          >
                            Reset Semua Pasangan
                          </button>
                        )}
                      </div>

                      {selectedLeft && (
                        <div className="p-2.5 bg-blue-50 border border-blue-300 rounded-lg text-xs flex items-center justify-between animate-pulse">
                          <span className="text-blue-900 font-semibold">
                            Sedang memilih pasangan untuk: <strong className="text-blue-700">"{selectedLeft}"</strong>. Silakan klik pilihan di kolom kanan.
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedLeft(null)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold underline ml-2"
                          >
                            Batal
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-300 shadow-sm">
                        {/* Kolom Kiri */}
                        <div className="space-y-2.5">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center pb-1 border-b">
                            Kolom Kiri (Pernyataan / Soal)
                          </p>
                          {Array.isArray(currentQ.options) &&
                            currentQ.options
                              .filter((p: MatchingPair) => p.q && p.q.trim())
                              .map((pair: MatchingPair, pIdx: number) => {
                                const ansMap = answers[currentQ.id] || {};
                                const pairedVal = ansMap[pair.q];
                                const isPaired = Boolean(pairedVal);
                                const isSelected = selectedLeft === pair.q;
                                const theme = matchingPalettes[pIdx % matchingPalettes.length];

                                return (
                                  <div
                                    key={pIdx}
                                    className={`w-full p-3 rounded-xl border text-xs md:text-sm font-medium transition flex flex-col gap-1.5 ${
                                      isSelected
                                        ? `${theme.bg} ${theme.border} ${theme.text} ring-2 ring-blue-500 border-l-4 shadow-sm`
                                        : isPaired
                                        ? `${theme.bg} ${theme.border} ${theme.text} border-l-4 shadow-sm`
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div
                                      onClick={() => handleSelectMatchingLeft(pair.q)}
                                      className="flex items-center justify-between cursor-pointer"
                                    >
                                      <span className="font-semibold">{pair.q}</span>
                                      {isSelected ? (
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                          Pilih Kanan ➔
                                        </span>
                                      ) : isPaired ? (
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                      ) : (
                                        <span className="text-[10px] text-slate-400">Klik untuk pilih</span>
                                      )}
                                    </div>

                                    {isPaired && (
                                      <div className="flex items-center justify-between pt-1 border-t border-black/10 text-[11px]">
                                        <span className="font-bold flex items-center gap-1 truncate">
                                          <span className="opacity-70">➔ Pasangan:</span>
                                          <span className="underline font-black">{pairedVal}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUnpairMatching(currentQ.id, pair.q);
                                          }}
                                          className="text-rose-600 hover:text-rose-800 font-bold hover:underline px-1"
                                          title="Lepaskan Pasangan"
                                        >
                                          × Hapus
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                        </div>

                        {/* Kolom Kanan (Diacak / Shuffled) */}
                        <div className="space-y-2.5">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center pb-1 border-b">
                            Kolom Kanan (Pilihan Jawaban — Diacak)
                          </p>
                          {getShuffledRightChoices(currentQ).map((rightChoice: string, rIdx: number) => {
                            const ansMap = answers[currentQ.id] || {};
                            const leftKey = Object.keys(ansMap).find((k) => ansMap[k] === rightChoice);
                            const isUsed = Boolean(leftKey);
                            const leftIdx = leftKey
                              ? currentQ.options.findIndex((p: MatchingPair) => p.q === leftKey)
                              : -1;
                            const theme = leftIdx !== -1 ? matchingPalettes[leftIdx % matchingPalettes.length] : null;

                            return (
                              <button
                                key={rIdx}
                                type="button"
                                onClick={() => handleSelectMatchingRight(currentQ.id, rightChoice)}
                                className={`w-full p-3 text-right rounded-xl border text-xs md:text-sm font-medium transition flex flex-col items-end gap-1 ${
                                  isUsed && theme
                                    ? `${theme.bg} ${theme.border} ${theme.text} border-r-4 shadow-sm`
                                    : selectedLeft
                                    ? 'bg-blue-50/50 border-blue-300 text-blue-900 hover:bg-blue-100 hover:border-blue-400 cursor-pointer'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <span className="font-semibold">{rightChoice}</span>
                                {isUsed && (
                                  <span className="text-[10px] font-bold opacity-80 flex items-center gap-1">
                                    <span>✓ Terhubung:</span>
                                    <span className="italic truncate max-w-[150px]">"{leftKey}"</span>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Esai */}
                  {currentQ.type === 'Esai' && (
                    <div>
                      <textarea
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleEssayChange(currentQ.id, e.target.value)}
                        placeholder="Ketik jawaban esai Anda secara lengkap dan jelas di sini..."
                        rows={6}
                        className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-serif text-sm leading-relaxed"
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center justify-between border-t border-black/5 pt-6 mt-8">
                  <button
                    disabled={currentIndex === 0}
                    onClick={handlePrev}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs md:text-sm flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Sebelumnya</span>
                  </button>

                  {currentIndex < questions.length - 1 ? (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm shadow-md transition flex items-center gap-1.5 active:scale-95"
                    >
                      <span>Selanjutnya</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenFinishModal}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm shadow-md transition flex items-center gap-1.5 active:scale-95"
                    >
                      <span>Kumpulkan Ujian</span>
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p>Tidak ada soal.</p>
            )}
          </div>
        </main>

        {/* Right Nav Keypad Drawer */}
        <aside
          className={`w-72 bg-white border-l border-slate-200 flex flex-col z-20 shadow-2xl transition-all duration-300 md:relative md:translate-x-0 ${
            showNavDrawer ? 'fixed inset-y-0 right-0 z-40 translate-x-0' : 'fixed inset-y-0 right-0 z-40 translate-x-full md:translate-x-0'
          }`}
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                Navigasi Soal
              </h3>
              <p className="text-[10px] text-slate-400">Klik nomor untuk melompat</p>
            </div>
            <button
              onClick={() => setShowNavDrawer(false)}
              className="md:hidden text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2 content-start">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAns = isQuestionAnswered(q);
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowNavDrawer(false);
                    }}
                    className={`nav-btn-modern ${
                      isCurrent ? 'current' : isAns ? 'answered' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-blue-600"></div>
                <span>Sudah Dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded border-2 border-amber-500 bg-amber-100"></div>
                <span>Sedang Dikerjakan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-100"></div>
                <span>Belum Dijawab</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Token Akhir Sesi Modal */}
      {showEndTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
                <Flag className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Selesai Ujian?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Masukkan <b>Token Akhir Sesi</b> dari guru / pengawas untuk mengumpulkan jawaban.
              </p>
            </div>

            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={endTokenInput}
                  onChange={(e) => setEndTokenInput(e.target.value)}
                  placeholder="Token Akhir (Contoh: SELESAI2026)"
                  className="w-full text-center text-lg font-mono font-bold tracking-widest py-3 px-4 bg-rose-50/50 border-2 border-rose-300 focus:border-rose-500 rounded-xl outline-none"
                  autoFocus
                  required
                />
              </div>

              {endTokenError && (
                <p className="text-xs text-red-600 text-center font-medium bg-red-50 p-2 rounded-lg">
                  {endTokenError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEndTokenModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition"
                >
                  Periksa Lagi
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50"
                >
                  {submitting ? 'Mengirim...' : 'Kumpulkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Anti-Cheat Trigger Modal (Lockout screen) */}
      {violationTriggered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/90 backdrop-blur-md">
          <div className="bg-red-900 border-4 border-yellow-400 text-white p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-black uppercase tracking-wider mb-2">
              UJIAN DIHENTIKAN!
            </h2>
            <p className="text-sm font-semibold text-yellow-200 mb-3">
              Terdeteksi Pelanggaran: {violationReason}
            </p>
            <div className="bg-black/40 p-4 rounded-xl text-xs text-slate-200 leading-relaxed mb-6">
              Jawaban terakhir Anda telah tersimpan otomatis ke sistem, namun sesi Anda telah
              <b className="text-yellow-300 font-bold"> DIKUNCI (STATUS CURANG)</b>. Anda tidak dapat melanjutkan ujian sendiri. Hubungi pengawas/admin untuk membuka akses.
            </div>
            <button
              onClick={onViolationKick}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-red-950 font-bold rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
            >
              Saya Mengerti &amp; Keluar
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={noticeDialog.isOpen}
        title={noticeDialog.title}
        message={noticeDialog.message}
        type="warning"
        confirmText="Paham"
        isAlertOnly={true}
        onConfirm={() => setNoticeDialog((prev) => ({ ...prev, isOpen: false }))}
        onCancel={() => setNoticeDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
