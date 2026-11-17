import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  QrCode,
  Settings,
  BookmarkCheck,
  User,
  Moon,
  Sun,
  Home,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { isAuthenticated, isOrganizer } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
        else window.dispatchEvent(new CustomEvent('eventease:open-cmd'));
      } else if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    api
      .get('/events')
      .then((res) => setEvents(res.data || []))
      .catch(() => {});
  }, [open]);

  const actions = useMemo(() => {
    const list = [
      { id: 'home', label: 'Home', section: 'Navigation', icon: Home, to: '/' },
      {
        id: 'events',
        label: 'Browse Upcoming Events',
        section: 'Navigation',
        icon: Calendar,
        to: '/events'
      }
    ];

    if (isAuthenticated && isOrganizer) {
      list.push(
        {
          id: 'org-dash',
          label: 'Organizer Dashboard',
          section: 'Organizer Workspace',
          icon: LayoutDashboard,
          to: '/organizer/dashboard'
        },
        {
          id: 'org-new',
          label: 'Create New Event',
          section: 'Organizer Workspace',
          icon: PlusCircle,
          to: '/organizer/events/new'
        },
        {
          id: 'org-checkin',
          label: 'Gate QR Check-In Scanner',
          section: 'Organizer Workspace',
          icon: QrCode,
          to: '/organizer/check-in'
        },
        {
          id: 'org-analytics',
          label: 'Revenue & Occupancy Analytics',
          section: 'Organizer Workspace',
          icon: BarChart3,
          to: '/organizer/analytics'
        },
        {
          id: 'org-settings',
          label: 'Booking & Hold Settings',
          section: 'Organizer Workspace',
          icon: Settings,
          to: '/organizer/settings'
        }
      );
    } else if (isAuthenticated) {
      list.push(
        {
          id: 'att-dash',
          label: 'Attendee Dashboard',
          section: 'Attendee Workspace',
          icon: LayoutDashboard,
          to: '/attendee/dashboard'
        },
        {
          id: 'att-bookings',
          label: 'My Bookings & QR Tickets',
          section: 'Attendee Workspace',
          icon: BookmarkCheck,
          to: '/attendee/bookings'
        }
      );
    } else {
      list.push({
        id: 'login',
        label: 'Sign In / Create Account',
        section: 'Account',
        icon: User,
        to: '/login'
      });
    }

    if (isAuthenticated) {
      list.push({
        id: 'profile',
        label: 'Account Profile',
        section: 'Account',
        icon: User,
        to: '/profile'
      });
    }

    for (const ev of events) {
      list.push({
        id: `ev-${ev.id}`,
        label: `${ev.name} — ${ev.venue}`,
        section: 'Upcoming Events',
        icon: Calendar,
        to: `/events/${ev.id}`,
        meta: `${ev.availableSeats}/${ev.totalSeats} open`
      });
    }

    list.push({
      id: 'toggle-theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      section: 'Preferences',
      icon: theme === 'dark' ? Sun : Moon,
      run: () => toggleTheme()
    });

    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.section.toLowerCase().includes(q)
    );
  }, [events, isAuthenticated, isOrganizer, query, theme, toggleTheme]);

  if (!open) return null;

  const handleSelect = (item) => {
    onClose();
    if (item.run) {
      item.run();
    } else if (item.to) {
      navigate(item.to);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Quick search">
      <div className="cmd-palette-card" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
            padding: '0.9rem 1.1rem',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <Search size={18} color="var(--brand-primary)" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, pages, or actions..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          />
          <span className="kbd-shortcut">ESC</span>
        </div>

        <div className="cmd-palette-list">
          {actions.length === 0 ? (
            <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matching events or pages found.
            </div>
          ) : (
            actions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="cmd-item"
                  onClick={() => handleSelect(item)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <Icon size={16} />
                    <span>
                      <strong style={{ fontWeight: 600 }}>{item.label}</strong>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {item.section}
                      </span>
                    </span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    {item.meta && <span className="badge badge-green">{item.meta}</span>}
                    <ArrowRight size={14} color="var(--text-muted)" />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
