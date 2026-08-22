import { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { StudentDashboard } from './components/StudentDashboard';
import { WardenDashboard } from './components/WardenDashboard';
import { api } from './api/client';
import type { User } from './api/client';

const TOKEN_KEY = 'vl_token';
const USER_KEY = 'vl_user';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  function handleLogin(t: string, u: User) {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  // Render
  if (!token || !user) {
    return (
      <div className="page-center">
        {/* Ambient background */}
        <div className="page-center-ambient" />
        <LoginForm
          onLogin={handleLogin}
          loginStudent={api.loginStudent}
          loginWarden={api.loginWarden}
          registerStudent={api.registerStudent}
          registerWarden={api.registerWarden}
        />
      </div>
    );
  }

  if (user.role === 'warden') {
    return <WardenDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  return <StudentDashboard token={token} user={user} onLogout={handleLogout} />;
}

export default App;
