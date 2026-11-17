import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Search, Users, ArrowUpDown, ArrowRight, Sparkles } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import api, { extractErrorMessage } from '../services/api';
import { formatDateTime, formatCurrency, formatShortDate } from '../utils/formatters';

export default function UpcomingEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    setLoading(true);
    api
      .get('/events')
      .then((res) => setEvents(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load events')))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    events.forEach((ev) => {
      if (ev.category) set.add(ev.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = events.filter((e) => {
      const matchCat = selectedCategory === 'ALL' || (e.category || '') === selectedCategory;
      const matchQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q);
      return matchCat && matchQuery;
    });

    list.sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.ticketPrice || 0) - Number(b.ticketPrice || 0);
      if (sortBy === 'seats-desc') return Number(b.availableSeats || 0) - Number(a.availableSeats || 0);
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    });

    return list;
  }, [events, search, selectedCategory, sortBy]);

  return (
    <div>
      <PublicNavbar />
      <div className="page-container">
        <div className="page-header">
          <div>
            <span className="badge badge-purple" style={{ marginBottom: '0.45rem' }}>
              <Sparkles size={12} /> Real-Time Auditorium Discovery
            </span>
            <h1 className="page-title">Explore Upcoming Events</h1>
            <p className="page-subtitle">
              Inspect live seating charts, filter by category, and reserve seats with instant
              5-minute lock protection.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', minWidth: '270px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="search"
                className="form-input"
                style={{ paddingLeft: '2.35rem' }}
                placeholder="Search event, venue, or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search upcoming events"
              />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <ArrowUpDown size={15} color="var(--text-muted)" />
              <select
                className="form-select"
                style={{ width: 'auto', paddingRight: '2rem' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort events"
              >
                <option value="date">Soonest Date</option>
                <option value="seats-desc">Most Open Seats</option>
                <option value="price-asc">Lowest Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'ALL' ? `All Events (${events.length})` : cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="events-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card" style={{ height: '280px' }}>
                <div className="skeleton" style={{ height: '24px', width: '55%', marginBottom: '1rem' }} />
                <div className="skeleton" style={{ height: '70px', width: '100%', marginBottom: '1rem' }} />
                <div className="skeleton" style={{ height: '16px', width: '75%' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card empty-state" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card empty-state">
            <h3 style={{ margin: '0 0 0.4rem' }}>No matching events found</h3>
            <p style={{ margin: '0 0 1rem' }}>Try clearing your search or category filter.</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="events-grid">
            {filtered.map((ev) => {
              const dt = formatShortDate(ev.eventDate);
              const bookedPct = ev.totalSeats ? Math.round((ev.bookedSeats / ev.totalSeats) * 100) : 0;
              const heldPct = ev.totalSeats ? Math.round((ev.heldSeats / ev.totalSeats) * 100) : 0;
              const availPct = Math.max(0, 100 - bookedPct - heldPct);

              return (
                <div key={ev.id} className="event-card">
                  <div>
                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                      <div className="event-date-pill">
                        <span className="event-date-pill-month">{dt.month}</span>
                        <span className="event-date-pill-day">{dt.day}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span className="badge badge-blue">{ev.category || 'Live Event'}</span>
                          <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                            {formatCurrency(ev.ticketPrice)}
                          </span>
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.14rem', fontWeight: 800 }}>{ev.name}</h2>
                      </div>
                    </div>

                    <p
                      style={{
                        margin: '0 0 0.9rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.87rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {ev.description}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.32rem',
                        fontSize: '0.83rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.9rem'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={14} /> {formatDateTime(ev.eventDate)}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={14} /> {ev.venue}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={14} /> Auditorium: {ev.totalRows} rows × {ev.seatsPerRow} seats ({ev.totalSeats} total)
                      </span>
                    </div>

                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          marginBottom: '0.3rem'
                        }}
                      >
                        <span>
                          {ev.availableSeats} Open • {ev.bookedSeats} Booked
                        </span>
                        <span>{bookedPct}% Filled</span>
                      </div>
                      <div className="capacity-meter">
                        <span className="capacity-seg-booked" style={{ width: `${bookedPct}%` }} />
                        <span className="capacity-seg-held" style={{ width: `${heldPct}%` }} />
                        <span className="capacity-seg-avail" style={{ width: `${availPct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      paddingTop: '0.95rem',
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-green">{ev.availableSeats} Available</span>
                      {ev.heldSeats > 0 && <span className="badge badge-orange">{ev.heldSeats} Held</span>}
                    </div>
                    <Link to={`/events/${ev.id}`} className="btn btn-primary btn-sm">
                      Event & Seats <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
