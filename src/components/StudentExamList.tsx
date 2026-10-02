import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Exam, StudentExamState, User } from '../types';
import {
  Ban,
  Clock,
  Eye,
  GraduationCap,
  Key,
  Lock,
  LogOut,
  Pencil,
  RotateCw,
  ShieldAlert,
} from 'lucide-react';

interface StudentExamListProps {
  user: User;
  onLogout: () => void;
  onStartExam: (exam: Exam) => void;
  onViewResult: (responseId: string, examName: string, subject: string, kkm?: number) => void;
}

export const StudentExamList: React.FC<StudentExamListProps> = ({
  user,
  onLogout,
  onStartExam,
  onViewResult,
}) => {
  const [exams, setExams] = useState<StudentExamState[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<StudentExamState | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [validatedExamData, setValidatedExamData] = useState<Exam | null>(null);

  const loadExams = async () => {
    setLoading(true);
    try {
      const res = await api.getStudentExamList(user.id, user.class);
      if (res.success && res.exams) {
        setExams(res.exams);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
    const interval = setInterval(loadExams, 20000);
    return () => clearInterval(interval);
  }, [user.id, user.class]);

  const handleOpenPinModal = (ex: StudentExamState) => {
    setSelectedExam(ex);
    setPinInput('');
    setPinError('');
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    setPinError('');
    setPinLoading(true);

    try {
      const res = await api.startExamWithPin(selectedExam.id, pinInput, user.id);
      if (res.success && res.examData) {
        setValidatedExamData(res.examData);
        setSelectedExam(null);
        setShowWarningModal(true);
      } else {
        setPinError(res.message || 'PIN yang Anda masukkan salah.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Gagal memverifikasi PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleConfirmStartExam = () => {
    if (validatedExamData) {
      setShowWarningModal(false);
      onStartExam(validatedExamData);
    }
  };

  const getStatusUI = (state: StudentExamState['state']) => {
    switch (state) {
      case 'aktif':
        return {
          cardClass: 'border-emerald-300 bg-emerald-50/40',
          badgeClass: 'bg-emerald-500 text-white',
          badgeText: 'AKTIF — Bisa Dikerjakan',
          btnClass: 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 cursor-pointer',
          btnText: 'Mulai Ujian',
          btnIcon: <Pencil className="w-4 h-4" />,
          disabled: false,
        };
      case 'selesai':
        return {
          cardClass: 'border-blue-200 bg-blue-50/40',
          badgeClass: 'bg-blue-600 text-white',
          badgeText: 'Sudah Selesai',
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer',
          btnText: 'Lihat Hasil Nilai',
          btnIcon: <Eye className="w-4 h-4" />,
          disabled: false,
        };
      case 'belum_mulai':
        return {
          cardClass: 'border-slate-200 bg-white',
          badgeClass: 'bg-slate-400 text-white',
          badgeText: 'Belum Dimulai',
          btnClass: 'bg-slate-200 text-slate-400 cursor-not-allowed',
          btnText: 'Belum Dimulai',
          btnIcon: <Clock className="w-4 h-4" />,
          disabled: true,
        };
      case 'curang':
        return {
          cardClass: 'border-red-200 bg-red-50/50',
          badgeClass: 'bg-red-600 text-white',
          badgeText: 'Dikunci / Curang',
          btnClass: 'bg-slate-200 text-red-500 cursor-not-allowed',
          btnText: 'Dikunci — Hubungi Guru',
          btnIcon: <Lock className="w-4 h-4" />,
          disabled: true,
        };
      case 'berakhir':
      default:
        return {
          cardClass: 'border-slate-200 bg-slate-50 opacity-75',
          badgeClass: 'bg-slate-400 text-white',
          badgeText: 'Waktu Berakhir',
          btnClass: 'bg-slate-200 text-slate-400 cursor-not-allowed',
          btnText: 'Waktu Habis',
          btnIcon: <Ban className="w-4 h-4" />,
          disabled: true,
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#EFEAE0] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#1D2B53] text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-30 border-b-2 border-[#B08D57]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <GraduationCap className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Daftar Ujian Siswa</h1>
            <p className="text-xs text-blue-200">
              <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">{user.id}</span> · {user.username} ({user.class})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadExams}
            title="Muat Ulang"
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="bg-white/10 hover:bg-red-600/80 border border-white/20 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="font-bold text-slate-800 text-xl font-heading">
              Ujian Tersedia untuk Kelas {user.class}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Pilih ujian yang berstatus aktif untuk mulai mengerjakan dengan memasukkan PIN sesi.
            </p>
          </div>
        </div>

        {loading && exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Memuat daftar jadwal ujian...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="dash-card p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-slate-700 font-bold text-lg">Belum Ada Ujian</h3>
            <p className="text-slate-500 text-sm mt-1">
              Saat ini belum ada jadwal ujian aktif untuk kelas {user.class}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {exams.map((ex) => {
              const ui = getStatusUI(ex.state);
              const initial = ex.subject ? ex.subject.charAt(0).toUpperCase() : '?';

              return (
                <div
                  key={ex.id}
                  className={`dash-card p-5 border-2 ${ui.cardClass} flex flex-col justify-between transition-all`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-[#1D2B53] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-800 text-base leading-tight truncate">
                            {ex.examName}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">{ex.subject}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${ui.badgeClass}`}>
                        {ui.badgeText}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1.5 py-3 border-t border-black/5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-16">Mulai:</span>
                        <b className="text-slate-700 font-mono">{ex.dateStr}</b>
                      </div>
                      {ex.endDateStr && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-16">Selesai:</span>
                          <b className="text-slate-700 font-mono">{ex.endDateStr}</b>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-16">Durasi:</span>
                        <b className="text-slate-700">{ex.duration} Menit</b>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-16">KKM:</span>
                        <b className="text-emerald-700">{ex.kkm || 75}</b>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={ui.disabled}
                    onClick={() => {
                      if (ex.state === 'selesai' && ex.responseId) {
                        onViewResult(ex.responseId, ex.examName, ex.subject, ex.kkm);
                      } else if (ex.state === 'aktif') {
                        handleOpenPinModal(ex);
                      }
                    }}
                    className={`mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${ui.btnClass}`}
                  >
                    {ui.btnIcon}
                    <span>{ui.btnText}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* PIN Input Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Masukkan PIN Ujian</h3>
              <p className="text-xs text-slate-500 mt-1">
                {selectedExam.examName} ({selectedExam.subject})
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={15}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Contoh: 12345"
                  className="w-full text-center text-xl font-mono font-bold tracking-widest py-3 px-4 bg-amber-50/50 border-2 border-amber-300 focus:border-amber-500 rounded-xl outline-none"
                  autoFocus
                  required
                />
              </div>

              {pinError && (
                <p className="text-xs text-red-600 text-center font-medium bg-red-50 p-2 rounded-lg">
                  {pinError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedExam(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pinLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50"
                >
                  {pinLoading ? 'Memeriksa...' : 'Lanjutkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-Exam Security Warning Modal (matches original SweetAlert warning) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border-2 border-red-500">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <h3 className="font-bold text-xl text-slate-900 font-heading">
                PERHATIAN SEBELUM UJIAN
              </h3>
            </div>

            <p className="text-sm text-slate-600 mb-3 font-medium">
              Sistem pengawasan ujian ini sangat sensitif. Demi kelancaran dan kejujuran ujian:
            </p>

            <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded text-xs text-red-800 font-bold mb-4 space-y-1">
              <p>• JANGAN mencoba membuka tab lain atau aplikasi lain.</p>
              <p>• JANGAN keluar dari mode Full Screen.</p>
              <p>• JANGAN melakukan minimize atau split screen pada browser.</p>
            </div>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Jika pelanggaran terdeteksi, ujian Anda akan otomatis <b className="text-red-600 font-semibold">dikunci (Status Curang)</b> dan Anda tidak dapat melanjutkan sendiri sebelum dibuka oleh pengawas/admin.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmStartExam}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/30 transition transform active:scale-95 text-center"
              >
                SAYA MENGERTI &amp; MULAI UJIAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
