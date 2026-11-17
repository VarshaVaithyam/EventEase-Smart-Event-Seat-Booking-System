import React from 'react';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import WorkspaceLayout from '../components/WorkspaceLayout';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <WorkspaceLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Profile</h1>
          <p className="page-subtitle">Your authenticated EventEase identity and role permissions.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '999px',
              background: 'var(--brand-soft)',
              color: 'var(--brand-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.3rem'
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{user?.name}</h2>
            <span className="badge badge-blue" style={{ marginTop: '0.25rem' }}>
              {user?.role}
            </span>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <span className="form-hint">FULL NAME</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
              <User size={16} /> {user?.name}
            </div>
          </div>

          <div className="form-group">
            <span className="form-hint">EMAIL ADDRESS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
              <Mail size={16} /> {user?.email}
            </div>
          </div>

          <div className="form-group">
            <span className="form-hint">ROLE AUTHORIZATION</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
              <Shield size={16} /> ROLE_{user?.role}
            </div>
          </div>

          <div className="form-group">
            <span className="form-hint">MEMBER SINCE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
              <Calendar size={16} /> {formatDateTime(user?.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
