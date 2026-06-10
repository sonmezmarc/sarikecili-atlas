'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'E-posta veya şifre hatalı'
          : authError.message,
      );
      setLoading(false);
      return;
    }

    router.push('/admin/nodes');
    router.refresh();
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-[#171720] px-4">
      <div className="w-full max-w-[360px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] mb-4">
            <Lock size={22} className="text-[#f6d13b]" />
          </div>
          <h1 className="text-lg font-semibold text-[#d4d4dc]">
            Admin Girişi
          </h1>
          <p className="text-xs text-[#606074] mt-1">
            Sarıkeçili Kültürel Harita Yönetim Paneli
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#606074] mb-1.5 ml-1">
              E-posta
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606074]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="admin@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-[#1e1e2c] border border-[#2e2e42] text-[#d4d4dc] placeholder:text-[#44445a] focus:outline-none focus:border-[#f6d13b] transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#606074] mb-1.5 ml-1">
              Şifre
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606074]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-[#1e1e2c] border border-[#2e2e42] text-[#d4d4dc] placeholder:text-[#44445a] focus:outline-none focus:border-[#f6d13b] transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium rounded-lg bg-[#f6d13b] text-[#171720] hover:bg-[#f6d13b]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Giriş yapılıyor...
              </>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
