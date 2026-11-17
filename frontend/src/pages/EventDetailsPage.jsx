import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  User,
  Grid,
  Clock,
  ShieldCheck,
  ArrowLeft,
  CalendarPlus,
  Share2,
  ArrowRight
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import SeatGrid from '../components/SeatGrid';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { extractErrorMessage } from '../services/api';
import {
  formatDateTime,
  formatCurrency,
  buildIcsCalendarFile,
  downloadTextFile
} from '../utils/formatters';

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, isAttendee, isOrganizer, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [evRes, seatRes] = await Promise.all([
          api.get(`/events/${id}`),
          api.get(`/events/${id}/seats`)
        ]);
        if (mounted) {
          setEvent(evRes.data);
          setSeatMap(seatRes.data);
        }
      } catch (err) {
        if (mounted) setError(extractErrorMessage(err, 'Unable to load event details'));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleExportCalendar = () => {
    if (!event) return;
    const ics = buildIcsCalendarFile(event);
    downloadTextFile(`EventEase-${event.id}.ics`, ics, 'text/calendar;charset=utf-8');
    toast.success('Downloaded .ics calendar invite!');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Event link copied to clipboard!');
    } catch {
      toast.info('Share URL: ' + window.location.href);
    }
  };

  const bookedPct = event?.totalSeats ? Math.round((event.bookedSeats / event.totalSeats) * 100) : 0;
  const heldPct = event?.totalSeats ? Math.round((event.heldSeats / event.totalSeats) * 100) : 0;
  const availPct = Math.max(0, 100 - bookedPct - heldPct);

  return (
    <div>
      <PublicNavbar />
      <div className="page-container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.6rem'
          }}
        >
          <Link to="/events" className="btn btn-secondary btn-sm">
            <ArrowLeft size={15} /> Back to All Events
          </Link>

          {event && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCalendar}>
                <CalendarPlus size={14} /> Add to Calendar (.ics)
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleShare}>
                <Share2 size={14} /> Copy Link
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="card" style={{ height: '320px' }}>
            <div className="skeleton" style={{ height: '32px', width: '48%', marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: '120px', width: '100%', marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: '48px', width: '32%' }} />
          </div>
        ) : error || !event ? (
          <div className="card empty-state" style={{ color: 'var(--danger)' }}>
            {error || 'Event not found'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: '6px', background: 'var(--brand-gradient)' }} />
              <div
                style={{
                  padding: '1.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1.75rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: '1 1 560px' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="badge badge-blue">{event.category || 'Live Event'}</span>
                  </div>

                  <h1 style={{ margin: '0 0 0.75rem', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
                    {event.name}
                  </h1>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1.25rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.92rem',
                      marginBottom: '1.25rem'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Calendar size={16} color="var(--brand-primary)" /> {formatDateTime(event.eventDate)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <MapPin size={16} color="var(--brand-primary)" /> {event.venue}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <User size={16} color="var(--brand-primary)" /> Hosted by {event.organizerName}
                    </span>
                  </div>

                  <p style={{ margin: 0, whiteSpace: 'pre-line', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                    {event.description}
                  </p>
                </div>

                {/* Sticky Checkout Action Box */}
                <div
                  style={{
                    flex: '0 0 310px',
                    background: 'var(--bg-subtle)',
                    padding: '1.4rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>
                    ADMISSION PER SEAT
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.15rem 0 0.85rem', color: 'var(--text-primary)' }}>
                    {formatCurrency(event.ticketPrice)}
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        marginBottom: '0.35rem'
                      }}
                    >
                      <span style={{ color: 'var(--success)' }}>{event.availableSeats} Available</span>
                      <span style={{ color: 'var(--text-muted)' }}>{bookedPct}% Booked</span>
                    </div>
                    <div className="capacity-meter">
                      <span className="capacity-seg-booked" style={{ width: `${bookedPct}%` }} />
                      <span className="capacity-seg-held" style={{ width: `${heldPct}%` }} />
                      <span className="capacity-seg-avail" style={{ width: `${availPct}%` }} />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.48rem',
                      fontSize: '0.84rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '1.2rem'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Grid size={15} /> Layout: {event.totalRows} rows × {event.seatsPerRow} cols ({event.totalSeats} seats)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <ShieldCheck size={15} /> Max {event.maxSeatsPerBooking} seats per reservation
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Clock size={15} /> {event.holdDurationMinutes}-minute exclusive seat lock
                    </span>
                  </div>

                  {isAttendee ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%' }}
                      onClick={() => navigate(`/events/${event.id}/book`)}
                      disabled={event.availableSeats === 0}
                    >
                      {event.availableSeats === 0 ? 'Sold Out' : 'Launch Interactive Seat Map'}
                      {event.availableSeats > 0 && <ArrowRight size={17} />}
                    </button>
                  ) : isOrganizer ? (
                    user?.id === event.organizerId ? (
                      <Link
                        to={`/organizer/events/${event.id}/bookings`}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        Inspect Bookings & Manifest
                      </Link>
                    ) : (
                      <div className="badge badge-gray">Sign in as Attendee to book seats</div>
                    )
                  ) : (
                    <Link
                      to="/login"
                      state={{ from: `/events/${event.id}/book` }}
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%' }}
                    >
                      Sign In as Attendee to Book
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {seatMap && (
              <div className="card">
                <div className="page-header" style={{ marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                      Live Auditorium Seating Preview
                    </h2>
                    <p className="page-subtitle">
                      {seatMap.availableSeats} Available • {seatMap.heldSeats} Temporarily Held •{' '}
                      {seatMap.bookedSeats} Booked
                    </p>
                  </div>
                  {!isAuthenticated && (
                    <Link
                      to="/login"
                      state={{ from: `/events/${event.id}/book` }}
                      className="btn btn-primary btn-sm"
                    >
                      Sign In to Select Seats
                    </Link>
                  )}
                </div>
                <SeatGrid seats={seatMap.seats} interactive={false} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
