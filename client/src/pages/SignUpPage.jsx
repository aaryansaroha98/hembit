import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function SignUpPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', otp: '' });
  const [message, setMessage] = useState('');

  const startSignup = async (event) => {
    event.preventDefault();
    try {
      const data = await api.post('/auth/signup/start', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setMessage(data.message);
      setStep(2);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    try {
      const data = await api.post('/auth/signup/verify', {
        email: form.email,
        otp: form.otp,
      });
      setSession(data.token, data.user);
      navigate('/account');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <p className="auth-eyebrow">HEMBIT ACCOUNT</p>
        <h1>Create Profile</h1>

        {step === 1 ? (
          <form onSubmit={startSignup}>
            <input
              type="text"
              placeholder="Full Name"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
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
            <button type="submit" className="primary-btn">
              CREATE PROFILE
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <p>Enter OTP sent to {form.email}</p>
            <input
              type="text"
              placeholder="OTP"
              required
              value={form.otp}
              onChange={(e) => setForm((prev) => ({ ...prev, otp: e.target.value }))}
            />
            <button type="submit" className="primary-btn">
              VERIFY OTP
            </button>
          </form>
        )}

        {message && <p className="form-message">{message}</p>}
      </div>
    </section>
  );
}
