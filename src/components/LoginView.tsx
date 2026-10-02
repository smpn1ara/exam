import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { AppConfig, User } from '../types';
import { ArrowRight, Eye, EyeOff, IdCard, Lock, ShieldCheck, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseCredentials } from '../lib/supabase';

interface LoginViewProps {
  config: AppConfig;
  onLoginSuccess: (user: User) => void;
  onOpenSupabaseModal: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  config,
  onLoginSuccess,
  onOpenSupabaseModal,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const { isConfigured } = getSupabaseCredentials();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tz = config.timezone || 'Asia/Jakarta';
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          timeZone: tz,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [config.timezone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await api.loginUser(username, password, isAdmin);
      if (res.success && res.userID) {
        onLoginSuccess({
          id: res.userID,
          username: res.username || username,
          role: res.role as any,
          class: res.class || '-',
          session_token: res.token,
          is_active: true,
        });
      } else {
        setErrorMessage(res.message || 'Login gagal, periksa User ID dan Password Anda.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mencoba login.');
    } finally {
      setLoading(false);
    }
  };

  const tzLabel = config.timezone === 'Asia/Makassar' ? 'WITA (UTC+8)' : config.timezone === 'Asia/Jayapura' ? 'WIT (UTC+9)' : 'WIB (UTC+7)';

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative" style={{ backgroundColor: '#EDEFF5' }}>
      {/* Top right Supabase connection indicator button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={onOpenSupabaseModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 backdrop-blur border border-slate-300 hover:border-slate-400 text-slate-700 shadow-sm transition active:scale-95"
          title="Klik untuk setelan koneksi Supabase & Skema SQL"
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isConfigured ? 'Supabase Live' : 'Demo Mode'}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </button>
      </div>

      {/* Left Panel: School Branding & Digital Clock */}
      <div
        className="w-full md:w-[42%] flex flex-col items-center justify-center py-12 px-6"
        style={{ backgroundColor: '#1D2B53' }}
      >
        <div className="neo-dark-circle inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 p-3">
          <img
            src={config.app_logo}
            alt="Logo Aplikasi"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg/250px-Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg.png';
            }}
          />
        </div>

        <h1 className="font-serif-fraunces text-2xl md:text-3xl font-semibold text-white text-center tracking-tight px-2">
          {config.app_name || 'Ujian Online V.3'}
        </h1>
        <p className="text-sm text-slate-300 mt-2 text-center max-w-xs px-2">
          {config.app_subtitle || 'Sistem Ujian Terintegrasi'}
        </p>

        {/* Real-time Clock */}
        <div className="neo-dark-raised mt-8 py-3.5 px-7 rounded-2xl inline-flex flex-col items-center gap-0.5 border border-white/5">
          <div className="text-2xl font-bold text-white font-mono tracking-widest">
            {currentTime || '--:--:--'}
          </div>
          <div className="text-xs text-slate-300 font-medium">
            {currentDate}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {tzLabel}
          </div>
        </div>

        {/* Demo Quick Accounts Pill */}
        <div className="mt-8 text-center text-xs text-slate-300/80 max-w-xs space-y-1">
          <p className="font-semibold text-white/90">Akun Pengujian Cepat:</p>
          <p>Admin: <span className="font-mono text-amber-300">ADM-001</span> (pass: <span className="font-mono">admin123</span>)</p>
          <p>Guru: <span className="font-mono text-amber-300">GUR-001</span> (pass: <span className="font-mono">guru123</span>)</p>
          <p>Siswa: <span className="font-mono text-amber-300">SIS-001</span> (pass: <span className="font-mono">siswa123</span>)</p>
        </div>
      </div>

      {/* Right Panel: Tactile Neumorphic Login Form */}
      <div className="w-full md:w-[58%] flex items-center justify-center p-6 md:p-12">
        <div className="neo-card w-full max-w-sm p-7 rounded-[28px]">
          <div className="mb-5">
            <h2 className="text-xl font-bold" style={{ color: '#1D2B53' }}>
              Masuk
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Isi data kredensial berikut untuk melanjutkan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                User ID
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                  <IdCard className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="neo-input pl-11 block w-full px-4 py-2.5 text-sm text-slate-700"
                  placeholder="Masukkan User ID (Contoh: SIS-001)"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neo-input pl-11 pr-11 block w-full px-4 py-2.5 text-sm text-slate-700"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#1D2B53] transition"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                  style={{ accentColor: '#1D2B53' }}
                />
                <span className="ml-2 text-xs text-slate-600 font-semibold">
                  Login sebagai Admin / Guru
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn w-full py-3 text-sm flex justify-center items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-100 text-red-700 text-xs text-center border border-red-200 font-medium flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>

          {/* Developer badge footer from original design */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>SIPADU CBT Engine · Connected with Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
};
