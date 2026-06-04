import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn, Lock, User as UserIcon } from 'lucide-react';
import { ApiError } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getDefaultAuthenticatedPath } from '@/app/routes/destinations.js';
import { Button } from '@/components/ui/Button.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { GlassPanel } from '@/components/ui/GlassPanel.jsx';

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {};
    if (!identifier.trim()) nextErrors.identifier = 'Username or email is required.';
    if (!password) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    setGlobalError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const session = await login({
        login: identifier.trim(),
        password
      });
      toast.success('Welcome back');
      const redirectTo = location.state?.from?.pathname || getDefaultAuthenticatedPath(session?.user);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message || 'Login failed.'
          : 'Could not reach the service. Check your connection.';
      setGlobalError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Dynamic ambient glassmorphic background blur blobs */}
      <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute -right-16 -bottom-16 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
      
      <div className="login-container relative z-10 w-full max-w-[440px]">
        <div className="login-card">
          <GlassPanel strong className="login-card-panel p-6 sm:p-8">
            <div className="mb-6 flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 font-display text-base font-bold text-white shadow-glass">
                K
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  Kivaro ERP
                </p>
                <h1 className="truncate font-display text-xl font-semibold text-ink-50">
                  Sign in
                </h1>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Username or email"
                autoComplete="username"
                leftIcon={UserIcon}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                error={errors.identifier}
                placeholder="you@example.com"
                disabled={submitting}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                leftIcon={Lock}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={errors.password}
                placeholder="********"
                disabled={submitting}
              />

              {globalError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                >
                  {globalError}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={submitting}
                leftIcon={LogIn}
              >
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <p className="login-policy mx-auto mt-6 max-w-[260px] break-words text-center text-xs leading-relaxed text-ink-400">
              By continuing, you accept your team&apos;s acceptable use policy.
            </p>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
