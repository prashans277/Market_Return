import { useAuth } from '../context/authContext.jsx';

const getRoleMeta = (role) => {
  if (role === 'ADMIN') return { label: 'ADMIN', bg: '#ede9fe', color: '#5b21b6', dot: '#7c3aed' };
  if (role === 'SYSTEM_ADMIN') return { label: 'SYSTEM ADMIN', bg: '#ddd6fe', color: '#4c1d95', dot: '#6d28d9' };
  return { label: role || 'USER', bg: '#d1fae5', color: '#065f46', dot: '#10b981' };
};

const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : '?');

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const roleMeta = getRoleMeta(user?.user_type);

  return (
    <div style={styles.page}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>
        {/* Header strip */}
        <div style={styles.cardHeader}>
          <div style={styles.avatarRing}>
            <div style={styles.avatar}>{getInitial(user?.name)}</div>
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <h1 style={styles.name}>{user?.name || 'User'}</h1>

          <span style={{ ...styles.roleBadge, background: roleMeta.bg, color: roleMeta.color }}>
            <span style={{ ...styles.roleDot, background: roleMeta.dot }} />
            {roleMeta.label}
          </span>

          <div style={styles.divider} />

          <div style={styles.infoList}>
            <div style={styles.infoRow}>
              <div style={styles.infoIconWrap}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="22,6 12,13 2,6" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p style={styles.infoLabel}>Email</p>
                <p style={styles.infoValue}>{user?.email}</p>
              </div>
            </div>

            <div style={styles.infoRow}>
              <div style={styles.infoIconWrap}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p style={styles.infoLabel}>Access Level</p>
                <p style={styles.infoValue}>{user?.user_type}</p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={styles.logoutBtn}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#1e293b';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#0f172a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 17 21 12 16 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    zoom: '0.96',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: '-100px',
    right: '-80px',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute',
    bottom: '-100px',
    left: '-60px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#fff',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
    position: 'relative',
    zIndex: 1,
  },
  cardHeader: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    padding: '32px 0 48px',
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarRing: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 4px rgba(255,255,255,0.15)',
    position: 'absolute',
    bottom: '-40px',
  },
  avatar: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 800,
    color: '#4f46e5',
    letterSpacing: '-1px',
  },
  content: {
    padding: '56px 28px 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  name: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.4px',
    textAlign: 'center',
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12.5px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  roleDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  divider: {
    width: '100%',
    height: '1px',
    background: '#f1f5f9',
    margin: '4px 0',
  },
  infoList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '10px',
    background: '#f8fafc',
  },
  infoIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '1px',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },
  logoutBtn: {
    marginTop: '8px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 18px',
    border: 'none',
    borderRadius: '11px',
    background: '#0f172a',
    color: '#fff',
    fontSize: '14.5px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 150ms ease, transform 150ms ease',
  },
};
