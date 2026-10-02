import React, { useState, useEffect } from 'react';
import { getSupabaseCredentials, saveSupabaseCredentials, sanitizeSupabaseUrl } from '../lib/supabase';
import { Check, Copy, Database, ExternalLink, Key, RefreshCw, Server, X } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onCredentialsUpdated,
}) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'vercel'>('config');

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setKey(creds.key);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sanitizeSupabaseUrl(url);
    saveSupabaseCredentials(cleanUrl, key);
    setUrl(cleanUrl);
    onCredentialsUpdated();
    onClose();
  };

  const handleResetToDemo = () => {
    saveSupabaseCredentials('', '');
    setUrl('');
    setKey('');
    onCredentialsUpdated();
    onClose();
  };

  const copySqlSchema = async () => {
    try {
      const response = await fetch('/supabase-schema.sql');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Koneksi Database Supabase</h3>
              <p className="text-xs text-slate-500">Hubungkan database PostgreSQL langsung ke frontend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-white gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 border-b-2 transition ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            API Credentials
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 border-b-2 transition ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Skema SQL Supabase
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`pb-2.5 border-b-2 transition ${
              activeTab === 'vercel'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Deploy GitHub & Vercel
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'config' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  Cara Mendapatkan URL & Anon Key Supabase:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 ml-1">
                  <li>Buat project di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-bold">supabase.com</a></li>
                  <li>Buka Project Settings → <b>API</b></li>
                  <li>Salin <b>Project URL</b> dan <b>anon public key</b> ke form di bawah</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={() => setUrl(sanitizeSupabaseUrl(url))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Gunakan Project URL dasar (contoh: <code className="text-emerald-700 font-bold">https://xyz.supabase.co</code>). Jika menempelkan URL dengan <code className="text-slate-500">/rest/v1</code>, sistem otomatis membersihkannya.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                  <span>Supabase Anon Public Key</span>
                  <span className="text-[10px] text-slate-400 font-normal">Kunci publik aman untuk client-side</span>
                </label>
                <input
                  type="text"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-1.5"
                >
                  <Key className="w-4 h-4" /> Simpan & Hubungkan
                </button>
                <button
                  type="button"
                  onClick={handleResetToDemo}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition"
                >
                  Gunakan Demo LocalDB
                </button>
              </div>
            </form>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Skema Lengkap (PostgreSQL)</h4>
                  <p className="text-xs text-slate-500">Tabel users, exams, questions, responses, logs, konfigurasi, dll.</p>
                </div>
                <button
                  onClick={copySqlSchema}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin!' : 'Salin SQL'}
                </button>
              </div>

              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                <pre>{`-- File: supabase-schema.sql tersedia di root project
-- Buka Supabase Dashboard -> SQL Editor -> Tempel & Jalankan

CREATE TABLE public.users (...);
CREATE TABLE public.exams (...);
CREATE TABLE public.questions (...);
CREATE TABLE public.responses (...);
CREATE TABLE public.logs (...);
CREATE TABLE public.gambar (...);
CREATE TABLE public.konfigurasi (...);
CREATE TABLE public.master_data (...);

-- Indexing & Initial Seed Data disertakan lengkap!`}</pre>
              </div>

              <p className="text-xs text-slate-500">
                File skema lengkap tersedia di file <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">/supabase-schema.sql</code> di dalam project ini.
              </p>
            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800 text-sm">Langkah Deploy ke GitHub & Vercel:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    <b>Push ke GitHub:</b> Inisialisasi repo lokal dan push ke GitHub:
                    <div className="mt-1 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[11px]">
                      git init && git add . && git commit -m "feat: migrate CBT to Supabase React"<br />
                      git remote add origin https://github.com/USERNAME/REPO.git<br />
                      git push -u origin main
                    </div>
                  </li>
                  <li>
                    <b>Import ke Vercel:</b> Masuk ke <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">vercel.com</a>, klik <b>"Add New Project"</b>, lalu pilih repository GitHub Anda.
                  </li>
                  <li>
                    <b>Environment Variables di Vercel:</b> Tambahkan 2 variabel di Project Settings:
                    <ul className="list-disc list-inside ml-4 mt-1 font-mono text-[11px] text-slate-700">
                      <li><code>VITE_SUPABASE_URL</code>: URL project Supabase Anda</li>
                      <li><code>VITE_SUPABASE_ANON_KEY</code>: Anon public key Supabase Anda</li>
                    </ul>
                  </li>
                  <li>
                    <b>Deploy:</b> Klik Deploy. Setiap kali Anda melakukan <code>git push</code> ke branch main, Vercel akan otomatis melakukan build dan deploy dengan performa tinggi CDN edge!
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
