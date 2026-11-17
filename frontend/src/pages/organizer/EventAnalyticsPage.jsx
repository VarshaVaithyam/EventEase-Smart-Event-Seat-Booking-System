import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Download, IndianRupee, UserCheck, TrendingUp } from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { useToast } from '../../context/ToastContext';
import api, { extractErrorMessage } from '../../services/api';
import { formatCurrency, downloadTextFile } from '../../utils/formatters';

const PIE_COLORS = ['#16a34a', '#ea580c', '#dc2626'];

export default function EventAnalyticsPage() {
  const toast = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/organizer/analytics')
      .then((res) => setAnalytics(res.data))
      .catch((err) => setError(extractErrorMessage(err, 'Failed to fetch analytics data')))
      .finally(() => setLoading(false));
  }, []);

  const pieData = analytics
    ? [
        { name: 'Available Seats', value: analytics.availableSeats },
        { name: 'Temporarily Held', value: analytics.currentlyHeldSeats },
        { name: 'Booked Seats', value: analytics.totalBookedSeats }
      ]
    : [];

  const barData = analytics
    ? analytics.eventStats.map((ev) => ({
        name: ev.eventName.length > 20 ? `${ev.eventName.slice(0, 20)}…` : ev.eventName,
        Booked: ev.bookedSeats,
        Available: ev.availableSeats,
        Held: ev.heldSeats,
        Revenue: Number(ev.revenue || 0)
      }))
    : [];

  const handleExportCsv = () => {
    if (!analytics) return;
    const headers = [
      'Event ID',
      'Event Name',
      'Venue',
      'Total Seats',
      'Booked Seats',
      'Available Seats',
      'Held Seats',
      'Confirmed Bookings',
      'Cancelled Bookings',
      'Checked In Bookings',
      'Revenue (INR)',
      'Occupancy (%)'
    ];
    const rows = analytics.eventStats.map((ev) => [
      ev.eventId,
      `"${(ev.eventName || '').replace(/"/g, '""')}"`,
      `"${(ev.venue || '').replace(/"/g, '""')}"`,
      ev.totalSeats,
      ev.bookedSeats,
      ev.availableSeats,
      ev.heldSeats,
      ev.confirmedBookings,
      ev.cancelledBookings,
      ev.checkedInBookings || 0,
      ev.revenue || 0,
      ev.bookingPercentage
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadTextFile('EventEase-Organizer-Analytics.csv', csv, 'text/csv;charset=utf-8');
    toast.success('Exported analytics report to CSV!');
  };

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Revenue & Occupancy Analytics</h1>
          <p className="page-subtitle">
            Real-time seat allocation, ticket revenue, and gate check-in performance across your
            events.
          </p>
        </div>

        {analytics && (
          <button type="button" className="btn btn-primary" onClick={handleExportCsv}>
            <Download size={16} /> Export CSV Report
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state">Loading analytics...</div>
      ) : error || !analytics ? (
        <div className="card empty-state" style={{ color: 'var(--danger)' }}>
          {error || 'Analytics unavailable'}
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div>
                <div className="kpi-label">Gross Revenue</div>
                <div className="kpi-value" style={{ color: 'var(--brand-primary)' }}>
                  {formatCurrency(analytics.totalRevenue || 0)}
                </div>
                <div className="kpi-meta">{analytics.totalBookedSeats} booked seats</div>
              </div>
              <div className="kpi-icon">
                <IndianRupee size={20} />
              </div>
            </div>

            <div className="kpi-card">
              <div>
                <div className="kpi-label">Confirmed Bookings</div>
                <div className="kpi-value">{analytics.totalConfirmedBookings}</div>
                <div className="kpi-meta">Across {analytics.totalEvents} events</div>
              </div>
            </div>

            <div className="kpi-card">
              <div>
                <div className="kpi-label">Gate Check-Ins</div>
                <div className="kpi-value" style={{ color: 'var(--success)' }}>
                  {analytics.totalCheckedInBookings || 0}
                </div>
                <div className="kpi-meta">Verified QR scans</div>
              </div>
              <div className="kpi-icon">
                <UserCheck size={20} />
              </div>
            </div>

            <div className="kpi-card">
              <div>
                <div className="kpi-label">Overall Occupancy</div>
                <div className="kpi-value">{analytics.bookingPercentage}%</div>
                <div className="kpi-meta">
                  {analytics.availableSeats} open • {analytics.currentlyHeldSeats} held
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem'
            }}
          >
            <div className="card">
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>
                Seat Allocation Distribution
              </h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={96}
                      paddingAngle={3}
                      label
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>
                Event-Wise Seat Statistics
              </h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Booked" fill="#dc2626" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Held" fill="#ea580c" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Available" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>
                Event-Wise Ticket Revenue (INR)
              </h2>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="Revenue" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.4rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                Detailed Event Financial & Seat Breakdown
              </h2>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Capacity</th>
                    <th>Booked</th>
                    <th>Available</th>
                    <th>Held</th>
                    <th>Confirmed</th>
                    <th>Checked In</th>
                    <th>Revenue</th>
                    <th>Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.eventStats.map((ev) => (
                    <tr key={ev.eventId}>
                      <td style={{ fontWeight: 800 }}>{ev.eventName}</td>
                      <td>{ev.totalSeats}</td>
                      <td>{ev.bookedSeats}</td>
                      <td>{ev.availableSeats}</td>
                      <td>{ev.heldSeats}</td>
                      <td>{ev.confirmedBookings}</td>
                      <td>
                        <span className="badge badge-purple">{ev.checkedInBookings || 0}</span>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                        {formatCurrency(ev.revenue || 0)}
                      </td>
                      <td style={{ fontWeight: 800 }}>{ev.bookingPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </WorkspaceLayout>
  );
}
