import React, { useEffect, useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';

export default function BookingSettingsPage() {
  const toast = useToast();
  const [maxSeatsPerBooking, setMaxSeatsPerBooking] = useState(4);
  const [holdDurationMinutes, setHoldDurationMinutes] = useState(5);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        setMaxSeatsPerBooking(res.data.maxSeatsPerBooking);
        setHoldDurationMinutes(res.data.holdDurationMinutes);
        setUpdatedAt(res.data.updatedAt);
      })
      .catch((err) => toast.error(extractErrorMessage(err, 'Failed to load settings')))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/settings', {
        maxSeatsPerBooking: Number(maxSeatsPerBooking),
        holdDurationMinutes: Number(holdDurationMinutes)
      });
      setMaxSeatsPerBooking(data.maxSeatsPerBooking);
      setHoldDurationMinutes(data.holdDurationMinutes);
      setUpdatedAt(data.updatedAt);
      toast.success(
        `Settings saved! Max ${data.maxSeatsPerBooking} seats per booking, ${data.holdDurationMinutes}-minute seat hold.`
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Booking & Seat Hold Settings</h1>
          <p className="page-subtitle">
            Configure seat limits per booking and temporary hold durations for checkout.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading booking settings...</div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="set-max-seats" className="form-label">
                Maximum Seats Per Booking (Default: 4)
              </label>
              <input
                id="set-max-seats"
                type="number"
                min={1}
                max={20}
                className="form-input"
                value={maxSeatsPerBooking}
                onChange={(e) => setMaxSeatsPerBooking(e.target.value)}
                required
              />
              <span className="form-hint">
                Limits how many seats a single attendee can select in one reservation.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="set-hold-mins" className="form-label">
                Temporary Seat Hold Duration in Minutes (Default: 5)
              </label>
              <input
                id="set-hold-mins"
                type="number"
                min={1}
                max={60}
                className="form-input"
                value={holdDurationMinutes}
                onChange={(e) => setHoldDurationMinutes(e.target.value)}
                required
              />
              <span className="form-hint">
                Controls how long held seats remain reserved before returning to available inventory.
              </span>
            </div>

            {updatedAt && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Last updated: {formatDateTime(updatedAt)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setMaxSeatsPerBooking(4);
                  setHoldDurationMinutes(5);
                }}
              >
                <RotateCcw size={16} /> Reset to Defaults (4 seats / 5m)
              </button>
            </div>
          </div>
        </form>
      )}
    </WorkspaceLayout>
  );
}
