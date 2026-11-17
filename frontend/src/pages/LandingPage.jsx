import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Grid,
  QrCode,
  ArrowRight,
  Calendar,
  MapPin,
  Ticket,
  Armchair
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import api from '../services/api';
import { formatDateTime, formatCurrency, formatShortDate } from '../utils/formatters';

export default function LandingPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api
      .get('/events')
      .then((res) => setEvents(res.data || []))
      .catch(() => setEvents([]));
  }, []);

  const featuredEvents = events.slice(0, 3);
  const totalOpenSeats = events.reduce((sum, ev) => sum + (ev.availableSeats || 0), 0);

  const steps = [
    {
      step: '01',
      icon: Calendar,
      title: 'Browse Live Events',
      desc: 'Explore upcoming conferences, workshops, concerts, and campus events with transparent seat pricing.'
    },
    {
      step: '02',
      icon: Armchair,
      title: 'Pick Your Exact Seats',
      desc: 'Choose VIP, Premium, or Standard seats on the live auditorium map — or auto-find the best seats together.'
    },
    {
      step: '03',
      icon: QrCode,
      title: 'Get Instant QR Tickets',
      desc: 'Your selected seats are held for 5 minutes during checkout, followed by an instant downloadable QR pass.'
    }
  ];

  // Mini illustrative auditorium preview grid for hero
  const previewRows = [
    ['booked', 'booked', 'available', 'selected', 'selected', 'available', 'held', 'booked'],
    ['available', 'available', 'available', 'available', 'available', 'held', 'available', 'available'],
    ['booked', 'available', 'available', 'available', 'available', 'available', 'available', 'booked']
  ];

  return (
    <div>
      <PublicNavbar />

      {/* Hero Section */}
      <section className="hero-shell">
        <div className="hero-grid-overlay" />
        <div className="hero-inner">
          <div>
            <div className="hero-eyebrow">
              <span className="live-pulse-dot" />
              <span>Live Seat Maps • 5-Minute Seat Hold • Instant QR Tickets</span>
            </div>

            <h1 className="hero-headline">
              Reserve Your Perfect Seat,{' '}
              <span className="hero-gradient-text">Effortlessly & In Real Time.</span>
            </h1>

            <p className="hero-lead">
              Discover upcoming events, view live auditorium seating across every row, hold your
              favorite seats while you check out, and walk right in with digital QR passes.
            </p>

            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
              <Link to="/events" className="btn btn-primary btn-lg">
                Browse Events
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="btn btn-lg"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.18)'
                }}
              >
                Sign In / Host an Event
              </Link>
            </div>

            <div className="hero-metrics-strip">
              <div>
                <div className="hero-metric-val">{events.length || 3}+ Events</div>
                <div className="hero-metric-lbl">Open for Booking</div>
              </div>
              <div>
                <div className="hero-metric-val">{totalOpenSeats || 124} Seats</div>
                <div className="hero-metric-lbl">Available Right Now</div>
              </div>
              <div>
                <div className="hero-metric-val">5-Min Hold</div>
                <div className="hero-metric-lbl">Guaranteed Checkout</div>
              </div>
            </div>
          </div>

          {/* Interactive Visual Auditorium Preview Card */}
          <div className="hero-preview-card" aria-hidden="true">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.1rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em' }}>
                  STAGE VIEW
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                  Main Auditorium Map
                </div>
              </div>
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  background: 'rgba(34, 197, 94, 0.18)',
                  color: '#86efac',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                04:58 SEAT HOLD
              </span>
            </div>

            <div
              style={{
                height: '10px',
                borderRadius: '50% 50% 0 0',
                background: 'linear-gradient(90deg, transparent, #6366f1, #38bdf8, transparent)',
                marginBottom: '1.2rem'
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
              {previewRows.map((row, rIdx) => (
                <div key={rIdx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', width: 16, fontWeight: 700 }}>
                    {String.fromCharCode(65 + rIdx)}
                  </span>
                  {row.map((st, cIdx) => {
                    const colors = {
                      available: { bg: 'rgba(34,197,94,0.2)', border: '#22c55e', text: '#86efac' },
                      selected: { bg: '#3b82f6', border: '#60a5fa', text: '#ffffff' },
                      held: { bg: 'rgba(249,115,22,0.22)', border: '#f97316', text: '#fdba74' },
                      booked: { bg: 'rgba(239,68,68,0.2)', border: '#ef4444', text: '#fca5a5' }
                    }[st];
                    return (
                      <span
                        key={cIdx}
                        style={{
                          width: 34,
                          height: 30,
                          borderRadius: '7px 7px 4px 4px',
                          background: colors.bg,
                          border: `1.5px solid ${colors.border}`,
                          color: colors.text,
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {String.fromCharCode(65 + rIdx)}
                        {cIdx + 1}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: '1.3rem',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                background: 'rgba(30, 41, 59, 0.72)',
                border: '1px solid rgba(148, 163, 184, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#e2e8f0' }}>
                <Ticket size={14} color="#a78bfa" /> Selected Seats: <strong>A4, A5</strong>
              </span>
              <span style={{ color: '#86efac', fontWeight: 700 }}>Ready to Book</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Upcoming Events */}
      {featuredEvents.length > 0 && (
        <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '3.5rem 1.5rem 2.5rem' }}>
          <div className="page-header">
            <div>
              <h2 className="page-title">Featured Upcoming Events</h2>
              <p className="page-subtitle">
                Select an event to view the live auditorium map and book your seats
              </p>
            </div>
            <Link to="/events" className="btn btn-secondary">
              View All Events <ArrowRight size={15} />
            </Link>
          </div>

          <div className="events-grid">
            {featuredEvents.map((ev) => {
              const dt = formatShortDate(ev.eventDate);
              const bookedPct = ev.totalSeats ? Math.round((ev.bookedSeats / ev.totalSeats) * 100) : 0;
              const heldPct = ev.totalSeats ? Math.round((ev.heldSeats / ev.totalSeats) * 100) : 0;
              const availPct = Math.max(0, 100 - bookedPct - heldPct);

              return (
                <div key={ev.id} className="event-card">
                  <div>
                    <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', marginBottom: '0.9rem' }}>
                      <div className="event-date-pill">
                        <span className="event-date-pill-month">{dt.month}</span>
                        <span className="event-date-pill-day">{dt.day}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span className="badge badge-blue">{ev.category || 'Live Event'}</span>
                          <span style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '1.02rem' }}>
                            {formatCurrency(ev.ticketPrice)}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.3 }}>
                          {ev.name}
                        </h3>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '1rem'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Calendar size={14} /> {formatDateTime(ev.eventDate)}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <MapPin size={14} /> {ev.venue}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Grid size={14} /> {ev.totalRows} rows × {ev.seatsPerRow} seats ({ev.totalSeats} capacity)
                      </span>
                    </div>

                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          marginBottom: '0.35rem'
                        }}
                      >
                        <span>{ev.availableSeats} seats available</span>
                        <span>{bookedPct}% booked</span>
                      </div>
                      <div className="capacity-meter" title="Seat availability">
                        <span className="capacity-seg-booked" style={{ width: `${bookedPct}%` }} />
                        <span className="capacity-seg-held" style={{ width: `${heldPct}%` }} />
                        <span className="capacity-seg-avail" style={{ width: `${availPct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      paddingTop: '0.95rem',
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span className="badge badge-green">
                      {ev.availableSeats} Available
                    </span>
                    <Link to={`/events/${ev.id}`} className="btn btn-primary btn-sm">
                      Book Seats <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Simple 3-Step How It Works */}
      <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '2rem 1.5rem 4.5rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 2.2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            How EventEase Works
          </h2>
          <p style={{ margin: '0.45rem 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Book your seats in three simple steps — with zero double-booking surprises.
          </p>
        </div>

        <div className="events-grid">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="kpi-icon">
                    <Icon size={20} />
                  </div>
                  <span className="badge badge-purple">Step {s.step}</span>
                </div>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.08rem', fontWeight: 700 }}>{s.title}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.89rem', lineHeight: 1.6 }}>
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
