import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TopBar } from './components/layout';
import { AdminDashboard } from './pages/admin';
import { QuestEditor, WriterDashboard } from './pages/write';
import { useWriterStore } from './store/useWriterStore';

// Fixed test user for development
const DEV_USER = { email: 'creator@urbanquest.dev', name: 'Test Creator' };

function LoginScreen() {
  const { login, isLoading, error } = useWriterStore();
  const [email, setEmail] = useState(DEV_USER.email);
  const [name, setName] = useState(DEV_USER.name);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (email) {
      await login(email, name || email.split('@')[0]);
    }
  };

  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center p-4">
      <div className="bg-panel border border-panel-border rounded-xl p-8 max-w-md w-full">
        <h1 className="font-bangers text-3xl text-center mb-2">
          <span className="text-cyan">URBAN</span>
          <span className="text-neon-green">QUEST</span>
        </h1>
        <p className="text-white/70 text-center mb-8">Creator Station</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-input border border-panel-border rounded-lg px-4 py-3 text-white focus:border-cyan focus:outline-none"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-2">Display Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-input border border-panel-border rounded-lg px-4 py-3 text-white focus:border-cyan focus:outline-none"
              placeholder="Your Name"
            />
          </div>
          {error && <p className="text-hot-pink text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan text-navy-deep font-bangers py-3 rounded-lg hover:bg-cyan/90 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { isAuthenticated, checkAuth } = useWriterStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth().finally(() => setChecking(false));
  }, [checkAuth]);

  // Admin portal doesn't require auth
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-navy-deep">
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="text-cyan font-bangers text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-navy-deep">
      <TopBar />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/write" replace />} />
          <Route path="/write" element={<WriterDashboard />} />
          <Route path="/write/quest/:id" element={<QuestEditor />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
