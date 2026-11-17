import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, XCircle, Eye } from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

export default function MyBookingsPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBookings = () => {
    setLoading(true);
    api
      .get('/bookings/my')
      .then((res) => setBookings(res.data))
      .catch((err) => toast.error(extractErrorMessage(err, 'Failed to load bookings')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.post(`/bookings/${cancelTarget.id}/cancel`);
      toast.success(
        `Booking ${cancelTarget.bookingReference} cancelled. Seats (${cancelTarget.seats.join(
          ', '
        )}) are now available again.`
      );
      setCancelTarget(null);
      loadBookings();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to cancel booking'));
    } finally {
      setCancelling(false);
    }
  };

  const filtered = bookings.filter((b) => (filter === 'ALL' ? true : b.status === filter));

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Bookings</h1>
          <p className="page-subtitle">
            View booking history, download QR tickets, or cancel reservations to release seats.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.45rem' }}>
          {['ALL', 'CONFIRMED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`btn btn-sm ${filter === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">Loading your bookings...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3 style={{ margin: '0 0 0.4rem' }}>No bookings found</h3>
            <p style={{ margin: '0 0 1rem' }}>
              Reserve seats on any upcoming event to see your bookings here.
            </p>
            <Link to="/events" className="btn btn-primary btn-sm">
              Browse Upcoming Events
            </Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Reference</th>
                  <th>Event</th>
                  <th>Event Date</th>
                  <th>Booked Seats</th>
                  <th>Booked On</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bk) => (
                  <tr key={bk.id}>
                    <td style={{ fontWeight: 700 }}>{bk.bookingReference}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{bk.eventName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{bk.venue}</div>
                    </td>
                    <td>{formatDateTime(bk.eventDate)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {bk.seats?.map((s) => (
                          <span key={s} className="badge badge-blue">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{formatDateTime(bk.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(bk.totalAmount)}</td>
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
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Link
                          to={`/attendee/bookings/${bk.id}`}
                          className="btn btn-secondary btn-sm"
                          title="View Details & QR Ticket"
                        >
                          {bk.status === 'CONFIRMED' ? <QrCode size={14} /> : <Eye size={14} />}
                          {bk.status === 'CONFIRMED' ? 'Ticket' : 'Details'}
                        </Link>
                        {bk.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setCancelTarget(bk)}
                          >
                            <XCircle size={14} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title="Cancel Confirmed Booking?"
        description={
          cancelTarget
            ? `Cancelling booking ${cancelTarget.bookingReference} for "${
                cancelTarget.eventName
              }" will immediately release seat(s) ${cancelTarget.seats.join(
                ', '
              )} back to AVAILABLE while preserving your booking history.`
            : ''
        }
        confirmLabel="Yes, Cancel Booking"
        danger={true}
        loading={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </WorkspaceLayout>
  );
}
