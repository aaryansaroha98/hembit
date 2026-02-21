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
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/account');
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <p className="auth-eyebrow">HEMBIT ACCOUNT</p>
        <h1>Sign In</h1>
        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'SIGN IN'}
          </button>
          {message && <p className="form-message">{message}</p>}
        </form>

        <div className="auth-inline">
          <span>New customer?</span>
          <Link to="/signup">Create account</Link>
        </div>

        <details className="reset-panel">
          <summary>Forgot your password?</summary>
          <div className="reset-panel-body">
            <input
              type="email"
              placeholder="Email"
              value={reset.email}
              onChange={(e) => setReset((prev) => ({ ...prev, email: e.target.value }))}
            />
            <button
              type="button"
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
              type="text"
              placeholder="OTP"
              value={reset.otp}
              onChange={(e) => setReset((prev) => ({ ...prev, otp: e.target.value }))}
            />
            <input
              type="password"
              placeholder="New Password"
              value={reset.newPassword}
              onChange={(e) => setReset((prev) => ({ ...prev, newPassword: e.target.value }))}
            />
            <button
              type="button"
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
      </div>
    </section>
  );
}
