import { useState } from 'react';
import { useAuth } from './authContext';

const ERRORS = {
  'auth/email-already-in-use': 'That email is already registered.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

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
        await resetPassword(form.email).catch(() => {});
        // Same message either way so we don't reveal which emails exist
        setInfo('If that email is registered, a reset link has been sent.');
      } else {
        await login(form.email, form.password);
      }
      // Auth state updates after a successful signup or login.
    } catch (err) {
      setError(ERRORS[err.code] || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const title = isReset
    ? 'Reset Password'
    : isSignUp
    ? 'Create an Account'
    : 'Welcome Back';
  const subtitle = isReset
    ? "Enter your email and we'll send you a reset link"
    : isSignUp
    ? 'Sign up to start managing your tasks'
    : 'Sign in to access your personal To-Do list';
  const submitLabel = isReset
    ? 'Send Reset Link'
    : isSignUp
    ? 'Sign Up'
    : 'Sign In';

  return (
    <div className="login-container">
      <section className="card login-card">
        <h2>{title}</h2>
        <p className="login-subtitle">{subtitle}</p>

        {error && <p className="form-error" role="alert">{error}</p>}
        {info && <p className="form-info">{info}</p>}

        <form onSubmit={handleSubmit} className="task-form">
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
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
            <label htmlFor="email">Email Address</label>
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
              <label htmlFor="confirmPassword">Confirm Password</label>
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
            {busy ? 'Please wait...' : submitLabel}
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
              Back to Sign In
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
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
