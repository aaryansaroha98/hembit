import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function SignUpPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    country: '',
    pincode: '',
    gender: '',
    age: '',
    otp: '',
  });
  const [message, setMessage] = useState('');

  const startSignup = async (event) => {
    event.preventDefault();
    try {
      const data = await api.post('/auth/signup/start', {
        name: form.name,
        email: form.email,
        password: form.password,
        mobile: form.mobile,
        country: form.country,
        pincode: form.pincode,
        gender: form.gender,
        age: Number(form.age),
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
    <section className="auth-shell auth-shell-luxe">
      <div className="auth-luxe-wrap auth-luxe-wrap-signup">
        <article className="auth-luxe-panel">
          <h1 className="auth-luxe-title">Create an account</h1>
          <p className="auth-luxe-copy">
            Enjoy a faster checkout experience and manage all your personal information in your dedicated account.
          </p>

          {step === 1 ? (
            <form className="auth-luxe-form" onSubmit={startSignup}>
              <div className="auth-luxe-row">
                <label htmlFor="signup-email">Email *</label>
                <span>*Required fields</span>
              </div>
              <input
                id="signup-email"
                className="auth-luxe-input"
                type="email"
                placeholder="Email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <label htmlFor="signup-password" className="auth-luxe-label">
                Password *
              </label>
              <input
                id="signup-password"
                className="auth-luxe-input"
                type="password"
                placeholder="Password"
                required
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              <label htmlFor="signup-name" className="auth-luxe-label">
                Full name *
              </label>
              <input
                id="signup-name"
                className="auth-luxe-input"
                type="text"
                placeholder="Full name"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <label htmlFor="signup-mobile" className="auth-luxe-label">
                Mobile number *
              </label>
              <input
                id="signup-mobile"
                className="auth-luxe-input"
                type="tel"
                placeholder="Mobile number"
                required
                value={form.mobile}
                onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
              />
              <label htmlFor="signup-country" className="auth-luxe-label">
                Country *
              </label>
              <input
                id="signup-country"
                className="auth-luxe-input"
                type="text"
                placeholder="Country"
                required
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              />
              <label htmlFor="signup-pincode" className="auth-luxe-label">
                Pincode *
              </label>
              <input
                id="signup-pincode"
                className="auth-luxe-input"
                type="text"
                placeholder="Pincode"
                required
                value={form.pincode}
                onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))}
              />
              <label htmlFor="signup-gender" className="auth-luxe-label">
                Gender *
              </label>
              <select
                id="signup-gender"
                className="auth-luxe-input auth-luxe-select"
                required
                value={form.gender}
                onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <label htmlFor="signup-age" className="auth-luxe-label">
                Age *
              </label>
              <input
                id="signup-age"
                className="auth-luxe-input"
                type="number"
                min="13"
                max="120"
                placeholder="Age"
                required
                value={form.age}
                onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
              />
              <button type="submit" className="auth-luxe-btn">
                Create my profile
              </button>
            </form>
          ) : (
            <form className="auth-luxe-form" onSubmit={verifyOtp}>
              <p className="auth-luxe-copy auth-luxe-copy-small">Enter the OTP sent to {form.email}</p>
              <label htmlFor="signup-otp" className="auth-luxe-label">
                OTP *
              </label>
              <input
                id="signup-otp"
                className="auth-luxe-input"
                type="text"
                placeholder="OTP"
                required
                value={form.otp}
                onChange={(e) => setForm((prev) => ({ ...prev, otp: e.target.value }))}
              />
              <button type="submit" className="auth-luxe-btn">
                Verify OTP
              </button>
            </form>
          )}

          {message && <p className="form-message auth-luxe-message">{message}</p>}

          <div className="auth-luxe-switch">
            <span>Already have an account?</span>
            <Link to="/signin">Login</Link>
          </div>
        </article>
      </div>
    </section>
  );
}
