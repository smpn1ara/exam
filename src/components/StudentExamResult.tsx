import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { QuestionAnswerDetail, User } from '../types';
import { ArrowLeft, CheckCircle2, Clock, GraduationCap, LogOut, XCircle } from 'lucide-react';

interface StudentExamResultProps {
  user: User;
  responseId: string;
  examName: string;
  subject: string;
  kkm?: number;
  onBackToList: () => void;
  onLogout: () => void;
}

export const StudentExamResult: React.FC<StudentExamResultProps> = ({
  user,
  responseId,
  examName,
  subject,
  kkm = 75,
  onBackToList,
  onLogout,
}) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<QuestionAnswerDetail[]>([]);
  const [finalScore, setFinalScore] = useState<number>(0);

  useEffect(() => {
    const fetchResult = async () => {
      setLoading(true);
      try {
        const res = await api.getStudentAnswerDetail(responseId);
        if (res.success && res.data) {
          setDetails(res.data);
          setFinalScore(Number(res.finalScore) || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [responseId]);

  const hasEssay = details.some((d) => d.type === 'Esai');
  const essayGraded = details.some((d) => d.type === 'Esai' && d.point > 0);

  const correctCount = details.filter((d) => d.type !== 'Esai' && d.isCorrect).length;
  const incorrectCount = details.filter((d) => d.type !== 'Esai' && !d.isCorrect).length;

  const isTuntas = finalScore >= kkm;

  return (
    <div className="min-h-screen bg-[#EFEAE0] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#1D2B53] text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-30 border-b-2 border-[#B08D57]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <GraduationCap className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Hasil &amp; Pembahasan Ujian</h1>
            <p className="text-xs text-blue-200">
              {examName} ({subject}) · {user.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToList}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Daftar Ujian</span>
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Memuat hasil nilai dan lembar jawaban...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score Showcase Card */}
            <div className="dash-card p-8 text-center bg-white">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Nilai Akhir Ujian Anda
              </p>

              <div
                className={`inline-flex items-center justify-center w-36 h-36 rounded-full text-white text-5xl font-black shadow-xl mb-4 ${
                  isTuntas ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
                }`}
              >
                {finalScore.toFixed(2).replace('.', ',')}
              </div>

              <div>
                {isTuntas ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tuntas (KKM: {kkm})</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-4 h-4" />
                    <span>Belum Tuntas (KKM: {kkm})</span>
                  </div>
                )}
              </div>

              {hasEssay && (
                <div className="mt-4">
                  {essayGraded ? (
                    <span className="text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-block">
                      ✓ Semua soal esai telah diperiksa dan dinilai oleh guru
                    </span>
                  ) : (
                    <span className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Soal esai belum dikoreksi guru — nilai dapat berubah setelah proses penilaian selesai
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Answer Breakdown Table */}
            <div className="dash-card overflow-hidden bg-white">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-slate-800 text-sm">
                  Rincian Jawaban Per Nomor Soal
                </h3>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                    Benar: {correctCount}
                  </span>
                  <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                    Salah: {incorrectCount}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3 w-28">Tipe Soal</th>
                      <th className="p-3">Pertanyaan</th>
                      <th className="p-3">Jawaban Anda</th>
                      <th className="p-3">Kunci Jawaban</th>
                      <th className="p-3 text-center w-24">Poin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {details.map((item, idx) => {
                      const isEsai = item.type === 'Esai';
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition ${
                            isEsai
                              ? 'bg-amber-50/20'
                              : item.isCorrect
                              ? 'bg-emerald-50/20'
                              : 'bg-rose-50/20'
                          }`}
                        >
                          <td className="p-3 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {item.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-slate-800 font-medium max-w-xs">
                            <div className="line-clamp-2" title={item.q}>
                              {item.q}
                            </div>
                          </td>
                          <td className="p-3 text-slate-700 font-medium">
                            {item.studentAns}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-xs">
                            {isEsai ? <i className="text-slate-400">Kebijakan Guru</i> : item.key}
                          </td>
                          <td className="p-3 text-center font-bold">
                            <span
                              className={
                                isEsai
                                  ? 'text-purple-600'
                                  : item.isCorrect
                                  ? 'text-emerald-600'
                                  : 'text-rose-600'
                              }
                            >
                              {item.point} / {item.maxPoint}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
