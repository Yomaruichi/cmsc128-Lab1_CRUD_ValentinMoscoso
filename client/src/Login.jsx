import { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (onLoginSuccess) {
      onLoginSuccess({
        fullName: (formData.get('fullName') || '').trim(),
        email: formData.get('email').trim(),
      });
    }
  };

  return (
    <div className="login-container">
      <section className="card login-card">
        <h2>{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
        <p className="login-subtitle">
          {isSignUp
            ? 'Sign up to start managing your tasks'
            : 'Sign in to access your personal To-Do list'}
        </p>

        <form onSubmit={handleSubmit} className="task-form">
          {/* ONLY SHOWS ON SIGN UP */}
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                placeholder="e.g., Juan dela Cruz"
                required
              />
            </div>
          )}

          {/* SHOWS ON BOTH SIGN IN & SIGN UP */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="e.g., student@up.edu.ph"
              required
            />
          </div>

          {/* SHOWS ON BOTH SIGN IN & SIGN UP */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              required
            />
          </div>

          {/* STRICTLY FOR SIGN UP / MAKING AN ACCOUNT */}
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Re-enter your password"
                required
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle">
          <span>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            className="btn-link"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </section>
    </div>
  );
}
