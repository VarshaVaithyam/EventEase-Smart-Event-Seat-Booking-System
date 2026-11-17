import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download, Search, QrCode, CheckCircle2 } from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import SeatGrid from '../../components/SeatGrid';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';
import { formatDateTime, formatCurrency, downloadTextFile } from '../../utils/formatters';

export default function EventBookingDetailsPage() {
  const { id } = useParams();
  const toast = useToast();
  const [seatMap, setSeatMap] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [checkingInId, setCheckingInId] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [mapRes, bkRes] = await Promise.all([
        api.get(`/events/${id}/seats`),
        api.get(`/organizer/events/${id}/bookings`)
      ]);
      setSeatMap(mapRes.data);
      setBookings(bkRes.data);
      setError('');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load event booking details'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 5000);
    return () => clearInterval(timer);
  }, [loadAll]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        b.bookingReference.toLowerCase().includes(q) ||
        b.attendeeName.toLowerCase().includes(q) ||
        b.attendeeEmail.toLowerCase().includes(q) ||
        (b.seats || []).join(',').toLowerCase().includes(q)
    );
  }, [bookings, search]);

  const handleQuickCheckIn = async (bk) => {
    setCheckingInId(bk.id);
    try {
      const { data } = await api.post('/organizer/tickets/verify', {
        code: bk.bookingReference,
        markCheckedIn: true
      });
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      await loadAll();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Check-in failed'));
    } finally {
      setCheckingInId(null);
    }
  };

  const handleExportManifest = () => {
    if (!bookings.length) return;
    const headers = [
      'Booking Reference',
      'Attendee Name',
      'Attendee Email',
      'Seats',
      'Amount (INR)',
      'Status',
      'Checked In At',
      'Booked At'
    ];
    const rows = bookings.map((bk) => [
      bk.bookingReference,
      `"${(bk.attendeeName || '').replace(/"/g, '""')}"`,
      bk.attendeeEmail,
      `"${(bk.seats || []).join(', ')}"`,
      bk.totalAmount || 0,
      bk.status,
      bk.checkedInAt || '',
      bk.createdAt || ''
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadTextFile(`EventEase-Manifest-Event-${id}.csv`, csv, 'text/csv;charset=utf-8');
    toast.success('Downloaded attendee manifest CSV!');
  };

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <Link
            to="/organizer/events"
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '0.45rem' }}
          >
            <ArrowLeft size={14} /> Manage Events
          </Link>
          <h1 className="page-title">{seatMap ? seatMap.eventName : 'Event Booking Details'}</h1>
          {seatMap && (
            <p className="page-subtitle">
              {seatMap.venue} • {formatDateTime(seatMap.eventDate)}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <Link to="/organizer/check-in" className="btn btn-ai btn-sm">
            <QrCode size={15} /> Gate QR Scanner
          </Link>
          {bookings.length > 0 && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportManifest}>
              <Download size={15} /> Export Manifest CSV
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadAll}>
            <RefreshCw size={15} /> Refresh Live
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading live seat status & attendee bookings...</div>
      ) : error || !seatMap ? (
        <div className="card empty-state" style={{ color: 'var(--danger)' }}>
          {error || 'Event not found'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Total Capacity</div>
                <div className="kpi-value">{seatMap.totalSeats}</div>
                <div className="kpi-meta">
                  {seatMap.totalRows} rows × {seatMap.seatsPerRow} seats
                </div>
              </div>
            </div>
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Available Seats</div>
                <div className="kpi-value" style={{ color: 'var(--success)' }}>
                  {seatMap.availableSeats}
                </div>
                <div className="kpi-meta">Open for booking</div>
              </div>
            </div>
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Currently Held</div>
                <div className="kpi-value" style={{ color: 'var(--warning)' }}>
                  {seatMap.heldSeats}
                </div>
                <div className="kpi-meta">Active countdown locks</div>
              </div>
            </div>
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Confirmed Seats</div>
                <div className="kpi-value" style={{ color: 'var(--danger)' }}>
                  {seatMap.bookedSeats}
                </div>
                <div className="kpi-meta">{bookings.length} total booking records</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: 800 }}>
              Live Auditorium Seat Map
            </h2>
            <SeatGrid seats={seatMap.seats} interactive={false} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '1.2rem 1.4rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Attendee Reservations & Gate Status ({filteredBookings.length})
              </h2>

              <div style={{ position: 'relative', minWidth: '250px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="search"
                  className="form-input"
                  style={{ paddingLeft: '2.2rem', paddingTop: '0.45rem', paddingBottom: '0.45rem' }}
                  placeholder="Filter by reference, attendee, or seat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="empty-state">No matching bookings found.</div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Attendee</th>
                      <th>Seats</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Gate Check-In</th>
                      <th>Booked At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((bk) => (
                      <tr key={bk.id}>
                        <td style={{ fontWeight: 800 }}>{bk.bookingReference}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{bk.attendeeName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {bk.attendeeEmail}
                          </div>
                        </td>
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
                          {bk.status !== 'CONFIRMED' ? (
                            <span className="badge badge-gray">Void</span>
                          ) : bk.checkedInAt ? (
                            <span className="badge badge-purple" title={formatDateTime(bk.checkedInAt)}>
                              <CheckCircle2 size={12} /> Checked In
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ai btn-sm"
                              disabled={checkingInId === bk.id}
                              onClick={() => handleQuickCheckIn(bk)}
                            >
                              {checkingInId === bk.id ? 'Checking...' : 'Check In'}
                            </button>
                          )}
                        </td>
                        <td>{formatDateTime(bk.createdAt)}</td>
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
