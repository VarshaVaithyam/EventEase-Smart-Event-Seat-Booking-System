import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  BarChart3,
  Settings,
  BookmarkCheck,
  User,
  LogOut,
  Menu,
  X,
  FolderKanban,
  QrCode,
  Search,
  Moon,
  Sun,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from './BrandLogo';

export default function WorkspaceLayout({ children }) {
  const { user, isOrganizer, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const organizerLinks = [
    { to: '/organizer/dashboard', label: 'Overview Studio', icon: LayoutDashboard },
    { to: '/organizer/events/new', label: 'Create Event + AI', icon: PlusCircle },
    { to: '/organizer/events', label: 'Manage Events', icon: FolderKanban },
    { to: '/organizer/check-in', label: 'Gate QR Scanner', icon: QrCode },
    { to: '/organizer/analytics', label: 'Revenue & Analytics', icon: BarChart3 },
    { to: '/organizer/settings', label: 'Booking Rules', icon: Settings },
    { to: '/profile', label: 'Account Profile', icon: User }
  ];

  const attendeeLinks = [
    { to: '/attendee/dashboard', label: 'Attendee Hub', icon: LayoutDashboard },
    { to: '/events', label: 'Explore Events', icon: Calendar },
    { to: '/attendee/bookings', label: 'My Passes & History', icon: BookmarkCheck },
    { to: '/profile', label: 'Account Profile', icon: User }
  ];

  const links = isOrganizer ? organizerLinks : attendeeLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('eventease:open-cmd'));
  };

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', fontWeight: 800, color: '#fff' }}>
          <BrandLogo height={28} textColor="#ffffff" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={toggleTheme}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <Link to="/" className="sidebar-brand">
              <BrandLogo height={30} textColor="#ffffff" />
            </Link>
            <span className="sidebar-role-pill">
              <ShieldCheck size={11} /> {user?.role}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Workspace sidebar">
          <div className="sidebar-section-label">
            {isOrganizer ? 'Organizer Operations' : 'Attendee Experience'}
          </div>
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/organizer/events'}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-box">
            <span className="sidebar-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              color: '#e2e8f0',
              borderColor: 'rgba(255,255,255,0.12)'
            }}
            onClick={handleLogout}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <div className="workspace-topbar" style={{ justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button type="button" className="cmd-trigger-btn" onClick={openPalette}>
              <Search size={14} />
              <span>Search Events & Pages...</span>
              <span className="kbd-shortcut">Ctrl K</span>
            </button>

            <button
              type="button"
              className="theme-icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <div className="page-container">{children}</div>
      </main>
    </div>
  );
}
