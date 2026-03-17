import React from 'react';
import { LogOut, Home, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { User as UserType } from '../../types';

interface HeaderProps {
  user: UserType | null;
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onSignOut }) => {
  const location = useLocation();
  
  const handleSignOut = async () => {
    onSignOut();
  };

  return (
    <header className="bg-[var(--color-primary-brand)] text-white p-3 shadow-md flex-shrink-0">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-xs sm:text-sm" style={{ color: '#2E8A6A' }}>TH</span>
            </div>
            <span className="text-sm sm:text-base font-semibold truncate">THFCScan</span>
          </div>
          
          {/* Navigation Links - Hidden on small screens, shown on medium+ */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Home size={16} />
                Donation
              </Link>
              <Link
                to="/stats"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/stats' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 size={16} />
                Statistics
              </Link>
            </nav>
          )}
        </div>
        
        {user && (
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Mobile Navigation - Only icons */}
            <nav className="flex md:hidden items-center gap-1 mr-2">
              <Link
                to="/"
                className={`p-2 rounded-lg transition-colors ${
                  location.pathname === '/' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Donation"
              >
                <Home size={18} />
              </Link>
              <Link
                to="/stats"
                className={`p-2 rounded-lg transition-colors ${
                  location.pathname === '/stats' 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Statistics"
              >
                <BarChart3 size={18} />
              </Link>
            </nav>

            {/* User Info - Responsive */}
            <div className="text-right bg-white/10 rounded-lg px-2 py-1 backdrop-blur-sm max-w-[120px] sm:max-w-none">
              <div className="text-xs font-medium text-white/90 mb-1 hidden sm:block">Logged in as:</div>
              <div className="text-xs sm:text-sm font-semibold text-white leading-tight truncate">
                {user.full_name || user.email}
              </div>
              <div className="text-xs text-white/80 mt-1 hidden sm:block">
                ID: {user.employee_id || 'SAH-001'}
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 touch-target"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;