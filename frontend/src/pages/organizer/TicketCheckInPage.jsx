import React, { useEffect, useState } from 'react';
import {
  QrCode,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  UserCheck
} from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

export default function TicketCheckInPage() {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [markCheckedIn, setMarkCheckedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadBookings = () => {
    setLoadingList(true);
    api
      .get('/organizer/bookings')
      .then((res) => setRecentBookings(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleVerify = async (e, overrideCode) => {
    if (e) e.preventDefault();
    const targetCode = (overrideCode ?? code).trim();
    if (!targetCode) {
      toast.error('Enter a Booking Reference or paste a Signed QR Payload.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/organizer/tickets/verify', {
        code: targetCode,
        markCheckedIn
      });
      setResult(data);
      if (data.valid && !data.alreadyCheckedIn) {
        toast.success(data.message);
      } else if (data.alreadyCheckedIn) {
        toast.info(data.message);
      } else {
        toast.error(data.message);
      }
      loadBookings();
    } catch (err) {
      setResult(null);
      toast.error(extractErrorMessage(err, 'Ticket verification failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const checkedInCount = recentBookings.filter((b) => b.checkedInAt).length;
  const confirmedCount = recentBookings.filter((b) => b.status === 'CONFIRMED').length;

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gate Check-In & Ticket Scanner</h1>
          <p className="page-subtitle">
            Scan QR codes or enter booking references at the venue entrance to check in guests.
          </p>
        </div>

        <div className="badge badge-green" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}>
          <UserCheck size={14} /> {checkedInCount} / {confirmedCount} Passes Checked In
        </div>
      </div>

      <div className="seat-workspace" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)' }}>
        <div className="card">
          <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem', fontWeight: 800 }}>
            Scan or Enter Ticket Token
          </h2>
          <p className="form-hint" style={{ margin: '0 0 1.15rem' }}>
            Paste a full signed QR payload (<code>EVENTEASE-TICKET|REF:...|SIG:...</code>) or type
            any booking reference (<code>EVE-XXXXXXXX</code>).
          </p>

          <form onSubmit={(e) => handleVerify(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="qr-input" className="form-label">
                QR Payload or Booking Reference
              </label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  id="qr-input"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.4rem', fontFamily: 'monospace' }}
                  placeholder="EVE-XXXXXXXX or EVENTEASE-TICKET|REF:..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={markCheckedIn}
                onChange={(e) => setMarkCheckedIn(e.target.checked)}
              />
              <span>Mark attendee as Checked-In immediately upon valid verification</span>
            </label>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                <QrCode size={17} />
                {submitting ? 'Verifying Signature...' : 'Verify & Admit Attendee'}
              </button>
              {code && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setCode('');
                    setResult(null);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Verification Result Banner */}
          {result && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: '14px',
                border: `1.5px solid ${
                  !result.valid
                    ? '#ef4444'
                    : result.alreadyCheckedIn
                    ? '#f97316'
                    : '#22c55e'
                }`,
                background: !result.valid
                  ? 'rgba(239, 68, 68, 0.08)'
                  : result.alreadyCheckedIn
                  ? 'rgba(249, 115, 22, 0.09)'
                  : 'rgba(34, 197, 94, 0.09)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                {!result.valid ? (
                  <ShieldAlert size={24} color="#dc2626" />
                ) : result.alreadyCheckedIn ? (
                  <AlertTriangle size={24} color="#ea580c" />
                ) : (
                  <CheckCircle2 size={24} color="#16a34a" />
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{result.outcome}</div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                    {result.message}
                  </div>
                </div>
              </div>

              <div
                className="form-grid"
                style={{
                  marginTop: '0.9rem',
                  paddingTop: '0.9rem',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <span className="form-hint">ATTENDEE</span>
                  <div style={{ fontWeight: 700 }}>{result.attendeeName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {result.attendeeEmail}
                  </div>
                </div>
                <div>
                  <span className="form-hint">ASSIGNED SEATS</span>
                  <div style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                    {result.seats?.join(', ')}
                  </div>
                </div>
                <div>
                  <span className="form-hint">EVENT</span>
                  <div style={{ fontWeight: 600 }}>{result.eventName}</div>
                </div>
                <div>
                  <span className="form-hint">SIGNATURE CHECK</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                    <ShieldCheck size={14} color={result.signatureVerified ? '#16a34a' : '#64748b'} />
                    {result.signatureVerified ? 'QR Verified' : 'Reference Lookup'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick One-Click Test List from Live Bookings */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.15rem 1.35rem', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>
              Live Event Passes (Quick Scan Queue)
            </h2>
            <p className="form-hint" style={{ margin: '0.2rem 0 0' }}>
              Click any confirmed booking below to simulate a live gate scan.
            </p>
          </div>

          <div style={{ maxHeight: '460px', overflowY: 'auto' }}>
            {loadingList ? (
              <div className="empty-state">Loading live passes...</div>
            ) : recentBookings.length === 0 ? (
              <div className="empty-state">No bookings found across your events.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref & Attendee</th>
                    <th>Seats</th>
                    <th>Gate</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.slice(0, 20).map((bk) => (
                    <tr key={bk.id}>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>
                          {bk.bookingReference}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {bk.attendeeName} • {formatCurrency(bk.totalAmount)}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{bk.seats?.join(', ')}</td>
                      <td>
                        {bk.status !== 'CONFIRMED' ? (
                          <span className="badge badge-red">VOID</span>
                        ) : bk.checkedInAt ? (
                          <span className="badge badge-purple" title={formatDateTime(bk.checkedInAt)}>
                            Admitted
                          </span>
                        ) : (
                          <span className="badge badge-green">Ready</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setCode(bk.bookingReference);
                            handleVerify(null, bk.bookingReference);
                          }}
                        >
                          Scan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
