import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { AppConfig, Exam, User } from './types';
import { LoginView } from './components/LoginView';
import { StudentExamList } from './components/StudentExamList';
import { StudentExamRoom } from './components/StudentExamRoom';
import { StudentExamResult } from './components/StudentExamResult';
import { AdminDashboard } from './components/AdminDashboard';
import { SupabaseModal } from './components/SupabaseModal';
import { ConfirmModal } from './components/ConfirmModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'student-list' | 'student-room' | 'student-result' | 'admin'>('login');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [resultResponseId, setResultResponseId] = useState<string>('');
  const [resultExamMeta, setResultExamMeta] = useState<{ name: string; subject: string; kkm: number }>({
    name: '',
    subject: '',
    kkm: 75,
  });
  const [appConfig, setAppConfig] = useState<AppConfig>({
    app_name: 'SIPADU CBT Online',
    app_subtitle: 'Sistem Ujian Terintegrasi Supabase & React',
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
  });
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Load configuration and restore saved session
  useEffect(() => {
    const initApp = async () => {
      try {
        const cfg = await api.getAppConfig();
        if (cfg) setAppConfig(cfg);
      } catch (err) {
        console.error('Config load error', err);
      }

      // Check saved session
      try {
        const savedSession = localStorage.getItem('sipadu_session');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.userID) {
            const user: User = {
              id: parsed.userID,
              username: parsed.username || parsed.userID,
              role: parsed.role,
              class: parsed.class || '-',
              session_token: parsed.token,
              is_active: true,
            };
            setCurrentUser(user);
            if (user.role === 'Admin' || user.role === 'Guru') {
              setCurrentView('admin');
            } else {
              setCurrentView('student-list');
            }
          }
        }
      } catch (e) {
        console.error('Session restore error', e);
      }
    };

    initApp();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(
      'sipadu_session',
      JSON.stringify({
        userID: user.id,
        username: user.username,
        role: user.role,
        class: user.class,
        token: user.session_token,
        loginTime: Date.now(),
      })
    );

    if (user.role === 'Admin' || user.role === 'Guru') {
      setCurrentView('admin');
    } else {
      setCurrentView('student-list');
    }
  };

  const handleRequestLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const executeLogout = () => {
    localStorage.removeItem('sipadu_session');
    setCurrentUser(null);
    setActiveExam(null);
    setCurrentView('login');
    setLogoutConfirmOpen(false);
  };

  const handleStartExam = (exam: Exam) => {
    setActiveExam(exam);
    setCurrentView('student-room');
  };

  const handleFinishExam = () => {
    setActiveExam(null);
    setCurrentView('student-list');
  };

  const handleViewResult = (responseId: string, examName: string, subject: string, kkm: number = 75) => {
    setResultResponseId(responseId);
    setResultExamMeta({ name: examName, subject, kkm });
    setCurrentView('student-result');
  };

  return (
    <>
      {currentView === 'login' && (
        <LoginView
          config={appConfig}
          onLoginSuccess={handleLoginSuccess}
          onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        />
      )}

      {currentView === 'student-list' && currentUser && (
        <StudentExamList
          user={currentUser}
          onLogout={handleRequestLogout}
          onStartExam={handleStartExam}
          onViewResult={handleViewResult}
        />
      )}

      {currentView === 'student-room' && currentUser && activeExam && (
        <StudentExamRoom
          user={currentUser}
          exam={activeExam}
          onFinishExam={handleFinishExam}
          onViolationKick={executeLogout}
        />
      )}

      {currentView === 'student-result' && currentUser && (
        <StudentExamResult
          user={currentUser}
          responseId={resultResponseId}
          examName={resultExamMeta.name}
          subject={resultExamMeta.subject}
          kkm={resultExamMeta.kkm}
          onBackToList={() => setCurrentView('student-list')}
          onLogout={handleRequestLogout}
        />
      )}

      {currentView === 'admin' && currentUser && (
        <AdminDashboard
          user={currentUser}
          config={appConfig}
          onLogout={handleRequestLogout}
          onUpdateConfig={setAppConfig}
          onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        />
      )}

      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onCredentialsUpdated={() => {
          api.getAppConfig().then(setAppConfig);
        }}
      />

      <ConfirmModal
        isOpen={logoutConfirmOpen}
        title="Keluar dari Aplikasi?"
        message="Sesi login Anda akan diakhiri. Pastikan semua pekerjaan telah disimpan."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        type="danger"
        onConfirm={executeLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </>
  );
}
