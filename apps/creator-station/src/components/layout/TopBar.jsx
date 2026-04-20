import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui';

export function TopBar() {
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-panel border-b border-panel-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/write')}>
        <h1 className="font-bangers text-2xl bg-gradient-to-r from-cyan to-neon-green bg-clip-text text-transparent">
          Urban Quest
        </h1>
        <Badge variant="pink-solid">Writer Studio</Badge>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-purple/20 border-2 border-purple flex items-center justify-center hover:bg-purple/30 transition-colors"
          title="My Profile"
        >
          <User className="w-5 h-5 text-purple" />
        </button>
      </div>
    </header>
  );
}

export default TopBar;
