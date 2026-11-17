import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Moon, Sun, QrCode, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from './BrandLogo';

export default function PublicNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const dashboardPath = user?.role === 'ORGANIZER' ? '/organizer/dashboard' : '/attendee/dashboard';

  return (
    <header className="public-navbar">
      <div className="public-navbar-inner">
        <Link to="/" className="brand-logo" aria-label="EventEase Home">
          <BrandLogo height={34} />
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          <NavLink to="/" end className="nav-link">
            Home
          </NavLink>
          <NavLink to="/events" className="nav-link">
            Events
          </NavLink>

          <button
            type="button"
            className="theme-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {isAuthenticated ? (
            <>
              {user.role === 'ORGANIZER' && (
                <Link to="/organizer/check-in" className="btn btn-secondary btn-sm">
                  <QrCode size={15} />
                  Gate Scanner
                </Link>
              )}
              <Link to={dashboardPath} className="btn btn-primary btn-sm">
                <LayoutDashboard size={15} />
                {user.role === 'ORGANIZER' ? 'Organizer Studio' : 'My Dashboard'}
              </Link>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              <LogIn size={15} />
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
