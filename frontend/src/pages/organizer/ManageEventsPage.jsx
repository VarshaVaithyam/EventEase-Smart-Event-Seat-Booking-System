import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Trash2, Edit3, Eye } from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

export default function ManageEventsPage() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadEvents = () => {
    setLoading(true);
    api
      .get('/organizer/events')
      .then((res) => setEvents(res.data))
      .catch((err) => toast.error(extractErrorMessage(err, 'Failed to load organizer events')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const openEditModal = (ev) => {
    const d = new Date(ev.eventDate);
    const pad = (n) => String(n).padStart(2, '0');
    const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;

    setEditingEvent({
      id: ev.id,
      name: ev.name,
      category: ev.category || '',
      venue: ev.venue,
      description: ev.description,
      eventDate: localStr,
      ticketPrice: ev.ticketPrice || 0
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/events/${editingEvent.id}`, {
        name: editingEvent.name,
        category: editingEvent.category,
        venue: editingEvent.venue,
        description: editingEvent.description,
        eventDate: new Date(editingEvent.eventDate).toISOString(),
        ticketPrice: Number(editingEvent.ticketPrice || 0)
      });
      toast.success('Event details updated.');
      setEditingEvent(null);
      loadEvents();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update event'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/events/${deleteTarget.id}`);
      toast.success(`Deleted event "${deleteTarget.name}".`);
      setDeleteTarget(null);
      loadEvents();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Cannot delete event with active/historical bookings'));
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Events</h1>
          <p className="page-subtitle">
            View, configure, and inspect seating layouts for all events created by your account.
          </p>
        </div>
        <Link to="/organizer/events/new" className="btn btn-primary">
          <PlusCircle size={16} /> Create Event
        </Link>
      </div>

      {loading ? (
        <div className="empty-state">Loading your events...</div>
      ) : events.length === 0 ? (
        <div className="card empty-state">
          <h3 style={{ margin: '0 0 0.4rem' }}>You haven&apos;t created any events yet</h3>
          <p style={{ margin: '0 0 1rem' }}>
            Create an event to automatically generate an interactive auditorium seat map.
          </p>
          <Link to="/organizer/events/new" className="btn btn-primary">
            Create First Event
          </Link>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((ev) => (
            <div key={ev.id} className="event-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="badge badge-blue">{ev.category || 'Event'}</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(ev.ticketPrice)}</span>
                </div>
                <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>{ev.name}</h2>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  <div>{formatDateTime(ev.eventDate)}</div>
                  <div>{ev.venue}</div>
                  <div>
                    Layout: {ev.totalRows} rows × {ev.seatsPerRow} cols ({ev.totalSeats} seats)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-green">{ev.availableSeats} Available</span>
                  <span className="badge badge-orange">{ev.heldSeats} Held</span>
                  <span className="badge badge-red">{ev.bookedSeats} Booked</span>
                </div>
              </div>

              <div
                style={{
                  paddingTop: '0.9rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.45rem',
                  flexWrap: 'wrap'
                }}
              >
                <Link
                  to={`/organizer/events/${ev.id}/bookings`}
                  className="btn btn-primary btn-sm"
                >
                  <Eye size={14} /> Bookings & Map
                </Link>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEditModal(ev)}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteTarget(ev)}
                    title="Delete event (only allowed if no bookings exist)"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form
            onSubmit={handleSaveEdit}
            className="modal-card"
            style={{ maxWidth: '560px' }}
          >
            <h3 style={{ margin: '0 0 1rem' }}>Edit Event Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Event Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingEvent.name}
                  onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Venue</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingEvent.venue}
                  onChange={(e) => setEditingEvent({ ...editingEvent, venue: e.target.value })}
                  required
                />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Event Date</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editingEvent.eventDate}
                    onChange={(e) => setEditingEvent({ ...editingEvent, eventDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ticket Price (INR)</label>
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    value={editingEvent.ticketPrice}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, ticketPrice: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={4}
                  className="form-textarea"
                  value={editingEvent.description}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, description: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '1.25rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.6rem'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingEvent(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Event?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? Events with active holds or historical bookings are protected from deletion.`
            : ''
        }
        confirmLabel="Delete Event"
        danger={true}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </WorkspaceLayout>
  );
}
