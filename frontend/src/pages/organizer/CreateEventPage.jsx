import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, PlusCircle, Grid, Layers } from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';

const AUDITORIUM_PRESETS = [
  { label: 'Workshop Hall (6 × 10 = 60)', rows: 6, cols: 10 },
  { label: 'Main Auditorium (10 × 12 = 120)', rows: 10, cols: 12 },
  { label: 'Grand Arena (14 × 16 = 224)', rows: 14, cols: 16 }
];

export default function CreateEventPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const defaultFutureLocal = (() => {
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  })();

  const [form, setForm] = useState({
    name: '',
    category: 'AI Innovation Hackathon',
    venue: '',
    eventDate: defaultFutureLocal,
    totalRows: 10,
    seatsPerRow: 12,
    ticketPrice: 499,
    keywords: 'Artificial Intelligence, Cloud Systems, Students, Live Demos',
    description: ''
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const safeRows = Math.min(26, Math.max(1, Number(form.totalRows || 1)));
  const safeCols = Math.min(30, Math.max(1, Number(form.seatsPerRow || 1)));
  const totalSeats = safeRows * safeCols;

  const handleGenerateAi = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter an Event Name first before generating with AI.');
      return;
    }
    setAiLoading(true);
    try {
      const { data } = await api.post('/ai/generate-event-description', {
        eventName: form.name,
        category: form.category,
        venue: form.venue,
        keywords: form.keywords
      });
      setForm((prev) => ({ ...prev, description: data.description }));
      setAiSource(data.source);
      toast.success('Event description generated! You can review or customize it before saving.');
    } catch (err) {
      toast.error(
        extractErrorMessage(
          err,
          'AI generation unavailable right now. You can enter the description manually.'
        )
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedDate = new Date(form.eventDate);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
      toast.error('Event date and time must be in the future.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        venue: form.venue.trim(),
        description: form.description.trim(),
        eventDate: parsedDate.toISOString(),
        totalRows: Number(form.totalRows),
        seatsPerRow: Number(form.seatsPerRow),
        ticketPrice: Number(form.ticketPrice || 0)
      };
      const { data } = await api.post('/events', payload);
      toast.success(
        `Event "${data.name}" created with ${data.totalSeats} automatically generated seats!`
      );
      navigate(`/organizer/events/${data.id}/bookings`);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create event'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <span className="badge badge-purple" style={{ marginBottom: '0.45rem' }}>
            <Layers size={12} /> Auditorium Builder + Gemini AI
          </span>
          <h1 className="page-title">Create New Event</h1>
          <p className="page-subtitle">
            Configure event metadata, preview the live auditorium seating blueprint, and generate
            descriptions with Google Gemini AI.
          </p>
        </div>
      </div>

      <div className="seat-workspace" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) 360px' }}>
        <form onSubmit={handleSubmit} className="card">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="ev-name" className="form-label">
                Event Name *
              </label>
              <input
                id="ev-name"
                type="text"
                className="form-input"
                placeholder="e.g., TENSORA 2K26"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ev-category" className="form-label">
                Category
              </label>
              <input
                id="ev-category"
                type="text"
                className="form-input"
                placeholder="e.g., AI Innovation Hackathon"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="ev-venue" className="form-label">
                Venue *
              </label>
              <input
                id="ev-venue"
                type="text"
                className="form-input"
                placeholder="e.g., KLN College Auditorium"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ev-date" className="form-label">
                Event Date & Time (Future) *
              </label>
              <input
                id="ev-date"
                type="datetime-local"
                className="form-input"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group full-width">
              <span className="form-label">Quick Auditorium Presets</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {AUDITORIUM_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`filter-chip ${
                      Number(form.totalRows) === p.rows && Number(form.seatsPerRow) === p.cols
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, totalRows: p.rows, seatsPerRow: p.cols }))
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ev-rows" className="form-label">
                Number of Rows (1 – 26) *
              </label>
              <input
                id="ev-rows"
                type="number"
                min={1}
                max={26}
                className="form-input"
                value={form.totalRows}
                onChange={(e) => setForm({ ...form, totalRows: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ev-cols" className="form-label">
                Seats per Row (1 – 30) *
              </label>
              <input
                id="ev-cols"
                type="number"
                min={1}
                max={30}
                className="form-input"
                value={form.seatsPerRow}
                onChange={(e) => setForm({ ...form, seatsPerRow: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ev-price" className="form-label">
                Ticket Price (INR)
              </label>
              <input
                id="ev-price"
                type="number"
                min={0}
                step="1"
                className="form-input"
                value={form.ticketPrice}
                onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
              />
            </div>

            <div className="form-group">
              <span className="form-label">Generated Capacity</span>
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'var(--brand-soft)',
                  border: '1px solid rgba(79, 70, 229, 0.28)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 800,
                  color: 'var(--brand-primary)'
                }}
              >
                <Grid size={16} />
                {totalSeats} Seats (Rows A – {String.fromCharCode(64 + safeRows)})
              </div>
            </div>

            {/* AI Event Description Generator Panel */}
            <div
              className="form-group full-width"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '0.7rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.93rem' }}>
                    AI Event Description Assistant
                  </div>
                  <div className="form-hint">
                    Generate a polished event overview in seconds based on your event details.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-ai btn-sm"
                  onClick={handleGenerateAi}
                  disabled={aiLoading}
                >
                  <Sparkles size={15} />
                  {aiLoading ? 'Generating Copy...' : 'Generate with AI'}
                </button>
              </div>

              <input
                type="text"
                className="form-input"
                placeholder="Keywords (e.g., Artificial Intelligence, Innovation, Students)"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                aria-label="AI Keywords"
              />
            </div>

            <div className="form-group full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="ev-desc" className="form-label">
                  Event Description *
                </label>
                {aiSource && (
                  <span className="badge badge-blue">
                    {aiSource === 'GEMINI_API' ? 'Generated via Gemini API' : 'AI Smart Copy'}
                  </span>
                )}
              </div>
              <textarea
                id="ev-desc"
                rows={5}
                className="form-textarea"
                placeholder="Describe the agenda, speakers, audience, and highlights..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.15rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/organizer/events')}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              <PlusCircle size={17} />
              {submitting ? 'Creating Event & Seats...' : `Launch Event (${totalSeats} Seats)`}
            </button>
          </div>
        </form>

        {/* Live Auditorium Blueprint Preview */}
        <div className="card" style={{ position: 'sticky', top: '4.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span className="badge badge-green" style={{ marginBottom: '0.35rem' }}>
              Live Blueprint Preview
            </span>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              {safeRows} × {safeCols} Auditorium Grid
            </h2>
            <p className="form-hint" style={{ margin: '0.2rem 0 0' }}>
              {totalSeats} seats will be generated automatically when you publish the event.
            </p>
          </div>

          <div className="stage-arc" style={{ height: 10, marginBottom: '0.85rem' }} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              alignItems: 'center',
              maxHeight: '340px',
              overflow: 'auto',
              padding: '0.5rem',
              background: 'var(--bg-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}
          >
            {Array.from({ length: Math.min(safeRows, 16) }).map((_, r) => (
              <div key={r} style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.62rem', width: 14, fontWeight: 800, color: 'var(--text-muted)' }}>
                  {String.fromCharCode(65 + r)}
                </span>
                {Array.from({ length: Math.min(safeCols, 18) }).map((__, c) => (
                  <span
                    key={c}
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: '3px 3px 1px 1px',
                      background: 'var(--seat-available-bg)',
                      border: '1px solid var(--seat-available-border)'
                    }}
                  />
                ))}
              </div>
            ))}
            {(safeRows > 16 || safeCols > 18) && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                + Full {safeRows}×{safeCols} matrix generated on launch
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
