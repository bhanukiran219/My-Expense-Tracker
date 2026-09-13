import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  UserPlus,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';
import { LedgerlyLogo } from '../brand/LedgerlyLogo';
import {
  login,
  registerUser,
  setupMasterAccount,
  getAuthConfig,
  loginWithGoogle,
  loginWithGoogleDemo,
  getRecoveryQuestion,
  resetPasswordWithRecovery,
} from '../../api';

interface LoginViewProps {
  isSetupMode: boolean;
  initialUserHint?: { username: string; email?: string; picture?: string } | null;
  onSuccess: (user: { id: string; username: string; email?: string; picture?: string }) => void;
}

// Official Google "G" Logo
const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
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

const REMEMBERED_USER_KEY = 'ledgerly_remembered_user';

const SECURITY_QUESTIONS = [
  'What is your secret 4-digit PIN?',
  'What is your primary bank name (e.g. HDFC, ICICI, SBI)?',
  "What is your mother's maiden name?",
  'What was the name of your first school?',
  'What city were you born in?',
  'Custom question...',
];

export const LoginView: React.FC<LoginViewProps> = ({ isSetupMode, initialUserHint, onSuccess }) => {
  const [rememberedUser, setRememberedUser] = useState<{ username: string; picture?: string; email?: string } | null>(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialUserHint || null;
  });

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>(isSetupMode ? 'register' : 'login');
  const [username, setUsername] = useState(() => {
    if (isSetupMode) return 'Admin';
    try {
      const saved = localStorage.getItem(REMEMBERED_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.username) return parsed.username;
      }
    } catch {}
    return initialUserHint?.username || '';
  });

  useEffect(() => {
    if (initialUserHint && !rememberedUser && !username) {
      setRememberedUser(initialUserHint);
      setUsername(initialUserHint.username);
    }
  }, [initialUserHint]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Register Security Question state
  const [registerQuestionOption, setRegisterQuestionOption] = useState(SECURITY_QUESTIONS[0]);
  const [customRegisterQuestion, setCustomRegisterQuestion] = useState('');
  const [registerRecoveryAnswer, setRegisterRecoveryAnswer] = useState('');

  // Forgot Password state
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleAuthSuccess = (user: { id: string; username: string; email?: string; picture?: string }) => {
    try {
      localStorage.setItem(
        REMEMBERED_USER_KEY,
        JSON.stringify({
          username: user.username,
          email: user.email,
          picture: user.picture,
        })
      );
    } catch {}
    onSuccess(user);
  };

  // Google OAuth Config
  const [googleClientId, setGoogleClientId] = useState<string>('');
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
                  handleAuthSuccess(res.user);
                } catch (err: any) {
                  setError(err.message || 'Google authentication failed.');
                } finally {
                  setLoading(false);
                }
              }
            },
          });

          if (googleBtnContainerRef.current) {
            googleBtnContainerRef.current.innerHTML = '';
            g.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: 'filled_black',
              size: 'large',
              width: 320,
              text: 'continue_with',
              shape: 'pill',
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
        setError('Google Sign-In prompt failed. Please try signing in with your email and password.');
      }
    } else {
      handleDemoGoogleLogin();
    }
  };

  const handleDemoGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogleDemo();
      handleAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Google sign-in is not configured. Please use email and password.');
    } finally {
      setLoading(false);
    }
  };

  // Main login/register submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    if (isSetupMode || authMode === 'register') {
      if (authMode === 'register' && !username.trim()) {
        setError('Please enter your username.');
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
        handleAuthSuccess(res.user);
      } else if (authMode === 'register') {
        const chosenQuestion =
          registerQuestionOption === 'Custom question...'
            ? customRegisterQuestion.trim()
            : registerQuestionOption;
        const res = await registerUser(
          password,
          username.trim(),
          chosenQuestion || undefined,
          registerRecoveryAnswer.trim() || undefined
        );
        handleAuthSuccess(res.user);
      } else {
        const targetUsername = rememberedUser?.username || username.trim() || undefined;
        const res = await login(password, targetUsername);
        handleAuthSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password step 1: Find Account
  const handleForgotFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const targetUser = forgotUsername.trim();
    if (!targetUser) {
      setError('Please enter your username or email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await getRecoveryQuestion(targetUser);
      setRecoveryQuestion(res.question);
      setForgotStep(2);
    } catch (err: any) {
      setError(err.message || 'Account not found or no recovery question set.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password step 2: Reset Password
  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!recoveryAnswer.trim()) {
      setError('Please enter your recovery PIN or answer.');
      return;
    }
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordWithRecovery(
        forgotUsername.trim(),
        recoveryAnswer.trim(),
        newPassword
      );
      setSuccessMessage('Password reset successfully! Unlocking your vault...');
      setTimeout(() => {
        handleAuthSuccess(res.user);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your answer.');
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
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10 bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-violet-950/40"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <LedgerlyLogo size="lg" className="mb-3.5" />

          <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight leading-snug">
            {isSetupMode
              ? 'Create master passcode'
              : authMode === 'forgot'
              ? forgotStep === 1
                ? 'Forgot Password'
                : 'Reset Your Password'
              : authMode === 'register'
              ? 'Create an account'
              : rememberedUser?.username
              ? `Welcome back, ${rememberedUser.username}`
              : 'Welcome back'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isSetupMode
              ? 'Enter your username below to initialize your vault'
              : authMode === 'forgot'
              ? forgotStep === 1
                ? 'Enter your username or email to recover access'
                : 'Verify your identity and set a new password'
              : authMode === 'register'
              ? 'Enter your details below to create your secure account'
              : rememberedUser?.username
              ? 'Enter your password to unlock your vault'
              : 'Enter your username below to login to your account'}
          </p>
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

        {/* Success Notification */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{successMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FORGOT PASSWORD MODE */}
        {authMode === 'forgot' ? (
          <div className="space-y-4">
            {forgotStep === 1 ? (
              /* Step 1: Input username or email */
              <form onSubmit={handleForgotFindAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Works offline without Google login or email confirmation.</span>
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Find Account & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            ) : (
              /* Step 2: Security Question, Answer & New Password */
              <form onSubmit={handleForgotResetPassword} className="space-y-4">
                {/* Security Question Card */}
                <div className="p-3.5 rounded-2xl bg-violet-950/50 border border-violet-800/60 shadow-inner">
                  <div className="flex items-start gap-2.5">
                    <KeyRound className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">
                        Security Recovery Question
                      </p>
                      <p className="text-sm font-semibold text-white leading-snug">
                        {recoveryQuestion}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recovery Answer / PIN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Answer or 4-Digit PIN
                  </label>
                  <input
                    type="text"
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    placeholder="Enter your secret answer or PIN"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Not case-sensitive. Default PIN for <strong className="text-slate-300">bhanu</strong> is <strong className="text-emerald-400">1234</strong>.
                  </p>
                </div>

                {/* New Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      New Password
                    </label>
                    <span className="text-[11px] text-slate-500">Min. 4 characters</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new secure password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    disabled={loading}
                  />
                </div>

                {/* Reset Submit */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Reset Password & Unlock Vault</span>
                    </>
                  )}
                </motion.button>
              </form>
            )}

            {/* Back to Sign In Link */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                  setSuccessMessage(null);
                  setForgotStep(1);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign in</span>
              </button>
            </div>
          </div>
        ) : (
          /* LOGIN & REGISTER MODE */
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Section */}
              {rememberedUser && authMode === 'login' && !isSetupMode ? (
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3 min-w-0">
                    {rememberedUser.picture ? (
                      <img
                        src={rememberedUser.picture}
                        alt={rememberedUser.username}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-violet-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                        {rememberedUser.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white truncate">
                          {rememberedUser.username}
                        </p>
                        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-full shrink-0">
                          Saved
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {rememberedUser.email || 'Local vault account'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRememberedUser(null);
                      setUsername('');
                      try {
                        localStorage.removeItem(REMEMBERED_USER_KEY);
                      } catch {}
                    }}
                    className="text-xs text-violet-400 hover:text-violet-300 font-medium px-2.5 py-1.5 rounded-xl hover:bg-violet-500/10 transition-colors shrink-0 cursor-pointer border border-transparent hover:border-violet-500/20"
                  >
                    Switch
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    disabled={loading}
                    autoFocus={!rememberedUser?.username && !googleClientId}
                  />
                </div>
              )}

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  {authMode === 'login' && !isSetupMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setForgotStep(1);
                        setForgotUsername(username || rememberedUser?.username || '');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors cursor-pointer font-medium"
                    >
                      Forgot your password?
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500">Min. 4 characters</span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus={!!rememberedUser?.username}
                    placeholder={
                      isSetupMode || authMode === 'register'
                        ? 'Create a secure password'
                        : 'Enter your password'
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Account Recovery Setup (in register mode) */}
              {authMode === 'register' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-slate-300">
                      Password Recovery Setup (Optional)
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Security Question
                    </label>
                    <select
                      value={registerQuestionOption}
                      onChange={(e) => setRegisterQuestionOption(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
                      disabled={loading}
                    >
                      {SECURITY_QUESTIONS.map((q) => (
                        <option key={q} value={q} className="bg-slate-900 text-white">
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>

                  {registerQuestionOption === 'Custom question...' && (
                    <div>
                      <input
                        type="text"
                        value={customRegisterQuestion}
                        onChange={(e) => setCustomRegisterQuestion(e.target.value)}
                        placeholder="Type your custom security question"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                        disabled={loading}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Recovery PIN or Answer
                    </label>
                    <input
                      type="text"
                      value={registerRecoveryAnswer}
                      onChange={(e) => setRegisterRecoveryAnswer(e.target.value)}
                      placeholder="e.g. 1234 or your secret answer"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      disabled={loading}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Used to reset password if forgotten without needing email or Google.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isSetupMode ? (
                  <>
                    <span>Initialize Vault & Enter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : authMode === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Sign up</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900/90 px-3 text-[11px] font-medium text-slate-400 whitespace-nowrap">
                Or continue with
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            {/* Google Sign-In Button */}
            <div>
              {googleClientId ? (
                <div className="flex justify-center" ref={googleBtnContainerRef} />
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-medium text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-slate-200"
                >
                  <GoogleLogo className="w-4 h-4 shrink-0" />
                  <span>Login with Google</span>
                </motion.button>
              )}
            </div>

            {/* Switch Link: Sign up vs Sign in */}
            {!isSetupMode && (
              <div className="text-center mt-5">
                {authMode === 'login' ? (
                  <p className="text-xs text-slate-400">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Legal Disclaimer */}
        <p className="text-[11px] text-slate-500 text-center mt-4 leading-relaxed">
          By clicking continue, you agree to our{' '}
          <span className="underline underline-offset-2 text-slate-400 cursor-pointer hover:text-slate-300">
            Terms of Service
          </span>{' '}
          and{' '}
          <span className="underline underline-offset-2 text-slate-400 cursor-pointer hover:text-slate-300">
            Privacy Policy
          </span>
          .
        </p>

        {/* Private Vault Badge */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Private Financial Vault</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
