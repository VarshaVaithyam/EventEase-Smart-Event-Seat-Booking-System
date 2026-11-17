import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogIn,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Zap,
  QrCode,
  Sparkles,
  Eye,
  EyeOff,
  Ticket,
  LayoutDashboard
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractErrorMessage } from '../services/api';

export default function LoginPage({ initialTab = 'signin' }) {
  const { login, register, isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(
    location.pathname === '/register' ? 'register' : initialTab
  );

  // Sign In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Create Account state
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ATTENDEE'
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setActiveTab(location.pathname === '/register' ? 'register' : initialTab);
    setError('');
  }, [location.pathname, initialTab]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectFrom = location.state?.from;
      const target =
        redirectFrom ||
        (user.role === 'ORGANIZER' ? '/organizer/dashboard' : '/attendee/dashboard');
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, location.state, navigate]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    const targetPath = tab === 'register' ? '/register' : '/login';
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true, state: location.state });
    }
  };

  const performLogin = async (loginEmail, loginPassword) => {
    setError('');
    const trimmedEmail = String(loginEmail || '').trim();
    if (!trimmedEmail || !loginPassword) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedInUser = await login(trimmedEmail, loginPassword);
      toast.success(`Welcome back, ${loggedInUser.name}!`);
      const redirectFrom = location.state?.from;
      navigate(
        redirectFrom ||
          (loggedInUser.role === 'ORGANIZER' ? '/organizer/dashboard' : '/attendee/dashboard'),
        { replace: true }
      );
    } catch (err) {
      const msg = extractErrorMessage(err, 'Invalid email or password');
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = regForm.name.trim();
    const cleanEmail = regForm.email.trim();
    if (cleanName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!regForm.password || regForm.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const createdUser = await register({
        ...regForm,
        name: cleanName,
        email: cleanEmail
      });
      toast.success(`Account created! Welcome, ${createdUser.name}.`);
      navigate(
        createdUser.role === 'ORGANIZER' ? '/organizer/dashboard' : '/attendee/dashboard',
        { replace: true }
      );
    } catch (err) {
      const msg = extractErrorMessage(err, 'Registration failed');
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const quickDemoLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('DemoPass@123');
    await performLogin(demoEmail, 'DemoPass@123');
  };

  return (
    <div>
      <PublicNavbar />
      <div className="auth-split-shell">
        <div className="auth-showcase-panel">
          <div className="hero-grid-overlay" />
          <div style={{ position: 'relative' }}>
            <div style={{ marginBottom: '1.35rem' }}>
              <BrandLogo height={40} textColor="#ffffff" />
            </div>
            <h2 style={{ fontSize: '2.15rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem' }}>
              Your Front-Row Seat to Every Great Event.
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.96rem', maxWidth: '470px', lineHeight: 1.65 }}>
              Reserve real-time auditorium seats with instant 5-minute holds and QR passes, or
              manage live events, pricing tiers, and gate check-ins from your Organizer Studio.
            </p>
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              {
                icon: ShieldCheck,
                title: 'Guaranteed Seat Protection',
                desc: 'Exclusive 5-minute seat hold ensures no one else can take your selected seats'
              },
              {
                icon: Zap,
                title: 'Smart Best-Seats Recommender',
                desc: 'Automatically finds optimal adjacent seats with a 5-minute hold timer'
              },
              {
                icon: QrCode,
                title: 'Digital QR Tickets & Gate Check-In',
                desc: 'Instant scannable passes with live organizer gate verification'
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  style={{
                    display: 'flex',
                    gap: '0.85rem',
                    alignItems: 'center',
                    padding: '0.9rem 1.05rem',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: 'rgba(124, 58, 237, 0.3)',
                      color: '#c4b5fd',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-card" style={{ maxWidth: '485px' }}>
            {/* Unified Sign In / Create Account Tabs */}
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'signin'}
                className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => switchTab('signin')}
              >
                <LogIn size={15} />
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'register'}
                className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => switchTab('register')}
              >
                <UserPlus size={15} />
                Create Account
              </button>
            </div>

            {activeTab === 'signin' ? (
              <>
                <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.5rem', fontWeight: 800 }}>
                  Welcome back
                </h1>
                <p style={{ margin: '0 0 1.3rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Sign in to access your Attendee Portal or Organizer Studio.
                </p>

                {error && (
                  <div
                    role="alert"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: 'var(--danger)',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      marginBottom: '1rem',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleLoginSubmit}
                  noValidate
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}
                >
                  <div className="form-group">
                    <label htmlFor="login-email" className="form-label">
                      Email Address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      className="form-input"
                      placeholder="you@eventease.dev"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="login-password" className="form-label">
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        className="form-input"
                        style={{ paddingRight: '2.6rem' }}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '0.65rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                    <LogIn size={17} />
                    {submitting ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>

                <div
                  style={{
                    marginTop: '1.35rem',
                    paddingTop: '1.1rem',
                    borderTop: '1px solid var(--border-color)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      marginBottom: '0.6rem'
                    }}
                  >
                    <KeyRound size={13} /> Quick Demo Accounts
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-ai btn-sm"
                      style={{ gridColumn: '1 / -1', justifyContent: 'center', padding: '0.55rem' }}
                      disabled={submitting}
                      onClick={() => quickDemoLogin('organizer@eventease.dev')}
                    >
                      <Sparkles size={14} /> Organizer Demo (Varsha)
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={submitting}
                      onClick={() => quickDemoLogin('attendee@eventease.dev')}
                    >
                      Attendee Demo 1
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={submitting}
                      onClick={() => quickDemoLogin('priya@eventease.dev')}
                    >
                      Attendee Demo 2
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.5rem', fontWeight: 800 }}>
                  Create your account
                </h1>
                <p style={{ margin: '0 0 1.2rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Choose whether you want to book tickets or organize events.
                </p>

                {error && (
                  <div
                    role="alert"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: 'var(--danger)',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      marginBottom: '1rem',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleRegisterSubmit}
                  noValidate
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}
                >
                  <div className="form-group">
                    <span className="form-label">Select Account Role</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      {[
                        {
                          value: 'ATTENDEE',
                          title: 'Attendee',
                          sub: 'Book seats & QR passes',
                          icon: Ticket
                        },
                        {
                          value: 'ORGANIZER',
                          title: 'Organizer',
                          sub: 'Host events & scan gates',
                          icon: LayoutDashboard
                        }
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const active = regForm.role === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRegForm({ ...regForm, role: opt.value })}
                            style={{
                              padding: '0.8rem',
                              borderRadius: '12px',
                              border: active
                                ? '2px solid var(--brand-primary)'
                                : '1px solid var(--border-strong)',
                              background: active ? 'var(--brand-soft)' : 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              textAlign: 'left',
                              cursor: 'pointer'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                fontWeight: 800
                              }}
                            >
                              <Icon size={16} color="var(--brand-primary)" /> {opt.title}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                marginTop: '0.18rem'
                              }}
                            >
                              {opt.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-name" className="form-label">
                      Full Name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      autoComplete="name"
                      className="form-input"
                      placeholder="Enter your full name"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-email" className="form-label">
                      Email Address
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      className="form-input"
                      placeholder="you@example.com"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-password" className="form-label">
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="form-input"
                        style={{ paddingRight: '2.6rem' }}
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((v) => !v)}
                        aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '0.65rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        {showRegPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                    <UserPlus size={17} />
                    {submitting
                      ? 'Creating Account...'
                      : `Create ${regForm.role === 'ORGANIZER' ? 'Organizer' : 'Attendee'} Account`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
