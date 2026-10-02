import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Sanitize Supabase URL to ensure it is always the pure origin (e.g. "https://xyz.supabase.co")
// Strips any paths like "/rest/v1", "/rest/v1/", "/auth/v1", trailing slashes, or whitespace.
export function sanitizeSupabaseUrl(rawUrl: string): string {
  let trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    // Origin returns solely "https://[subdomain].supabase.co" without any pathname
    return parsed.origin;
  } catch {
    return trimmed
      .replace(/\/rest\/v1\/?$/i, '')
      .replace(/\/auth\/v1\/?$/i, '')
      .replace(/\/+$/, '');
  }
}

// Default Supabase Project Credentials (used as automatic fallback on GitHub / GitHub Pages when .env is not present)
export const DEFAULT_SUPABASE_URL = 'https://mpjrdfpcvfqmbvlqyidh.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wanJkZnBjdmZxbWJ2bHF5aWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NjgwNzksImV4cCI6MjEwNjM0NDA3OX0.yUjMSSe-tJVW0koUUKazK98LLKDVcARAKpcfK3gx4sg';

// Get Supabase configuration from environment variables or localStorage override
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('sipadu_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('sipadu_supabase_key') : null;

  const rawUrl = (localUrl && localUrl.trim()) || (envUrl && envUrl.trim()) || DEFAULT_SUPABASE_URL;
  const url = sanitizeSupabaseUrl(rawUrl);
  const key = ((localKey && localKey.trim()) || (envKey && envKey.trim()) || DEFAULT_SUPABASE_ANON_KEY).trim();

  // If localStorage had an unsanitized URL (e.g. with /rest/v1), automatically heal it!
  if (typeof window !== 'undefined' && localUrl && localUrl.trim() !== url) {
    if (url) {
      localStorage.setItem('sipadu_supabase_url', url);
    } else {
      localStorage.removeItem('sipadu_supabase_url');
    }
  }

  const isConfigured = Boolean(
    url &&
    key &&
    !url.includes('your-project-id') &&
    url.startsWith('https://')
  );

  return { url, key, isConfigured };
}

let supabaseInstance: SupabaseClient | null = null;
let lastKnownUrl = '';
let lastKnownKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  if (supabaseInstance && lastKnownUrl === url && lastKnownKey === key) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastKnownUrl = url;
    lastKnownKey = key;
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveSupabaseCredentials(rawUrl: string, rawKey: string) {
  if (typeof window !== 'undefined') {
    const cleanUrl = sanitizeSupabaseUrl(rawUrl);
    const cleanKey = (rawKey || '').trim();

    if (cleanUrl) {
      localStorage.setItem('sipadu_supabase_url', cleanUrl);
    } else {
      localStorage.removeItem('sipadu_supabase_url');
    }

    if (cleanKey) {
      localStorage.setItem('sipadu_supabase_key', cleanKey);
    } else {
      localStorage.removeItem('sipadu_supabase_key');
    }
    // Invalidate client instance so it re-initializes on next call
    supabaseInstance = null;
    lastKnownUrl = '';
    lastKnownKey = '';
  }
}
