import { useState } from 'react';
import { useAuth } from './authContext';
import { authErrorMessage } from './authErrors';

// Reset errors that would reveal whether an email has an account. These get the
// same neutral message as a success; every other error (network, rate limit) is shown.
const NEUTRAL_RESET_CODES = new Set(['auth/user-not-found']);

export default function Login() {
  const { signup, login, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'signup';
  const isReset = mode === 'reset';

  const handleChange = (e) =>
    setForm({ ...form, [e.target.id]: e.target.value });

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (isSignUp && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        await signup(form.email, form.password, form.fullName);
      } else if (isReset) {
        try {
          await resetPassword(form.email);
        } catch (err) {
          if (!NEUTRAL_RESET_CODES.has(err.code)) throw err;
        }
        setInfo('If that email is registered, we sent a reset link to it. Check your inbox and spam folder.');
      } else {
        await login(form.email, form.password);
      }
      // Auth state updates after a successful signup or login.
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const title = isReset
    ? 'Reset your password'
    : isSignUp
    ? 'Create an account'
    : 'Welcome back';
  const subtitle = isReset
    ? "Enter your email and we'll send you a reset link"
    : isSignUp
    ? 'Sign up to start managing your tasks'
    : 'Sign in to access your personal To-Do list';
  const submitLabel = isReset
    ? 'Send reset link'
    : isSignUp
    ? 'Create account'
    : 'Sign in';
  const busyLabel = isReset ? 'Sending link…' : isSignUp ? 'Creating account…' : 'Signing in…';

  return (
    <div className="login-container">
      <section className="card login-card">
        <h2>{title}</h2>
        <p className="login-subtitle">{subtitle}</p>

        {error && <p className="form-error" role="alert">{error}</p>}
        {info && <p className="form-info" role="status">{info}</p>}

        <form onSubmit={handleSubmit} className="task-form">
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="fullName">Full name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                placeholder="e.g., Juan dela Cruz"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="e.g., student@up.edu.ph"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {!isReset && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                minLength={6}
                required
              />
            </div>
          )}

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy}
          >
            {busy ? busyLabel : submitLabel}
          </button>
        </form>

        {mode === 'signin' && (
          <div className="auth-toggle">
            <button
              type="button"
              className="btn-link"
              onClick={() => switchMode('reset')}
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="auth-toggle">
          {isReset ? (
            <button
              type="button"
              className="btn-link"
              onClick={() => switchMode('signin')}
            >
              Back to sign in
            </button>
          ) : (
            <>
              <span>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
              <button
                type="button"
                className="btn-link"
                onClick={() => switchMode(isSignUp ? 'signin' : 'signup')}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
