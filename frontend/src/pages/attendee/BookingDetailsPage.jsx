import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  ArrowLeft,
  XCircle,
  ShieldCheck,
  Printer,
  Copy,
  CalendarPlus,
  CheckCircle2
} from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';
import {
  formatDateTime,
  formatCurrency,
  buildIcsCalendarFile,
  downloadTextFile
} from '../../utils/formatters';

export default function BookingDetailsPage() {
  const { id } = useParams();
  const { isAttendee } = useAuth();
  const toast = useToast();

  const [booking, setBooking] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/bookings/${id}`);
      setBooking(data);
      if (data.status === 'CONFIRMED') {
        const ticketRes = await api.get(`/bookings/${id}/ticket`);
        setTicket(ticketRes.data);
      } else {
        setTicket(null);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load booking details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDownloadTicket = () => {
    if (!ticket) return;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Boarding Pass ${ticket.bookingReference} - ${ticket.eventName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #0b1120; padding: 48px 24px; color: #0f172a; }
    .pass { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 20px; display: flex; overflow: hidden; box-shadow: 0 24px 50px rgba(0,0,0,0.4); }
    .left { flex: 1; padding: 32px; border-right: 2px dashed #cbd5e1; border-top: 8px solid #4f46e5; }
    .right { width: 260px; padding: 28px; background: #f8fafc; border-top: 8px solid #0ea5e9; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ref { display: inline-block; background: #eef2ff; color: #4f46e5; font-weight: 800; padding: 6px 12px; border-radius: 999px; font-size: 13px; margin-bottom: 14px; }
    .meta { margin: 8px 0; font-size: 14px; color: #475569; }
    .seats { margin: 16px 0; font-weight: 800; font-size: 18px; color: #0f172a; }
    .sig { font-size: 11px; color: #64748b; margin-top: 10px; font-family: monospace; word-break: break-all; }
  </style>
</head>
<body>
  <div class="pass">
    <div class="left">
      <div class="ref">${ticket.bookingReference} • CONFIRMED BOARDING PASS</div>
      <h2 style="margin: 0 0 12px; font-size: 24px;">${ticket.eventName}</h2>
      <div class="meta"><strong>Venue:</strong> ${ticket.venue}</div>
      <div class="meta"><strong>Date & Time:</strong> ${formatDateTime(ticket.eventDate)}</div>
      <div class="meta"><strong>Attendee:</strong> ${ticket.attendeeName} (${ticket.attendeeEmail})</div>
      <div class="seats">Auditorium Seats: ${ticket.seats.join(', ')}</div>
      <div class="meta"><strong>Total Paid:</strong> ${formatCurrency(ticket.totalAmount)}</div>
      <div class="sig">Verification Code: ${ticket.verificationHash}</div>
    </div>
    <div class="right">
      <img src="${ticket.qrCodeDataUri}" alt="Ticket QR Code" width="185" height="185" />
      <div class="sig">Present at Gate Scanner<br/>${ticket.bookingReference}</div>
    </div>
  </div>
</body>
</html>`;

    downloadTextFile(`EventEase-Pass-${ticket.bookingReference}.html`, html, 'text/html;charset=utf-8');
    toast.success(`Downloaded digital pass EventEase-Pass-${ticket.bookingReference}.html`);
  };

  const handleCopyQrPayload = async () => {
    if (!ticket?.qrPayload) return;
    try {
      await navigator.clipboard.writeText(ticket.qrPayload);
      toast.success('Copied signed QR payload! Paste into Organizer Gate Scanner to test verification.');
    } catch {
      toast.info(ticket.qrPayload);
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
    toast.success('Downloaded .ics calendar file!');
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/bookings/${id}/cancel`);
      toast.success('Booking cancelled and seats returned to available pool.');
      setShowCancelModal(false);
      await loadData();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Cancellation failed'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <Link
            to={isAttendee ? '/attendee/bookings' : '/organizer/dashboard'}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <h1 className="page-title">Digital Ticket & Receipt</h1>
          <p className="page-subtitle">
            Present this QR pass at the venue entrance for quick check-in.
          </p>
        </div>

        {booking && booking.status === 'CONFIRMED' && (
          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
            {ticket && (
              <>
                <button type="button" className="btn btn-primary" onClick={handleDownloadTicket}>
                  <Download size={16} /> Download Pass
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleDownloadIcs}>
                  <CalendarPlus size={16} /> .ICS
                </button>
              </>
            )}
            {isAttendee && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setShowCancelModal(true)}
              >
                <XCircle size={16} /> Cancel Booking
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-state">Loading booking & cryptographic ticket signature...</div>
      ) : error || !booking ? (
        <div className="card empty-state" style={{ color: 'var(--danger)' }}>
          {error || 'Booking not found'}
        </div>
      ) : (
        <div className="ticket-card">
          <div className="ticket-top-accent" />
          <div className="ticket-main">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <span className="badge badge-blue" style={{ fontSize: '0.82rem' }}>
                REF • {booking.bookingReference}
              </span>
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                {booking.checkedInAt && (
                  <span className="badge badge-purple">
                    <CheckCircle2 size={12} /> Checked In at Gate
                  </span>
                )}
                <span
                  className={`badge ${booking.status === 'CONFIRMED' ? 'badge-green' : 'badge-red'}`}
                >
                  {booking.status}
                </span>
              </div>
            </div>

            <h2 style={{ margin: '0 0 0.45rem', fontSize: '1.55rem', fontWeight: 800 }}>
              {booking.eventName}
            </h2>
            <p style={{ margin: '0 0 1.35rem', color: 'var(--text-secondary)', fontSize: '0.93rem' }}>
              {booking.venue} • {formatDateTime(booking.eventDate)}
            </p>

            <div className="form-grid" style={{ gap: '1rem', marginBottom: '1.35rem' }}>
              <div>
                <div className="form-hint">ATTENDEE HOLDER</div>
                <div style={{ fontWeight: 700 }}>{booking.attendeeName}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {booking.attendeeEmail}
                </div>
              </div>
              <div>
                <div className="form-hint">ISSUED TIMESTAMP</div>
                <div style={{ fontWeight: 700 }}>{formatDateTime(booking.createdAt)}</div>
                {booking.checkedInAt && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
                    Gate Scan: {formatDateTime(booking.checkedInAt)}
                  </div>
                )}
                {booking.cancelledAt && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                    Cancelled: {formatDateTime(booking.cancelledAt)}
                  </div>
                )}
              </div>
              <div>
                <div className="form-hint">ASSIGNED AUDITORIUM SEATS</div>
                <div style={{ display: 'flex', gap: '0.38rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {booking.seats?.map((s) => (
                    <span key={s} className="badge badge-blue" style={{ fontSize: '0.84rem' }}>
                      Seat {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="form-hint">AMOUNT PAID</div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--brand-primary)' }}>
                  {formatCurrency(booking.totalAmount)}
                </div>
              </div>
            </div>

            {ticket && (
              <div
                style={{
                  paddingTop: '0.95rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={15} color="var(--success)" />
                  Verification Code: <code>{ticket.verificationHash}</code>
                </span>
                {ticket.qrPayload && (
                  <button
                    type="button"
                    className="btn btn-ai btn-sm"
                    onClick={handleCopyQrPayload}
                    title="Copy QR ticket code for check-in"
                  >
                    <Copy size={13} /> Copy Check-In Code
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="ticket-qr-panel">
            {ticket ? (
              <>
                <div
                  style={{
                    padding: '0.65rem',
                    borderRadius: '14px',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <img
                    src={ticket.qrCodeDataUri}
                    alt={`QR Code for ${ticket.bookingReference}`}
                    width={185}
                    height={185}
                    style={{ display: 'block', borderRadius: '6px' }}
                  />
                </div>
                <div style={{ marginTop: '0.75rem', fontWeight: 800, fontSize: '0.92rem' }}>
                  {ticket.bookingReference}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Scan at Venue Gate Check-In
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--danger)', fontSize: '0.88rem', fontWeight: 700 }}>
                Booking Cancelled — QR Pass Voided & Seats Released
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={showCancelModal}
        title="Cancel This Booking?"
        description="Your seats will be immediately released back to AVAILABLE and this signed QR boarding pass will be permanently voided."
        confirmLabel="Confirm Cancellation"
        danger={true}
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </WorkspaceLayout>
  );
}
