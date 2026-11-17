import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles,
  Trash2,
  Lock
} from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import SeatGrid from '../../components/SeatGrid';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';
import {
  formatDateTime,
  formatCurrency,
  formatCountdown,
  findBestAvailableSeats
} from '../../utils/formatters';

export default function SeatSelectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [seatMap, setSeatMap] = useState(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [activeHold, setActiveHold] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [highlightStatus, setHighlightStatus] = useState('ALL');

  const fetchSeatMap = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const { data } = await api.get(`/events/${id}/seats`);
        setSeatMap(data);
        setError('');

        if (data.activeUserHold) {
          setActiveHold(data.activeUserHold);
          const secsLeft = Math.max(
            0,
            Math.floor((new Date(data.activeUserHold.expiresAt).getTime() - Date.now()) / 1000)
          );
          setRemainingSeconds(secsLeft);
          setSelectedSeatIds([]);
        } else {
          setActiveHold(null);
          setRemainingSeconds(0);
          const availableSet = new Set(
            data.seats.filter((s) => s.status === 'AVAILABLE').map((s) => s.id)
          );
          setSelectedSeatIds((prev) => prev.filter((sid) => availableSet.has(sid)));
        }
      } catch (err) {
        if (!silent) {
          setError(extractErrorMessage(err, 'Failed to load auditorium seat map'));
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchSeatMap(false);
    const pollInterval = setInterval(() => {
      fetchSeatMap(true);
    }, 4000);
    return () => clearInterval(pollInterval);
  }, [fetchSeatMap]);

  useEffect(() => {
    if (!activeHold) return;
    const timer = setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((new Date(activeHold.expiresAt).getTime() - Date.now()) / 1000)
      );
      setRemainingSeconds(diff);
      if (diff <= 0) {
        clearInterval(timer);
        toast.info('Your temporary seat hold has expired and the seats were released.');
        setActiveHold(null);
        fetchSeatMap(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeHold, fetchSeatMap, toast]);

  const handleToggleSeat = (seat) => {
    if (activeHold) return;
    if (seat.status !== 'AVAILABLE') return;

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((sid) => sid !== seat.id);
      }
      const maxAllowed = seatMap?.maxSeatsPerBooking || 4;
      if (prev.length >= maxAllowed) {
        toast.error(`Maximum ${maxAllowed} seats allowed per booking for this event.`);
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  const handleSmartPick = (count) => {
    if (!seatMap || activeHold) return;
    const maxAllowed = seatMap.maxSeatsPerBooking || 4;
    const desired = Math.min(count, maxAllowed);
    const ids = findBestAvailableSeats(seatMap.seats, desired);
    if (ids.length === 0) {
      toast.error('No available seats left on this auditorium map.');
      return;
    }
    setSelectedSeatIds(ids);
    const mapById = new Map(seatMap.seats.map((s) => [s.id, s.seatCode]));
    const codes = ids.map((sid) => mapById.get(sid)).filter(Boolean);
    toast.info(`Smart Finder selected best seats together: ${codes.join(', ')}`);
  };

  const selectedSeats = useMemo(() => {
    if (!seatMap) return [];
    const mapById = new Map(seatMap.seats.map((s) => [s.id, s]));
    return selectedSeatIds.map((sid) => mapById.get(sid)).filter(Boolean);
  }, [seatMap, selectedSeatIds]);

  const handleCreateHold = async () => {
    if (selectedSeatIds.length === 0) return;
    setActionLoading(true);
    try {
      const { data } = await api.post('/holds', {
        eventId: Number(id),
        seatIds: selectedSeatIds
      });
      setActiveHold(data);
      setRemainingSeconds(data.remainingSeconds);
      setSelectedSeatIds([]);
      toast.success(
        `Seats ${data.seatCodes.join(', ')} locked! Confirm within ${
          seatMap.holdDurationMinutes
        } minutes.`
      );
      await fetchSeatMap(true);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not hold selected seats'));
      await fetchSeatMap(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseHold = async () => {
    if (!activeHold) return;
    setActionLoading(true);
    try {
      await api.delete(`/holds/${activeHold.holdId}`);
      toast.info('Temporary seat hold released.');
      setActiveHold(null);
      setRemainingSeconds(0);
      await fetchSeatMap(true);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to release hold'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!activeHold) return;
    setActionLoading(true);
    try {
      const { data } = await api.post('/bookings/confirm', {
        holdId: activeHold.holdId
      });
      toast.success(`Booking confirmed! Reference: ${data.bookingReference}`);
      navigate(`/attendee/bookings/${data.id}/confirmation`, { state: { booking: data } });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Booking confirmation failed'));
      await fetchSeatMap(true);
    } finally {
      setActionLoading(false);
    }
  };

  const totalHoldSeconds = (seatMap?.holdDurationMinutes || 5) * 60;
  const holdProgressPct = Math.min(100, Math.max(0, (remainingSeconds / totalHoldSeconds) * 100));

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <div style={{ marginBottom: '0.45rem' }}>
            <Link to={`/events/${id}`} className="btn btn-secondary btn-sm">
              <ArrowLeft size={14} /> Event Overview
            </Link>
          </div>
          <h1 className="page-title">{seatMap ? seatMap.eventName : 'Interactive Seat Selection'}</h1>
          {seatMap && (
            <p className="page-subtitle">
              {seatMap.venue} • {formatDateTime(seatMap.eventDate)}
            </p>
          )}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => fetchSeatMap(true)}
          title="Refresh live seat availability"
        >
          <RefreshCw size={15} /> Sync Live Map
        </button>
      </div>

      {/* 3-Step Visual Booking Progress Stepper */}
      <div className="booking-stepper">
        <div className={`step-pill ${!activeHold ? 'active' : 'done'}`}>
          <span className="step-num">1</span>
          <span>Select Seats (Up to {seatMap?.maxSeatsPerBooking || 4})</span>
        </div>
        <div className={`step-pill ${activeHold ? 'active' : ''}`}>
          <span className="step-num">2</span>
          <span>Hold Seats ({seatMap?.holdDurationMinutes || 5}m)</span>
        </div>
        <div className="step-pill">
          <span className="step-num">3</span>
          <span>Confirm & Get QR Ticket</span>
        </div>
      </div>

      {loading ? (
        <div className="card empty-state">Loading live auditorium seat layout...</div>
      ) : error || !seatMap ? (
        <div className="card empty-state" style={{ color: 'var(--danger)' }}>
          {error || 'Seat map unavailable'}
        </div>
      ) : (
        <div className="seat-workspace">
          <div className="card">
            {/* Smart Best-Seats-Together Toolbar */}
            <div className="seat-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--brand-primary)',
                    marginRight: '0.2rem'
                  }}
                >
                  <Sparkles size={14} /> Best Together:
                </span>
                {[1, 2, 3, 4]
                  .filter((n) => n <= (seatMap.maxSeatsPerBooking || 4))
                  .map((count) => (
                    <button
                      key={count}
                      type="button"
                      className="btn btn-ai btn-sm"
                      disabled={Boolean(activeHold) || seatMap.availableSeats === 0}
                      onClick={() => handleSmartPick(count)}
                    >
                      {count} {count === 1 ? 'Seat' : 'Seats'}
                    </button>
                  ))}

                {selectedSeatIds.length > 0 && !activeHold && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedSeatIds([])}
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'AVAILABLE', label: `${seatMap.availableSeats} Open` },
                  { key: 'HELD', label: `${seatMap.heldSeats} Held` },
                  { key: 'BOOKED', label: `${seatMap.bookedSeats} Booked` }
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`filter-chip ${highlightStatus === f.key ? 'active' : ''}`}
                    style={{ padding: '0.28rem 0.65rem', fontSize: '0.75rem' }}
                    onClick={() => setHighlightStatus(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <SeatGrid
              seats={seatMap.seats}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={handleToggleSeat}
              interactive={true}
              hasActiveHold={Boolean(activeHold)}
              highlightStatus={highlightStatus}
            />
          </div>

          <div className="card" style={{ position: 'sticky', top: '4.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Reservation Summary</h2>
            </div>

            {activeHold ? (
              <div>
                <div className="countdown-box" role="timer" aria-live="polite">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#ea580c',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} /> Seat Hold Active
                    </span>
                    <span>Hold #{activeHold.holdId}</span>
                  </div>

                  <div className="countdown-timer" data-testid="hold-countdown">
                    {formatCountdown(remainingSeconds)}
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '999px',
                      background: 'rgba(234, 88, 12, 0.2)',
                      overflow: 'hidden',
                      margin: '0.45rem 0 0.5rem'
                    }}
                  >
                    <div
                      style={{
                        width: `${holdProgressPct}%`,
                        height: '100%',
                        background: '#ea580c',
                        transition: 'width 1s linear'
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Reserved exclusively for you until the timer expires.
                  </div>
                </div>

                <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <div className="form-hint">LOCKED SEATS ({activeHold.seatCodes.length})</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                    {activeHold.seatCodes.map((code) => (
                      <span key={code} className="badge badge-blue" style={{ fontSize: '0.84rem' }}>
                        <Lock size={12} /> {code}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.9rem 0',
                    borderTop: '1px solid var(--border-color)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.15rem'
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Payable</span>
                  <span style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--brand-primary)' }}>
                    {formatCurrency(activeHold.totalAmount)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={handleConfirmBooking}
                    disabled={actionLoading || remainingSeconds <= 0}
                  >
                    <CheckCircle2 size={17} />
                    {actionLoading ? 'Confirming Booking...' : 'Confirm Booking & Issue QR Pass'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleReleaseHold}
                    disabled={actionLoading}
                  >
                    <XCircle size={16} /> Release Held Seats
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.7rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Selected Count</span>
                  <span style={{ fontWeight: 800 }} data-testid="selected-count">
                    {selectedSeats.length} / {seatMap.maxSeatsPerBooking}
                  </span>
                </div>

                <div style={{ marginBottom: '1.1rem' }}>
                  <div className="form-hint" style={{ marginBottom: '0.4rem' }}>
                    SELECTED SEAT IDENTIFIERS
                  </div>
                  {selectedSeats.length === 0 ? (
                    <div
                      style={{
                        padding: '0.95rem',
                        background: 'var(--bg-subtle)',
                        border: '1px dashed var(--border-strong)',
                        borderRadius: '10px',
                        fontSize: '0.84rem',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      Click any green seat on the auditorium map or use{' '}
                      <strong>Best Together</strong> above to auto-pick adjacent seats.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }} data-testid="selected-codes">
                      {selectedSeats.map((s) => (
                        <span key={s.id} className="badge badge-blue" style={{ fontSize: '0.82rem' }}>
                          Row {s.rowLabel} • {s.seatCode}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: '0.9rem 0',
                    borderTop: '1px solid var(--border-color)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.1rem'
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Estimated Total
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatCurrency(seatMap.ticketPrice)} × {selectedSeats.length} seat(s)
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                    {formatCurrency((seatMap.ticketPrice || 0) * selectedSeats.length)}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={selectedSeats.length === 0 || actionLoading}
                  onClick={handleCreateHold}
                >
                  <ShieldCheck size={17} />
                  {actionLoading
                    ? 'Reserving Seats...'
                    : `Hold Seat${selectedSeats.length > 1 ? 's' : ''} (${seatMap.holdDurationMinutes} Mins)`}
                </button>

                <p style={{ margin: '0.85rem 0 0', fontSize: '0.77rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Holds your selected seats exclusively for {seatMap.holdDurationMinutes} minutes while you review and confirm your booking.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
