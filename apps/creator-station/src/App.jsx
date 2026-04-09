import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TopBar } from './components/layout';
import { WriterDashboard, QuestEditor } from './pages/write';
import { AdminDashboard } from './pages/admin';

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-navy-deep">
      {!isAdminRoute && <TopBar />}
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/write" replace />} />
          <Route path="/write" element={<WriterDashboard />} />
          <Route path="/write/quest/:id" element={<QuestEditor />} />
          <Route path="/admin" element={<AdminDashboard />} />
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
