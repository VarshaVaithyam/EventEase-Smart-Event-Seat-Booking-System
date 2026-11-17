import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Ticket,
  CheckCircle2,
  XCircle,
  ArrowRight,
  QrCode,
  Sparkles
} from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDateTime, formatCurrency, formatShortDate } from '../../utils/formatters';

export default function AttendeeDashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/events'), api.get('/bookings/my')])
      .then(([evRes, bkRes]) => {
        setEvents(evRes.data);
        setBookings(bkRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');
  const confirmedCount = confirmedBookings.length;
  const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length;
  const totalSeatsBooked = confirmedBookings.reduce((sum, b) => sum + (b.seats?.length || 0), 0);
  const nextUpcomingBooking = confirmedBookings[0] || null;

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name}</h1>
          <p className="page-subtitle">
            Browse upcoming events, reserve seats, and view your digital QR tickets.
          </p>
        </div>
        <Link to="/events" className="btn btn-primary">
          Explore All Events
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Next Upcoming Pass Spotlight */}
      {nextUpcomingBooking && (
        <div
          className="card"
          style={{
            marginBottom: '1.75rem',
            background:
              'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(14, 165, 233, 0.08) 100%), var(--bg-surface)',
            borderColor: 'rgba(79, 70, 229, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.2rem'
          }}
        >
          <div>
            <span className="badge badge-green" style={{ marginBottom: '0.4rem' }}>
              Confirmed Ticket • {nextUpcomingBooking.bookingReference}
            </span>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 800 }}>
              {nextUpcomingBooking.eventName}
            </h2>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {nextUpcomingBooking.venue} • {formatDateTime(nextUpcomingBooking.eventDate)} • Seats:{' '}
              <strong>{nextUpcomingBooking.seats?.join(', ')}</strong>
            </div>
          </div>

          <Link to={`/attendee/bookings/${nextUpcomingBooking.id}`} className="btn btn-primary">
            <QrCode size={16} /> View QR Ticket
          </Link>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Live Events</div>
            <div className="kpi-value">{events.length}</div>
            <div className="kpi-meta">Open for seat selection</div>
          </div>
          <div className="kpi-icon">
            <Calendar size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Active Passes</div>
            <div className="kpi-value" style={{ color: 'var(--success)' }}>
              {confirmedCount}
            </div>
            <div className="kpi-meta">{totalSeatsBooked} reserved seat(s)</div>
          </div>
          <div className="kpi-icon">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Reservation History</div>
            <div className="kpi-value">{bookings.length}</div>
            <div className="kpi-meta">Total transactions</div>
          </div>
          <div className="kpi-icon">
            <Ticket size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Cancelled</div>
            <div className="kpi-value">{cancelledCount}</div>
            <div className="kpi-meta">Seats released to pool</div>
          </div>
          <div className="kpi-icon">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading your dashboard...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div className="card">
            <div className="page-header" style={{ marginBottom: '1.15rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  Available Auditoriums to Book
                </h2>
                <p className="page-subtitle">Launch the interactive seat picker with 5-minute lock</p>
              </div>
            </div>

            <div className="events-grid">
              {events.slice(0, 4).map((ev) => {
                const dt = formatShortDate(ev.eventDate);
                const bookedPct = ev.totalSeats ? Math.round((ev.bookedSeats / ev.totalSeats) * 100) : 0;
                const heldPct = ev.totalSeats ? Math.round((ev.heldSeats / ev.totalSeats) * 100) : 0;
                const availPct = Math.max(0, 100 - bookedPct - heldPct);

                return (
                  <div key={ev.id} className="event-card">
                    <div>
                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start', marginBottom: '0.7rem' }}>
                        <div className="event-date-pill">
                          <span className="event-date-pill-month">{dt.month}</span>
                          <span className="event-date-pill-day">{dt.day}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span className="badge badge-blue">{ev.category || 'Live Event'}</span>
                            <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                              {formatCurrency(ev.ticketPrice)}
                            </span>
                          </div>
                          <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>{ev.name}</h3>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                        <div>{formatDateTime(ev.eventDate)}</div>
                        <div>{ev.venue}</div>
                      </div>

                      <div className="capacity-meter">
                        <span className="capacity-seg-booked" style={{ width: `${bookedPct}%` }} />
                        <span className="capacity-seg-held" style={{ width: `${heldPct}%` }} />
                        <span className="capacity-seg-avail" style={{ width: `${availPct}%` }} />
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span className="badge badge-green">
                        {ev.availableSeats} / {ev.totalSeats} open
                      </span>
                      <Link to={`/events/${ev.id}/book`} className="btn btn-primary btn-sm">
                        Select Seats <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '1.25rem 1.4rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Recent Bookings</h2>
                <p className="page-subtitle" style={{ marginTop: '0.15rem' }}>
                  Your latest confirmed passes and cancelled reservations
                </p>
              </div>
              <Link to="/attendee/bookings" className="btn btn-secondary btn-sm">
                View Full History
              </Link>
            </div>

            {bookings.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                You haven&apos;t booked any seats yet. Select an event above to reserve seats!
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Event</th>
                      <th>Seats</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 5).map((bk) => (
                      <tr key={bk.id}>
                        <td style={{ fontWeight: 800 }}>{bk.bookingReference}</td>
                        <td style={{ fontWeight: 600 }}>{bk.eventName}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {bk.seats?.map((s) => (
                              <span key={s} className="badge badge-blue">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(bk.totalAmount)}</td>
                        <td>
                          <span
                            className={`badge ${
                              bk.status === 'CONFIRMED' ? 'badge-green' : 'badge-red'
                            }`}
                          >
                            {bk.status}
                          </span>
                        </td>
                        <td>
                          <Link to={`/attendee/bookings/${bk.id}`} className="btn btn-secondary btn-sm">
                            <QrCode size={14} /> Pass & Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
