import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export function SignInPage() {
  const navigate = useNavigate();
  const { signin, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [reset, setReset] = useState({ email: '', otp: '', newPassword: '' });

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      const user = await signin(form.email, form.password);
      navigate('/');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="auth-shell auth-shell-luxe">
      <div className="auth-luxe-wrap">
        <article className="auth-luxe-panel">
          <h1 className="auth-luxe-title">Login</h1>
          <form className="auth-luxe-form" onSubmit={onSubmit}>
            <div className="auth-luxe-row">
              <label htmlFor="signin-email">Email *</label>
              <span>*Required fields</span>
            </div>
            <input
              id="signin-email"
              className="auth-luxe-input"
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <label htmlFor="signin-password" className="auth-luxe-label">
              Password *
            </label>
            <input
              id="signin-password"
              className="auth-luxe-input"
              type="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <div className="auth-luxe-meta">
              <label className="auth-luxe-check" htmlFor="rememberMe">
                <input id="rememberMe" type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>
            </div>
            <button type="submit" className="auth-luxe-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Next'}
            </button>
          </form>

          {message && <p className="form-message auth-luxe-message">{message}</p>}

          <details className="auth-reset">
            <summary>Forgot password?</summary>
            <div className="auth-reset-body">
              <input
                className="auth-luxe-input"
                type="email"
                placeholder="Email"
                value={reset.email}
                onChange={(e) => setReset((prev) => ({ ...prev, email: e.target.value }))}
              />
              <button
                type="button"
                className="auth-luxe-btn auth-luxe-btn-secondary"
                onClick={async () => {
                  try {
                    const data = await api.post('/auth/password-reset/start', { email: reset.email });
                    setMessage(data.message);
                  } catch (error) {
                    setMessage(error.message);
                  }
                }}
              >
                Send OTP
              </button>
              <input
                className="auth-luxe-input"
                type="text"
                placeholder="OTP"
                value={reset.otp}
                onChange={(e) => setReset((prev) => ({ ...prev, otp: e.target.value }))}
              />
              <input
                className="auth-luxe-input"
                type="password"
                placeholder="New Password"
                value={reset.newPassword}
                onChange={(e) => setReset((prev) => ({ ...prev, newPassword: e.target.value }))}
              />
              <button
                type="button"
                className="auth-luxe-btn auth-luxe-btn-secondary"
                onClick={async () => {
                  try {
                    const data = await api.post('/auth/password-reset/verify', reset);
                    setMessage(data.message);
                  } catch (error) {
                    setMessage(error.message);
                  }
                }}
              >
                Reset Password
              </button>
            </div>
          </details>
        </article>

        <article className="auth-luxe-panel auth-luxe-panel-secondary">
          <h2>Create an account</h2>
          <p>Enjoy a faster checkout experience and manage all your personal information in your dedicated account.</p>
          <Link to="/signup" className="auth-luxe-btn auth-luxe-btn-link">
            Create an account
          </Link>
        </article>
      </div>
    </section>
  );
}
