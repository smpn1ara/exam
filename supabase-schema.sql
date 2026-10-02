-- ========================================================================
-- SKEMA DATABASE SUPABASE (POSTGRESQL) - SIPADU CBT UJIAN ONLINE
-- ========================================================================
-- Panduan Menjalankan:
-- 1. Buka dashboard Supabase (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Buka menu "SQL Editor"
-- 3. Klik "New query", paste seluruh isi file ini, lalu klik "Run"
-- ========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: USERS
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Guru', 'Siswa')),
    class VARCHAR(255) DEFAULT '-',
    session_token VARCHAR(255) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL: EXAMS
CREATE TABLE IF NOT EXISTS public.exams (
    id VARCHAR(50) PRIMARY KEY,
    exam_name VARCHAR(150) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    class VARCHAR(255) NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    pin VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Non-Aktif', 'Completed')),
    shuffle_config JSONB DEFAULT '{"PG": false, "PG_KOMPLEKS": false, "BS": false, "JODOH": false, "Esai": false}'::jsonb,
    end_token VARCHAR(50) DEFAULT '',
    created_by_name VARCHAR(150) DEFAULT '',
    kkm NUMERIC(5,2) DEFAULT 75.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL: QUESTIONS
CREATE TABLE IF NOT EXISTS public.questions (
    id VARCHAR(50) PRIMARY KEY,
    exam_id VARCHAR(50) NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('PG', 'PG_KOMPLEKS', 'BS', 'JODOH', 'Esai')),
    content TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    options JSONB DEFAULT '[]'::jsonb,
    correct_answer TEXT DEFAULT '',
    is_required BOOLEAN DEFAULT TRUE,
    point NUMERIC(5,2) DEFAULT 10.00,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL: RESPONSES
CREATE TABLE IF NOT EXISTS public.responses (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exam_id VARCHAR(50) NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    answers_json JSONB DEFAULT '{}'::jsonb,
    score NUMERIC(5,2) DEFAULT 0.00,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    submit_time TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Completed', 'Selesai', 'Curang', 'Ulangi')),
    remaining_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, exam_id)
);

-- 6. TABEL: LOGS (AUDIT & ANTI-CHEAT)
CREATE TABLE IF NOT EXISTS public.logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    exam_id VARCHAR(50) NOT NULL,
    violation_count INTEGER DEFAULT 1,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL: GAMBAR (GALLERY MEDIA)
CREATE TABLE IF NOT EXISTS public.gambar (
    id VARCHAR(50) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    direct_link TEXT NOT NULL,
    preview TEXT,
    folder_id VARCHAR(100),
    date_added TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL: KONFIGURASI APLIKASI
CREATE TABLE IF NOT EXISTS public.konfigurasi (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL: MASTER DATA (KELAS & MAPEL)
CREATE TABLE IF NOT EXISTS public.master_data (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL CHECK (type IN ('class', 'subject')),
    value VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, value)
);

-- 10. INDEXING PERFORMA TINGGI (Dukungan ratusan siswa bersamaan)
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_exam ON public.responses(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_responses_exam_id ON public.responses(exam_id);
CREATE INDEX IF NOT EXISTS idx_responses_status ON public.responses(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);

-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- Aktifkan RLS untuk keamanan
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gambar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.konfigurasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_data ENABLE ROW LEVEL SECURITY;

-- Untuk frontend CBT berbasis anon key (diperbolehkan select/insert/update):
CREATE POLICY "Public Read Users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public Manage Users" ON public.users FOR ALL USING (true);

CREATE POLICY "Public Read Exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Public Manage Exams" ON public.exams FOR ALL USING (true);

CREATE POLICY "Public Read Questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Public Manage Questions" ON public.questions FOR ALL USING (true);

CREATE POLICY "Public Read Responses" ON public.responses FOR SELECT USING (true);
CREATE POLICY "Public Manage Responses" ON public.responses FOR ALL USING (true);

CREATE POLICY "Public Manage Logs" ON public.logs FOR ALL USING (true);
CREATE POLICY "Public Manage Gambar" ON public.gambar FOR ALL USING (true);
CREATE POLICY "Public Manage Konfigurasi" ON public.konfigurasi FOR ALL USING (true);
CREATE POLICY "Public Manage Master Data" ON public.master_data FOR ALL USING (true);

-- 12. DATA DEFAULT (INITIAL SEED DATA)
-- Konfigurasi
INSERT INTO public.konfigurasi (key, value) VALUES
('app_name', 'SIPADU CBT Online'),
('app_subtitle', 'Sistem Ujian Online Terintegrasi Supabase'),
('app_logo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg/250px-Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg.png'),
('app_background', 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1986&auto=format&fit=crop'),
('show_exam_result', 'true'),
('school_dinas', 'DINAS PENDIDIKAN DAN KEBUDAYAAN'),
('school_uptd', 'UPTD SATUAN PENDIDIKAN'),
('school_name', 'SMP NEGERI 1 ANAK RATU AJI'),
('school_address', 'Jl. Merdeka Kampung Gedung Sari Kec. Anak Ratu Aji Kab. Lampung Tengah'),
('principal_name', 'SUKAMTO, S.Si'),
('principal_nip', '19700101 200902 1 002')
ON CONFLICT (key) DO NOTHING;

-- Master Data Kelas & Mapel
INSERT INTO public.master_data (type, value) VALUES
('class', 'X-IPA 1'), ('class', 'X-IPA 2'), ('class', 'X-IPS 1'),
('class', 'XI-IPA 1'), ('class', 'XI-IPA 2'), ('class', 'XI-IPS 1'),
('class', 'XII-RPL'), ('class', 'XII-TKJ'), ('class', 'XII-MM'),
('subject', 'Matematika'), ('subject', 'Bahasa Indonesia'), ('subject', 'Bahasa Inggris'),
('subject', 'Fisika'), ('subject', 'Kimia'), ('subject', 'Biologi'),
('subject', 'Sejarah'), ('subject', 'Geografi'), ('subject', 'Informatika')
ON CONFLICT DO NOTHING;

-- Akun Pengguna Awal
INSERT INTO public.users (id, username, password, role, class, is_active) VALUES
('ADM-001', 'Admin Utama', 'admin123', 'Admin', '-', true),
('GUR-001', 'Pak Budi Hartono, S.Pd', 'guru123', 'Guru', 'Matematika:XII-RPL, Fisika:XII-TKJ', true),
('SIS-001', 'Ahmad Siswa RPL', 'siswa123', 'Siswa', 'XII-RPL', true),
('SIS-002', 'Budi Santoso', 'siswa123', 'Siswa', 'XII-RPL', true),
('SIS-003', 'Citra Lestari', 'siswa123', 'Siswa', 'XII-TKJ', true)
ON CONFLICT (id) DO NOTHING;

-- Ujian Contoh
INSERT INTO public.exams (id, exam_name, subject, class, date, end_date, duration, pin, status, end_token, created_by_name, kkm) VALUES
('EXM-DEMO-001', 'Simulasi Ujian Akhir Semester', 'Matematika', 'XII-RPL,XII-TKJ', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 days', 60, '12345', 'Aktif', 'SELESAI2026', 'Pak Budi Hartono, S.Pd', 75.00)
ON CONFLICT (id) DO NOTHING;

-- Bank Soal Contoh (Semua Tipe: PG, PG Kompleks, BS, Jodoh, Esai)
INSERT INTO public.questions (id, exam_id, type, content, options, correct_answer, is_required, point) VALUES
('Q-DEMO-01', 'EXM-DEMO-001', 'PG', 'Berapakah hasil dari 15 + 25 x 2?', '["65", "80", "50", "90", "55"]'::jsonb, '65', true, 20.00),
('Q-DEMO-02', 'EXM-DEMO-001', 'PG_KOMPLEKS', 'Manakah di bawah ini yang merupakan bilangan prima? (Pilih semua yang benar)', '["2", "3", "4", "5", "9"]'::jsonb, '["2", "3", "5"]'::jsonb, true, 20.00),
('Q-DEMO-03', 'EXM-DEMO-001', 'BS', 'Tentukan kebenaran dari pernyataan matematika berikut:', '["Sudut siku-siku memiliki besar 90 derajat.", "Jumlah sudut dalam sebuah segitiga adalah 360 derajat.", "Bilangan negatif dikalikan bilangan negatif menghasilkan bilangan positif."]'::jsonb, '{"0": "Benar", "1": "Salah", "2": "Benar"}'::jsonb, true, 20.00),
('Q-DEMO-04', 'EXM-DEMO-001', 'JODOH', 'Cocokkan bentuk bangun datar dengan rumus luasnya:', '[{"q": "Persegi Panjang", "a": "Panjang x Lebar"}, {"q": "Segitiga", "a": "1/2 x Alas x Tinggi"}, {"q": "Lingkaran", "a": "pi x r^2"}]'::jsonb, '', true, 20.00),
('Q-DEMO-05', 'EXM-DEMO-001', 'Esai', 'Jelaskan mengapa matematika sering disebut sebagai ratu ilmu pengetahuan (queen of science) dalam kehidupan modern!', '[]'::jsonb, 'analitis, logika, pemodelan', true, 20.00)
ON CONFLICT (id) DO NOTHING;
