import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  WalletCards,
  HelpCircle,
  X,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import {
  login,
  registerUser,
  setupMasterAccount,
  getAuthConfig,
  loginWithGoogle,
  loginWithGoogleDemo,
} from '../../api';

interface LoginViewProps {
  isSetupMode: boolean;
  onSuccess: (user: { id: string; username: string; email?: string; picture?: string }) => void;
}

// Official Google "G" Logo
const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.36 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const LoginView: React.FC<LoginViewProps> = ({ isSetupMode, onSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(isSetupMode ? 'register' : 'login');
  const [username, setUsername] = useState(isSetupMode ? 'Admin' : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Google OAuth Config & Modal State
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [showGoogleGuideModal, setShowGoogleGuideModal] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Load Google Client ID from backend
  useEffect(() => {
    getAuthConfig().then((cfg) => {
      if (cfg.googleClientId) {
        setGoogleClientId(cfg.googleClientId);
      }
    });
  }, []);

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    if (!googleClientId) return;

    const checkGsi = setInterval(() => {
      const g = (window as any).google;
      if (g?.accounts?.id) {
        clearInterval(checkGsi);
        try {
          g.accounts.id.initialize({
            client_id: googleClientId,
            auto_select: true,
            callback: async (response: any) => {
              if (response?.credential) {
                setLoading(true);
                setError(null);
                try {
                  const res = await loginWithGoogle(response.credential);
                  onSuccess(res.user);
                } catch (err: any) {
                  setError(err.message || 'Google authentication failed.');
                } finally {
                  setLoading(false);
                }
              }
            },
          });

          // Render official Google button if container ref is available
          if (googleBtnContainerRef.current) {
            g.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: 'filled_blue',
              size: 'large',
              shape: 'pill',
              width: 320,
              text: 'continue_with',
            });
          }

          // Trigger One Tap / auto-login if user is already signed in to Google
          try {
            g.accounts.id.prompt();
          } catch {
            // Ignore prompt errors
          }
        } catch (e) {
          console.warn('Failed to initialize Google Identity Services:', e);
        }
      }
    }, 300);

    return () => clearInterval(checkGsi);
  }, [googleClientId, onSuccess]);

  const handleGoogleClick = async () => {
    if (googleClientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
      } catch {
        setShowGoogleGuideModal(true);
      }
    } else {
      setShowGoogleGuideModal(true);
    }
  };

  const handleDemoGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogleDemo();
      setShowGoogleGuideModal(false);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Demo Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    if (isSetupMode || authMode === 'register') {
      if (authMode === 'register' && !username.trim()) {
        setError('Please enter your name or a username.');
        return;
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSetupMode) {
        const res = await setupMasterAccount(password, username || 'Admin');
        onSuccess(res.user);
      } else if (authMode === 'register') {
        const res = await registerUser(password, username.trim());
        onSuccess(res.user);
      } else {
        const res = await login(password, username.trim() || undefined);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden selection:bg-violet-500 selection:text-white">
      {/* Dynamic Background Glowing Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[500px] h-96 sm:h-[500px] bg-gradient-to-tr from-violet-600/20 via-indigo-500/20 to-emerald-500/15 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10 bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-violet-950/40"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative mb-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <WalletCards className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-violet-400 uppercase leading-none mb-1">
            LEDGERLY EXPENSE TRACKER
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isSetupMode
              ? 'Create Master Passcode'
              : authMode === 'register'
              ? 'Create Your Account'
              : 'Unlock Your Vault'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs">
            {isSetupMode
              ? 'Protect your personal finances with a secure password or Google account.'
              : authMode === 'register'
              ? 'Start tracking your expenses with your own private, encrypted vault.'
              : 'Sign in with your Google account or enter your credentials.'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        {!isSetupMode && (
          <div className="flex items-center p-1 bg-slate-950/70 border border-slate-800 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Google Sign-In Button */}
        <div className="mb-5">
          {googleClientId ? (
            <div className="flex justify-center" ref={googleBtnContainerRef} />
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer border border-slate-200"
            >
              <GoogleLogo className="w-5 h-5 shrink-0" />
              <span>Continue with Google</span>
            </motion.button>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Recommended: Instant 1-click account with Google</span>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider text-center">
            {authMode === 'register' ? 'Or register with password' : 'Or with password'}
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          {(isSetupMode || authMode === 'register' || authMode === 'login') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isSetupMode
                  ? 'Admin Username'
                  : authMode === 'register'
                  ? 'Your Name or Username'
                  : 'Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={
                  isSetupMode
                    ? 'e.g. Admin or your name'
                    : authMode === 'register'
                    ? 'e.g. Rahul'
                    : 'Username (optional for owner)'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                disabled={loading}
              />
            </div>
          )}

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {isSetupMode ? 'Master Password' : authMode === 'register' ? 'Create Password' : 'Password'}
              </label>
              <span className="text-[11px] text-slate-500">
                {(isSetupMode || authMode === 'register') ? 'Min. 4 characters' : ''}
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isSetupMode || authMode === 'register'
                    ? 'Create a secure password'
                    : 'Enter your password'
                }
                autoFocus={!googleClientId}
                className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only in setup or register mode) */}
          {(isSetupMode || authMode === 'register') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type your password"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                disabled={loading}
              />
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSetupMode ? (
                  <>
                    <span>Initialize Vault & Enter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : authMode === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account & Enter</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Vault</span>
                  </>
                )}
              </>
            )}
          </motion.button>

          {/* Switch link */}
          {!isSetupMode && (
            <div className="text-center pt-2">
              {authMode === 'login' ? (
                <p className="text-xs text-slate-400">
                  New to Ledgerly?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setError(null); }}
                    className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(null); }}
                    className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          )}
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Private Financial Vault</span>
          </div>
          <button
            type="button"
            onClick={() => setShowGoogleGuideModal(true)}
            className="text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Google Setup</span>
          </button>
        </div>
      </motion.div>

      {/* Google Setup & Quick Demo Modal */}
      <AnimatePresence>
        {showGoogleGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-200 relative"
            >
              <button
                type="button"
                onClick={() => setShowGoogleGuideModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md">
                  <GoogleLogo className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Google Account</h3>
                  <p className="text-xs text-slate-400">Sign in using your Google credentials</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-300">
                <p className="leading-relaxed text-slate-300">
                  To enable production Google Sign-In, add your Google OAuth Client ID to your{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-800 text-violet-300 font-mono text-[11px]">
                    .env.local
                  </code>{' '}
                  file:
                </p>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 select-all">
                  GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 text-[11px]">
                  <p className="font-semibold text-white">How to get a Client ID (Free):</p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                    <li>
                      Visit{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-400 underline inline-flex items-center gap-0.5"
                      >
                        Google Cloud Console <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </li>
                    <li>Click <strong>Create Credentials</strong> &rarr; <strong>OAuth Client ID</strong></li>
                    <li>Set Application Type to <strong>Web application</strong></li>
                    <li>Add Authorized JavaScript Origin: <code className="text-violet-300">http://localhost:3001</code></li>
                  </ol>
                </div>

                {/* Instant Demo Login Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDemoGoogleLogin}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Quick Test with Demo Google Account</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-1.5">
                    Instantly signs in with a verified Google profile to test the flow.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
