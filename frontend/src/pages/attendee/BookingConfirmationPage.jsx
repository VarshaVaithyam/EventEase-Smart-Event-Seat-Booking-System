import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2,
  QrCode,
  Calendar,
  MapPin,
  User,
  Ticket,
  CalendarPlus,
  Copy
} from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';
import {
  formatDateTime,
  formatCurrency,
  buildIcsCalendarFile,
  downloadTextFile
} from '../../utils/formatters';

export default function BookingConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const toast = useToast();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [error, setError] = useState('');

  useEffect(() => {
    if (booking) return;
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load booking confirmation')))
      .finally(() => setLoading(false));
  }, [id, booking]);

  const handleCopyRef = async () => {
    if (!booking) return;
    try {
      await navigator.clipboard.writeText(booking.bookingReference);
      toast.success(`Copied booking reference ${booking.bookingReference}`);
    } catch {
      toast.info(booking.bookingReference);
    }
  };

  const handleDownloadIcs = () => {
    if (!booking) return;
    const ics = buildIcsCalendarFile(
      {
        id: booking.eventId,
        name: booking.eventName,
        venue: booking.venue,
        eventDate: booking.eventDate
      },
      booking.seats || [],
      booking.bookingReference
    );
    downloadTextFile(`EventEase-${booking.bookingReference}.ics`, ics, 'text/calendar;charset=utf-8');
    toast.success('Added reservation invite (.ics) to downloads!');
  };

  return (
    <WorkspaceLayout>
      {loading ? (
        <div className="empty-state">Loading booking confirmation...</div>
      ) : error || !booking ? (
        <div className="card empty-state" style={{ color: 'var(--danger)' }}>
          {error || 'Booking not found'}
        </div>
      ) : (
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div
            className="card"
            style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              padding: '2.25rem 2rem',
              background:
                'radial-gradient(circle at top, rgba(34, 197, 94, 0.12), transparent 60%), var(--bg-surface)'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '999px',
                background: 'rgba(22, 163, 74, 0.15)',
                color: 'var(--success)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.95rem'
              }}
            >
              <CheckCircle2 size={34} />
            </div>
            <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.85rem', fontWeight: 800 }}>
              Booking Confirmed!
            </h1>
            <p style={{ margin: '0 0 1.15rem', color: 'var(--text-secondary)' }}>
              Your seats are reserved and your digital QR ticket is ready.
            </p>
            <button
              type="button"
              onClick={handleCopyRef}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.1rem',
                borderRadius: '10px',
                border: '1px solid rgba(79, 70, 229, 0.3)',
                background: 'var(--brand-soft)',
                color: 'var(--brand-primary)',
                fontWeight: 800,
                fontSize: '1.05rem',
                letterSpacing: '0.04em',
                cursor: 'pointer'
              }}
              title="Click to copy reference"
            >
              <span>{booking.bookingReference}</span>
              <Copy size={15} />
            </button>
          </div>

          <div className="card">
            <h2 style={{ margin: '0 0 1.2rem', fontSize: '1.18rem', fontWeight: 800 }}>
              Reservation Receipt
            </h2>

            <div className="form-grid" style={{ gap: '1.05rem', marginBottom: '1.25rem' }}>
              <div>
                <div className="form-hint">EVENT NAME</div>
                <div style={{ fontWeight: 700, fontSize: '1.02rem' }}>{booking.eventName}</div>
              </div>
              <div>
                <div className="form-hint">BOOKING STATUS</div>
                <span className="badge badge-green">{booking.status}</span>
              </div>
              <div>
                <div className="form-hint">EVENT DATE & TIME</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                  <Calendar size={15} color="var(--brand-primary)" /> {formatDateTime(booking.eventDate)}
                </div>
              </div>
              <div>
                <div className="form-hint">VENUE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                  <MapPin size={15} color="var(--brand-primary)" /> {booking.venue}
                </div>
              </div>
              <div>
                <div className="form-hint">ATTENDEE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                  <User size={15} color="var(--brand-primary)" /> {booking.attendeeName} ({booking.attendeeEmail})
                </div>
              </div>
              <div>
                <div className="form-hint">TOTAL AMOUNT PAID</div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--brand-primary)' }}>
                  {formatCurrency(booking.totalAmount)}
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div className="form-hint" style={{ marginBottom: '0.5rem' }}>
                CONFIRMED AUDITORIUM SEATS ({booking.seats?.length || 0})
              </div>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {booking.seats?.map((code) => (
                  <span key={code} className="badge badge-blue" style={{ fontSize: '0.85rem' }}>
                    <Ticket size={13} /> Seat {code}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.2rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '0.7rem',
                flexWrap: 'wrap'
              }}
            >
              <Link to={`/attendee/bookings/${booking.id}`} className="btn btn-primary">
                <QrCode size={16} /> Open Signed QR Boarding Pass
              </Link>
              <button type="button" className="btn btn-secondary" onClick={handleDownloadIcs}>
                <CalendarPlus size={16} /> Add to Calendar (.ics)
              </button>
              <Link to="/attendee/bookings" className="btn btn-secondary">
                My Bookings
              </Link>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
