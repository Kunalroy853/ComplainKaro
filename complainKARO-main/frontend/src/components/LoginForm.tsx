import { useState, useCallback } from 'react';
import type { User } from '../api/client';

interface LoginFormProps {
  onLogin: (token: string, user: User) => void;
  loginStudent: (phone: string, password: string) => Promise<{ token: string; user: User }>;
  loginWarden: (name: string, password: string) => Promise<{ token: string; user: User }>;
  registerStudent: (data: { name: string; roomNumber: string; phone: string; password: string }) => Promise<{ token: string; user: User }>;
  registerWarden: (data: { name: string; hostelBlock: string; password: string }) => Promise<{ token: string; user: User }>;
}

type Role = 'student' | 'warden';
type Mode = 'login' | 'register';

export function LoginForm({ onLogin, loginStudent, loginWarden, registerStudent, registerWarden }: LoginFormProps) {
  const [role, setRole] = useState<Role>('student');
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [hostelBlock, setHostelBlock] = useState('');
  const [wardenName, setWardenName] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result: { token: string; user: User };
      if (role === 'student') {
        if (mode === 'login') {
          result = await loginStudent(phone, password);
        } else {
          result = await registerStudent({ name, roomNumber, phone, password });
        }
      } else {
        if (mode === 'login') {
          result = await loginWarden(wardenName, password);
        } else {
          result = await registerWarden({ name: wardenName, hostelBlock, password });
        }
      }
      onLogin(result.token, result.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [role, mode, phone, password, name, roomNumber, hostelBlock, wardenName, loginStudent, registerStudent, loginWarden, registerWarden, onLogin]);

  const fillDemoStudent = () => {
    setRole('student');
    setMode('login');
    setPhone('9876543210');
    setPassword('student123');
    setError('');
  };

  const fillDemoWarden = () => {
    setRole('warden');
    setMode('login');
    setWardenName('Mr. Verma');
    setPassword('warden123');
    setError('');
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: 440,
      margin: '0 auto',
      position: 'relative',
      zIndex: 2,
      background: 'rgba(15, 20, 43, 0.9)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 'var(--r-xl)',
      padding: '2rem',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 0.75rem auto', color: '#38bdf8'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
          Complain<span className="grad-text">KARO</span>
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--txt-muted)', marginTop: 4 }}>
          AI Hostel Voice-to-Ticket Triage System
        </p>
      </div>

      {/* Role Switcher Tabs */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
        padding: 4, background: 'rgba(6, 8, 19, 0.8)',
        borderRadius: 'var(--r-md)', border: '1px solid var(--clr-border)'
      }}>
        <button
          type="button"
          onClick={() => { setRole('student'); setError(''); }}
          style={{
            padding: '8px 12px', borderRadius: 'var(--r-sm)', border: 'none',
            fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer',
            background: role === 'student' ? 'var(--grad-btn)' : 'transparent',
            color: role === 'student' ? '#ffffff' : 'var(--txt-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          🎓 Student Portal
        </button>
        <button
          type="button"
          onClick={() => { setRole('warden'); setError(''); }}
          style={{
            padding: '8px 12px', borderRadius: 'var(--r-sm)', border: 'none',
            fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer',
            background: role === 'warden' ? 'var(--grad-btn)' : 'transparent',
            color: role === 'warden' ? '#ffffff' : 'var(--txt-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          🏛️ Warden Portal
        </button>
      </div>

      {/* Sub-Mode Tabs (Login / Register) */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--clr-border)', gap: 16, paddingBottom: 6 }}>
        <button
          type="button"
          onClick={() => { setMode('login'); setError(''); }}
          style={{
            background: 'none', border: 'none', padding: '4px 0',
            fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
            color: mode === 'login' ? '#38bdf8' : 'var(--txt-muted)',
            borderBottom: mode === 'login' ? '2px solid #38bdf8' : '2px solid transparent',
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(''); }}
          style={{
            background: 'none', border: 'none', padding: '4px 0',
            fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
            color: mode === 'register' ? '#38bdf8' : 'var(--txt-muted)',
            borderBottom: mode === 'register' ? '2px solid #38bdf8' : '2px solid transparent',
          }}
        >
          Create Account
        </button>
      </div>

      {/* Error Notification */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--r-md)',
          color: '#ef4444', fontSize: '0.825rem', fontWeight: 600
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {role === 'student' && mode === 'register' && (
          <>
            <div>
              <label style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--txt-secondary)', display: 'block', marginBottom: 4 }}>
                Full Name
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Rahul Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--txt-secondary)', display: 'block', marginBottom: 4 }}>
                Room Number
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Room 204-B"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                required
              />
            </div>
          </>
        )}

        {role === 'student' && (
          <div>
            <label style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--txt-secondary)', display: 'block', marginBottom: 4 }}>
              Phone Number
            </label>
            <input
              className="form-input"
              type="tel"
              placeholder="10-digit phone number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </div>
        )}

        {role === 'warden' && (
          <div>
            <label style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--txt-secondary)', display: 'block', marginBottom: 4 }}>
              Warden Name
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="Mr. Verma"
              value={wardenName}
              onChange={e => setWardenName(e.target.value)}
              required
            />
          </div>
        )}

        {role === 'warden' && mode === 'register' && (
          <div>
            <label style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--txt-secondary)', display: 'block', marginBottom: 4 }}>
              Hostel Block / Name
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="Block-A Main Hostel"
              value={hostelBlock}
              onChange={e => setHostelBlock(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <label style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--txt-secondary)', display: 'block', marginBottom: 4 }}>
            Password
          </label>
          <input
            className="form-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          className="btn btn-primary btn-lg"
          type="submit"
          disabled={loading}
          style={{ width: '100%', height: 46, marginTop: 6, background: 'var(--grad-btn)' }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <div className="spinner" /> Authenticating...
            </span>
          ) : (
            `${mode === 'login' ? 'Sign In' : 'Create Account'} →`
          )}
        </button>
      </form>

      {/* Quick Demo Credentials Footer */}
      <div style={{
        marginTop: 6,
        paddingTop: 14,
        borderTop: '1px solid var(--clr-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        <div style={{ fontSize: '0.675rem', color: 'var(--txt-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
          ⚡ ONE-CLICK DEMO AUTO-FILL
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            onClick={fillDemoStudent}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--r-md)',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8' }}>🎓 Student Demo</span>
            <span style={{ fontSize: '0.725rem', color: 'var(--txt-secondary)', fontFamily: 'var(--font-mono)' }}>9876543210</span>
          </button>

          <button
            type="button"
            onClick={fillDemoWarden}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--r-md)',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#a855f7' }}>🏛️ Warden Demo</span>
            <span style={{ fontSize: '0.725rem', color: 'var(--txt-secondary)', fontFamily: 'var(--font-mono)' }}>Mr. Verma</span>
          </button>
        </div>
      </div>
    </div>
  );
}
