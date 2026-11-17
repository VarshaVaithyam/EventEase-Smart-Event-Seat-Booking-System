import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Grid,
  CheckCircle2,
  Clock,
  TrendingUp,
  PlusCircle,
  Settings,
  BarChart3,
  QrCode,
  IndianRupee,
  UserCheck
} from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/organizer/analytics'), api.get('/settings')])
      .then(([anRes, setRes]) => {
        setAnalytics(anRes.data);
        setSettings(setRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview Studio</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name}. Track ticket revenue, seat occupancy, and venue check-ins.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <Link to="/organizer/events/new" className="btn btn-primary">
            <PlusCircle size={16} /> Create Event + AI
          </Link>
          <Link to="/organizer/check-in" className="btn btn-ai">
            <QrCode size={16} /> Gate QR Scanner
          </Link>
          <Link to="/organizer/analytics" className="btn btn-secondary">
            <BarChart3 size={16} /> Analytics
          </Link>
          <Link to="/organizer/settings" className="btn btn-secondary">
            <Settings size={16} /> Rules
          </Link>
        </div>
      </div>

      {loading || !analytics ? (
        <div className="empty-state">Loading dashboard overview...</div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Gross Ticket Revenue</div>
                <div className="kpi-value" style={{ color: 'var(--brand-primary)' }}>
                  {formatCurrency(analytics.totalRevenue || 0)}
                </div>
                <div className="kpi-meta">{analytics.totalBookedSeats} paid seats reserved</div>
              </div>
              <div className="kpi-icon">
                <IndianRupee size={20} />
              </div>
            </div>

            <div className="kpi-card">
              <div>
                <div className="kpi-label">Confirmed Bookings</div>
                <div className="kpi-value">{analytics.totalConfirmedBookings}</div>
                <div className="kpi-meta">Across {analytics.totalEvents} active event(s)</div>
              </div>
              <div className="kpi-icon">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="kpi-card">
              <div>
                <div className="kpi-label">Occupancy Rate</div>
                <div className="kpi-value">{analytics.bookingPercentage}%</div>
                <div className="kpi-meta">
                  {analytics.availableSeats} of {analytics.totalSeats} seats open
                </div>
              </div>
              <div className="kpi-icon">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="kpi-card">
              <div>
                <div className="kpi-label">Gate Check-Ins</div>
                <div className="kpi-value" style={{ color: 'var(--success)' }}>
                  {analytics.totalCheckedInBookings || 0}
                </div>
                <div className="kpi-meta">
                  {analytics.currentlyHeldSeats} seats currently in hold lock
                </div>
              </div>
              <div className="kpi-icon">
                <UserCheck size={20} />
              </div>
            </div>
          </div>

          {settings && (
            <div
              className="card"
              style={{
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                background: 'var(--brand-soft)',
                borderColor: 'rgba(79, 70, 229, 0.25)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Clock size={22} color="var(--brand-primary)" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.93rem' }}>
                    Active Seat Hold & Booking Rules
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Maximum <strong>{settings.maxSeatsPerBooking} seats</strong> per booking •{' '}
                    Exclusive seat lock expires automatically after{' '}
                    <strong>{settings.holdDurationMinutes} minutes</strong>.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to="/organizer/check-in" className="btn btn-primary btn-sm">
                  <QrCode size={14} /> Scan Tickets
                </Link>
                <Link to="/organizer/settings" className="btn btn-secondary btn-sm">
                  Configure Policy
                </Link>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '1.25rem 1.4rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Your Events, Revenue & Seat Occupancy
              </h2>
              <Link to="/organizer/events" className="btn btn-secondary btn-sm">
                Manage All Events
              </Link>
            </div>

            {analytics.eventStats.length === 0 ? (
              <div className="empty-state">
                <p>No events created yet. Launch your first auditorium event!</p>
                <Link to="/organizer/events/new" className="btn btn-primary btn-sm">
                  Create Event
                </Link>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Date</th>
                      <th>Capacity</th>
                      <th>Available</th>
                      <th>Held</th>
                      <th>Booked</th>
                      <th>Revenue</th>
                      <th>Checked In</th>
                      <th>Occupancy</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.eventStats.map((ev) => (
                      <tr key={ev.eventId}>
                        <td>
                          <div style={{ fontWeight: 800 }}>{ev.eventName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {ev.venue}
                          </div>
                        </td>
                        <td>{formatDateTime(ev.eventDate)}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                            <Grid size={13} /> {ev.totalSeats}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-green">{ev.availableSeats}</span>
                        </td>
                        <td>
                          <span className="badge badge-orange">{ev.heldSeats}</span>
                        </td>
                        <td>
                          <span className="badge badge-red">{ev.bookedSeats}</span>
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                          {formatCurrency(ev.revenue || 0)}
                        </td>
                        <td>
                          <span className="badge badge-purple">{ev.checkedInBookings || 0}</span>
                        </td>
                        <td style={{ fontWeight: 800 }}>{ev.bookingPercentage}%</td>
                        <td>
                          <Link
                            to={`/organizer/events/${ev.eventId}/bookings`}
                            className="btn btn-secondary btn-sm"
                          >
                            Manifest & Map
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </WorkspaceLayout>
  );
}
