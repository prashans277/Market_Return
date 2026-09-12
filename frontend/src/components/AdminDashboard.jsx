import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/authContext.jsx';
import { getUsers, deactivateUser } from '../api/user.api.jsx';
import { getClients, getClient, getClientAudits, getMonitoringAudits, createClient, updateClient, addClientCall, updateClientCall } from '../api/client.api.jsx';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'ADMIN',
};

const getRoleMeta = (role) => {
  if (role === 'SYSTEM_ADMIN') return { label: 'SYSTEM ADMIN', bg: '#ddd6fe', color: '#5b21b6', dot: '#7c3aed' };
  if (role === 'ADMIN') return { label: 'ADMIN', bg: '#e0e7ff', color: '#3730a3', dot: '#4f46e5' };
  return { label: role || 'USER', bg: '#d1fae5', color: '#065f46', dot: '#10b981' };
};

const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : 'A');

const formatISTDate = (date) => date
  ? new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
  : '-';

const getClientStateMeta = (state) => {
  if (state === 'NEW') return { label: 'NEW', bg: '#e0f2fe', color: '#075985' };
  if (state === 'IN_PROGRESS') return { label: 'IN_PROGRESS', bg: '#fef3c7', color: '#92400e' };
  if (state === 'CONVERTED') return { label: 'CONVERTED', bg: '#dcfce7', color: '#166534' };
  return { label: 'LOST', bg: '#fee2e2', color: '#991b1b' };
};

const stateOptions = [
  { value: '', label: 'All' },
  { value: 'NEW', label: 'NEW' },
  { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
  { value: 'CONVERTED', label: 'CONVERTED' },
  { value: 'LOST', label: 'LOST' },
];

function StateDropdown({ name, value, onChange, disabled = false, includeAll = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const options = includeAll ? stateOptions : stateOptions.filter((option) => option.value);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectOption = (option) => {
    onChange({ target: { name, value: option.value } });
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={styles.stateDropdown}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        style={disabled ? { ...styles.stateDropdownTrigger, ...styles.stateDropdownDisabled } : styles.stateDropdownTrigger}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption.label}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={isOpen ? styles.stateDropdownChevronOpen : undefined}>
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && !disabled && (
        <div style={styles.stateDropdownMenu} role="listbox">
          {options.map((option) => (
            <button
              type="button"
              key={option.value || 'all'}
              onClick={() => selectOption(option)}
              style={option.value === value ? { ...styles.stateDropdownOption, ...styles.stateDropdownOptionActive } : styles.stateDropdownOption}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserDropdown({ users, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedUser = users.find((user) => String(user.id) === String(value));

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectUser = (userId) => {
    onChange({ target: { value: userId } });
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={styles.stateDropdown}>
      <button type="button" onClick={() => setIsOpen((open) => !open)} style={styles.stateDropdownTrigger} aria-haspopup="listbox" aria-expanded={isOpen}>
        <span>{selectedUser ? `${selectedUser.name} (${selectedUser.user_type})` : 'Select a user'}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={isOpen ? styles.stateDropdownChevronOpen : undefined}>
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div style={styles.stateDropdownMenu} role="listbox">
          <button type="button" onClick={() => selectUser('')} style={!value ? { ...styles.stateDropdownOption, ...styles.stateDropdownOptionActive } : styles.stateDropdownOption}>Select a user</button>
          {users.map((user) => (
            <button type="button" key={user.id} onClick={() => selectUser(user.id)} style={String(user.id) === String(value) ? { ...styles.stateDropdownOption, ...styles.stateDropdownOptionActive } : styles.stateDropdownOption}>
              {user.name} ({user.user_type})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ACTIONS = [
  { id: 'create', label: 'Create User',  icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="16" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )},
  { id: 'role',   label: 'Change Role',  icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'password', label: 'Change Password', icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )},
];

const actionLabel = {
  create: 'Create User',
  role: 'Promote to Admin',
  password: 'Update Password',
};

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const isUserViewOnly = user?.user_type === 'USER';
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState('create');
  const [selectedSection, setSelectedSection] = useState(isUserViewOnly ? 'clients' : 'users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    email_id: '',
    phone_number: '',
    conversion_probability: '',
  });
  const [clientFilters, setClientFilters] = useState({
    search: '',
    current_state: '',
    minProbability: '',
    maxProbability: '',
  });
  const [clientsData, setClientsData] = useState({ clients: [], pagination: { page: 1, totalPages: 1, totalCount: 0, limit: 25 }, summary: { total_clients: 0, total_calls: 0, states: {} } });
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [isClientFormExpanded, setIsClientFormExpanded] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editForm, setEditForm] = useState({ current_state: 'NEW', conversion_probability: 0 });
  const [callForm, setCallForm] = useState({ notes: '' });
  const [callEdits, setCallEdits] = useState([]);
  const [clientAudits, setClientAudits] = useState([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [isCallFormExpanded, setIsCallFormExpanded] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [callSubmitting, setCallSubmitting] = useState(false);
  const [isClientReadOnly, setIsClientReadOnly] = useState(false);
  const [monitoringUserId, setMonitoringUserId] = useState('');
  const [monitoringDates, setMonitoringDates] = useState({ start_date: '', end_date: '' });
  const [monitoringAuditType, setMonitoringAuditType] = useState('');
  const [monitoringData, setMonitoringData] = useState({ audits: [], pagination: { page: 1, totalPages: 1, totalCount: 0, limit: 25 }, activity_counts: {} });
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  const authHeader = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    if (selectedSection === 'users' || selectedSection === 'monitoring') {
      fetchUsers(selectedSection === 'monitoring');
    }
  }, [selectedSection, token]);

  useEffect(() => {
    if (selectedSection === 'clients' && token) {
      fetchClients(1);
    }
  }, [selectedSection, token]);

  const fetchUsers = async (includeSelf = false) => {
    setUsersLoading(true);
    const result = await getUsers(token, includeSelf);
    if (result.success) {
      setUsers(result.users);
    }
    setUsersLoading(false);
  };

  const fetchMonitoringAudits = async (page = 1, userId = monitoringUserId, dates = monitoringDates, auditType = monitoringAuditType) => {
    if (!token || !userId) {
      setMonitoringData({ audits: [], pagination: { page: 1, totalPages: 1, totalCount: 0, limit: 25 } });
      return;
    }
    setMonitoringLoading(true);
    const result = await getMonitoringAudits(token, { userId, page, limit: 25, audit_type: auditType, ...dates });
    if (result.success) setMonitoringData(result.data);
    else setMessage({ type: 'error', text: result.message });
    setMonitoringLoading(false);
  };

  const handleMonitoringUserChange = (event) => {
    const userId = event.target.value;
    setMonitoringUserId(userId);
    fetchMonitoringAudits(1, userId, monitoringDates);
  };

  const handleMonitoringDateChange = (event) => {
    const { name, value } = event.target;
    setMonitoringDates((previous) => ({ ...previous, [name]: value }));
  };

  const handleMonitoringTypeChange = (auditType) => {
    setMonitoringAuditType(auditType);
    fetchMonitoringAudits(1, monitoringUserId, monitoringDates, auditType);
  };

  const fetchClients = async (page = clientsData.pagination.page || 1, filters = clientFilters) => {
    if (!token) return;
    setClientsLoading(true);
    const result = await getClients(token, {
      page,
      limit: 25,
      search: filters.search,
      current_state: filters.current_state,
      minProbability: filters.minProbability,
      maxProbability: filters.maxProbability,
    });

    if (result.success) {
      setClientsData(result.data);
    }
    setClientsLoading(false);
  };

  const handleClientInput = (event) => {
    const { name, value } = event.target;
    setClientForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientFilterInput = (event) => {
    const { name, value } = event.target;
    setClientFilters((prev) => ({ ...prev, [name]: value }));
  };

  const openClientModal = async (client, readOnly = false) => {
    const result = await getClient(token, client._id);
    const latestClient = result.success ? result.client : client;
    if (!result.success) setMessage({ type: 'error', text: result.message });
    setEditingClient(latestClient);
    setEditForm({
      current_state: latestClient.current_state || 'NEW',
      conversion_probability: latestClient.conversion_probability ?? 0,
    });
    setCallForm({ notes: '' });
    setCallEdits([...(latestClient.call_details || [])].sort((firstCall, secondCall) => new Date(secondCall.created_at) - new Date(firstCall.created_at)).map((call) => ({
      ...call,
      notes: call.notes || '',
    })));
    setIsCallFormExpanded(false);
    setIsClientReadOnly(readOnly);
    setClientAudits([]);
    if (readOnly) {
      setAuditsLoading(true);
      const auditResult = await getClientAudits(token, latestClient._id);
      if (auditResult.success) {
        setClientAudits(auditResult.audits);
      } else {
        setMessage({ type: 'error', text: auditResult.message });
      }
      setAuditsLoading(false);
    }
  };

  const openEditClient = (client) => openClientModal(client, false);
  const openViewClient = (client) => openClientModal(client, true);

  const closeEditClient = () => {
    if (!editSubmitting && !callSubmitting) setEditingClient(null);
  };

  const handleEditInput = (event) => {
    const { name, value } = event.target;
    setEditForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleCallInput = (event) => {
    const { name, value } = event.target;
    setCallForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleExistingCallInput = (callId, event) => {
    const { name, value } = event.target;
    setCallEdits((previous) => previous.map((call) => call._id === callId ? { ...call, [name]: value } : call));
  };

  const refreshEditingClient = async (clientId = editingClient?._id) => {
    const result = await getClient(token, clientId);
    if (!result.success) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setEditingClient(result.client);
    setCallEdits([...(result.client.call_details || [])].sort((firstCall, secondCall) => new Date(secondCall.created_at) - new Date(firstCall.created_at)).map((call) => ({
      ...call,
      notes: call.notes || '',
    })));
  };

  const handleUpdateCall = async (call) => {
    setCallSubmitting(true);
    const result = await updateClientCall(token, editingClient._id, call._id, {
      notes: call.notes,
    });
    if (result.success) {
      setCallEdits((previous) => previous.map((item) => item._id === call._id ? { ...item, ...result.call } : item));
      await fetchClients(clientsData.pagination.page);
      await refreshEditingClient();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setCallSubmitting(false);
  };

  const handleUpdateClient = async (event) => {
    event.preventDefault();
    setEditSubmitting(true);
    const result = await updateClient(token, editingClient._id, {
      current_state: editForm.current_state,
      conversion_probability: Number(editForm.conversion_probability),
    });
    if (result.success) {
      await fetchClients(clientsData.pagination.page);
      await refreshEditingClient();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setEditSubmitting(false);
  };

  const handleAddCall = async (event) => {
    event.preventDefault();
    setCallSubmitting(true);
    const result = await addClientCall(token, editingClient._id, {
      notes: callForm.notes,
    });
    if (result.success) {
      setCallForm({ notes: '' });
      setIsCallFormExpanded(false);
      await fetchClients(clientsData.pagination.page);
      await refreshEditingClient();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setCallSubmitting(false);
  };

  const handleCreateClient = async (event) => {
    event.preventDefault();
    setClientSubmitting(true);
    setMessage({ type: '', text: '' });

    const result = await createClient(token, {
      name: clientForm.name,
      email_id: clientForm.email_id,
      phone_number: clientForm.phone_number,
      conversion_probability: Number(clientForm.conversion_probability),
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Client created successfully.' });
      setClientForm({
        name: '',
        email_id: '',
        phone_number: '',
        conversion_probability: '',
      });
      await fetchClients(1);
    } else {
      setMessage({ type: 'error', text: result.message });
    }

    setClientSubmitting(false);
  };

  const applyClientFilters = () => {
    fetchClients(1);
  };

  const clearClientFilters = () => {
    const emptyFilters = { search: '', current_state: '', minProbability: '', maxProbability: '' };
    setClientFilters(emptyFilters);
    fetchClients(1, emptyFilters);
  };

  const handleDeactivateClick = (userEmail) => {
    setDeactivateConfirm(userEmail);
  };

  const handleDeactivateConfirm = async (userEmail) => {
    const result = await deactivateUser(userEmail, token);
    if (result.success) {
      setMessage({ type: 'success', text: 'User deactivated successfully.' });
      await fetchUsers();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setDeactivateConfirm(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      await axios.post('https://market-return.onrender.com/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      }, authHeader);

      setMessage({ type: 'success', text: 'User created successfully.' });
      setForm(initialForm);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'User creation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const response = await axios.put('https://market-return.onrender.com/auth/role/change', {
        email: form.email,
        role: form.role,
      }, authHeader);
      setMessage({ type: 'success', text: `Role changed successfully for ${response.data.user.email}.` });
      setForm(initialForm);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Role change failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      await axios.put('https://market-return.onrender.com/auth/password/change', {
        email: form.email,
        password: form.password,
      }, authHeader);
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setForm(initialForm);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Password change failed.' });
    } finally {
      setLoading(false);
    }
  };

  const submitHandler =
    selectedAction === 'create' ? handleCreateUser :
    selectedAction === 'role' ? handleRoleChange :
    handlePasswordChange;

  const roleMeta = getRoleMeta(user?.user_type);

  return (
    <div style={styles.page}>

      {/* ── Top Navigation Bar ── */}
      <header style={styles.navbar}>
        <div style={styles.navBrand}>
          <div style={styles.navLogo}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l5-5 4 4 5-6 4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span style={styles.navTitle}>Market Return</span>
            <span style={styles.navSep}>|</span>
            <span style={styles.navSection}>Admin Portal</span>
          </div>
        </div>

        <div style={styles.navRight}>
          {/* User info chip */}
          <div style={styles.userChip}>
            <div style={styles.chipAvatar}>{getInitial(user?.name)}</div>
            <div style={styles.chipInfo}>
              <span style={styles.chipName}>{user?.name}</span>
              <span style={{ ...styles.roleBadge, background: roleMeta.bg, color: roleMeta.color }}>
                <span style={{ ...styles.roleDot, background: roleMeta.dot }} />
                {roleMeta.label}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            style={styles.logoutBtn}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#b91c1c'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#ef4444'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Sidebar & Main Content ── */}
      <div style={styles.container}>
        {/* Sidebar */}
        <aside style={isSidebarOpen ? styles.sidebar : { ...styles.sidebar, ...styles.sidebarClosed }}>
          <div style={styles.sidebarHeader}>
            {isSidebarOpen && <span style={styles.sidebarTitle}>Workspace</span>}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              style={styles.sidebarToggle}
              aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d={isSidebarOpen ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <nav style={styles.nav}>
            {!isUserViewOnly && (
              <button
                onClick={() => setSelectedSection('users')}
                style={selectedSection === 'users'
                  ? { ...styles.navItem, ...styles.navItemActive, ...(isSidebarOpen ? {} : styles.navItemCollapsed) }
                  : { ...styles.navItem, ...(isSidebarOpen ? {} : styles.navItemCollapsed) }}
                title="User Management"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isSidebarOpen && <span>User Management</span>}
              </button>
            )}

            <button
              onClick={() => setSelectedSection('monitoring')}
              style={selectedSection === 'monitoring' ? { ...styles.navItem, ...styles.navItemActive, ...(isSidebarOpen ? {} : styles.navItemCollapsed) } : { ...styles.navItem, ...(isSidebarOpen ? {} : styles.navItemCollapsed) }}
              title="Monitoring"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m7 16 4-5 3 3 5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isSidebarOpen && <span>Monitoring</span>}
            </button>

            <button
              onClick={() => setSelectedSection('clients')}
              style={selectedSection === 'clients' ? { ...styles.navItem, ...styles.navItemActive, ...(isSidebarOpen ? {} : styles.navItemCollapsed) } : { ...styles.navItem, ...(isSidebarOpen ? {} : styles.navItemCollapsed) }}
              title="Client Management"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.8"/>
                <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.8"/>
                <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.8"/>
                <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
              {isSidebarOpen && <span>Client Management</span>}
            </button>
          </nav>
        </aside>

        {/* ── Page Content ── */}
        <main style={selectedSection === 'clients' || selectedSection === 'monitoring' ? { ...styles.main, overflowY: 'auto' } : styles.main}>
        {selectedSection === 'users' && (
          <>
            <div style={styles.pageHeader}>
              <h2 style={styles.pageTitle}>User Management</h2>
              <p style={styles.pageSubtitle}>Create accounts, manage roles, and update credentials.</p>
            </div>

            <div style={styles.userWorkspace}>
              <section style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardIconWrap}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4" stroke="#4f46e5" strokeWidth="1.8"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={styles.cardTitle}>Manage Users</h3>
                    <p style={styles.cardSubtitle}>Select an action below</p>
                  </div>
                </div>

                <div style={styles.managePanel}>
                  <div style={styles.tabColumn}>
                    {ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => { setSelectedAction(action.id); setMessage({ type: '', text: '' }); }}
                        style={selectedAction === action.id ? { ...styles.tab, ...styles.tabActive, ...styles.verticalTabActive } : { ...styles.tab, ...styles.verticalTab }}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <div style={styles.formPanel}>
                    <form style={styles.form} onSubmit={submitHandler}>
                      {selectedAction === 'create' && (
                        <div style={styles.fieldGroup}>
                          <label style={styles.label}>Full Name</label>
                          <div style={styles.inputWrap}>
                            <svg style={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="12" cy="7" r="4" stroke="#94a3b8" strokeWidth="1.8"/>
                            </svg>
                            <input
                              type="text"
                              name="name"
                              value={form.name}
                              onChange={handleChange}
                              style={styles.input}
                              placeholder="John Doe"
                              required={selectedAction === 'create'}
                            />
                          </div>
                        </div>
                      )}

                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Email address</label>
                        <div style={styles.inputWrap}>
                          <svg style={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="22,6 12,13 2,6" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="user@example.com"
                            required
                          />
                        </div>
                      </div>

                      {selectedAction !== 'role' && (
                        <div style={styles.fieldGroup}>
                          <label style={styles.label}>{selectedAction === 'create' ? 'Password' : 'New Password'}</label>
                          <div style={styles.inputWrap}>
                            <svg style={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#94a3b8" strokeWidth="1.8"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                            <input
                              type="password"
                              name="password"
                              value={form.password}
                              onChange={handleChange}
                              style={styles.input}
                              placeholder="••••••••"
                              required
                            />
                          </div>
                        </div>
                      )}

                      {selectedAction === 'role' && (
                        <div style={styles.fieldGroup}>
                          <label style={styles.label}>Promote to Role</label>
                          <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            style={styles.select}
                          >
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>
                      )}

                      {message.text && (
                        <div style={message.type === 'success' ? styles.bannerSuccess : styles.bannerError}>
                          {message.type === 'success' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="22 4 12 14.01 9 11.01" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="1.8"/>
                              <line x1="12" y1="8" x2="12" y2="12" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/>
                              <line x1="12" y1="16" x2="12.01" y2="16" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round"/>
                            </svg>
                          )}
                          <span>{message.text}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        style={loading ? { ...styles.primaryBtn, ...styles.primaryBtnDisabled } : styles.primaryBtn}
                        disabled={loading}
                        onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.38)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(79,70,229,0.24)'; }}
                      >
                        {loading ? (
                          <span style={styles.btnContent}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={styles.spinner}>
                              <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
                              <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Working…
                          </span>
                        ) : (
                          <span style={styles.btnContent}>
                            {actionLabel[selectedAction]}
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </section>

              <div style={styles.usersSection}>
                <div style={styles.usersHeader}>
                  <h3 style={styles.usersTitle}>Active Users</h3>
                  <p style={styles.usersSubtitle}>{users.length} user(s) on the system</p>
                </div>

                <div style={styles.usersListWrapper}>
                  {usersLoading ? (
                    <div style={styles.loadingText}>Loading users...</div>
                  ) : users.length === 0 ? (
                    <div style={styles.emptyState}>No users found on the system.</div>
                  ) : (
                    <div style={styles.usersList}>
                      {users.map((u) => (
                        <div key={u.id} style={styles.userCard}>
                          <div style={styles.userCardHeader}>
                            <div style={styles.userInfo}>
                              <div style={styles.userAvatar}>{getInitial(u.name)}</div>
                              <div>
                                <div style={styles.userName}>{u.name}</div>
                                <div style={styles.userEmail}>{u.email}</div>
                              </div>
                            </div>
                            <span style={{ ...styles.roleBadge, background: getRoleMeta(u.user_type).bg, color: getRoleMeta(u.user_type).color }}>
                              {getRoleMeta(u.user_type).label}
                            </span>
                          </div>

                          <div style={styles.userDates}>
                            <span style={styles.dateLabel}>Created: {u.created_at}</span>
                            <span style={styles.dateLabel}>Updated: {u.updated_at}</span>
                          </div>

                          <div style={styles.userActions}>
                            {deactivateConfirm === u.email ? (
                              <div style={styles.confirmBox}>
                                <span>Deactivate {u.name}?</span>
                                <div style={styles.confirmButtons}>
                                  <button
                                    onClick={() => handleDeactivateConfirm(u.email)}
                                    style={styles.confirmYes}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeactivateConfirm(null)}
                                    style={styles.confirmNo}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeactivateClick(u.email)}
                                style={u.is_active ? styles.deactivateBtn : styles.deactivateBtnDisabled}
                                disabled={!u.is_active}
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {selectedSection === 'monitoring' && (
          <div style={styles.monitoringWrap}>
            <div style={styles.pageHeader}>
              <h2 style={styles.pageTitle}>Monitoring</h2>
              <p style={styles.pageSubtitle}>Review audit activity for yourself and users below your role.</p>
            </div>

            <div style={styles.monitoringFilters}>
              <div style={styles.inlineFieldFilter}>
                <label style={styles.label}>User</label>
                <UserDropdown users={users} value={monitoringUserId} onChange={handleMonitoringUserChange} />
              </div>
              <div style={styles.inlineFieldFilter}>
                <label style={styles.label}>Start date</label>
                <div style={styles.monitoringDateInputWrap}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  <input type="date" name="start_date" value={monitoringDates.start_date} onChange={handleMonitoringDateChange} style={styles.monitoringDateInput} />
                </div>
              </div>
              <div style={styles.inlineFieldFilter}>
                <label style={styles.label}>End date</label>
                <div style={styles.monitoringDateInputWrap}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  <input type="date" name="end_date" value={monitoringDates.end_date} onChange={handleMonitoringDateChange} style={styles.monitoringDateInput} />
                </div>
              </div>
              <button type="button" onClick={() => fetchMonitoringAudits(1, monitoringUserId, monitoringDates, monitoringAuditType)} style={styles.secondaryBtn}>Apply filters</button>
            </div>

            <div style={styles.monitoringContentGrid}>
            <div style={styles.monitoringCard}>
              {monitoringLoading ? (
                <div style={styles.emptyCell}>Loading audits...</div>
              ) : !monitoringUserId ? (
                <div style={styles.emptyCell}>Select a user to view audit activity.</div>
              ) : monitoringData.audits.length === 0 ? (
                <div style={styles.emptyCell}>No audits found for this selection.</div>
              ) : (
                <div style={styles.auditList}>
                  {monitoringData.audits.map((audit) => (
                    <div key={audit._id} style={styles.auditItem}>
                      <div style={styles.auditItemHeader}>
                        <strong>{audit.entity_type}</strong>
                        <span>{formatISTDate(audit.created_at)}</span>
                      </div>
                      <div style={styles.monitoringStatement}>{audit.statement}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={styles.paginationBar}>
                <button type="button" onClick={() => fetchMonitoringAudits(Math.max(1, monitoringData.pagination.page - 1))} disabled={monitoringData.pagination.page <= 1 || monitoringLoading} style={styles.paginationBtn}>Previous</button>
                <span style={styles.pageInfo}>Page {monitoringData.pagination.page} of {monitoringData.pagination.totalPages || 1}</span>
                <button type="button" onClick={() => fetchMonitoringAudits(Math.min(monitoringData.pagination.totalPages || 1, monitoringData.pagination.page + 1))} disabled={monitoringData.pagination.page >= (monitoringData.pagination.totalPages || 1) || monitoringLoading} style={styles.paginationBtn}>Next</button>
              </div>
            </div>
            <div style={styles.monitoringStatsCard}>
              <h3 style={styles.monitoringStatsTitle}>User activity</h3>
              <p style={styles.monitoringStatsSubtitle}>For the selected user and date range</p>
              {[
                ['all', 'All'],
                ['calls_placed', 'Calls placed'],
                ['call_details_updated', 'Call details updated'],
                ['clients_added', 'Clients added'],
                ['client_details_updated', 'Client details updated'],
              ].map(([key, label], index) => {
                const auditTypes = ['', 'CREATE_CALL', 'UPDATE_CALL', 'CREATE_CLIENT', 'UPDATE_CLIENT'];
                const auditType = auditTypes[index];
                return (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleMonitoringTypeChange(auditType)}
                  style={monitoringAuditType === auditType ? { ...styles.monitoringStatRow, ...styles.monitoringStatRowActive } : styles.monitoringStatRow}
                >
                  <span>{label}</span>
                  <strong>{monitoringData.activity_counts?.[key] || 0}</strong>
                </button>
                );
              })}
            </div>
            </div>
          </div>
        )}

        {selectedSection === 'clients' && (
          <div style={styles.clientManagementWrap}>
            <div style={styles.clientPageHeader}>
              <div style={styles.pageHeader}>
                <h2 style={styles.pageTitle}>Client Management</h2>
                <p style={styles.pageSubtitle}>Track new leads, follow-up status, and conversion progress.</p>
              </div>
              <div style={styles.clientLiveStatus} aria-label="Live client status">
                <div style={styles.liveMetric}>
                  <span style={styles.liveMetricValue}>{clientsData.summary?.total_clients || 0}</span>
                  <span style={styles.liveMetricLabel}>Clients</span>
                </div>
                <div style={styles.liveMetric}>
                  <span style={styles.liveMetricValue}>{clientsData.summary?.total_calls || 0}</span>
                  <span style={styles.liveMetricLabel}>Calls</span>
                </div>
                {[
                  ['NEW', '#075985', '#e0f2fe'],
                  ['IN_PROGRESS', '#92400e', '#fef3c7'],
                  ['CONVERTED', '#166534', '#dcfce7'],
                  ['LOST', '#991b1b', '#fee2e2'],
                ].map(([state, color, background]) => (
                  <div key={state} style={{ ...styles.liveMetric, ...styles.liveStateMetric, color, background }}>
                    <span style={styles.liveMetricValue}>{clientsData.summary?.states?.[state] || 0}</span>
                    <span style={styles.liveMetricLabel}>{state}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={isClientFormExpanded ? styles.clientFormCard : styles.clientFormCardCollapsed}>
              <div style={styles.clientFormBar}>
                <div style={styles.cardIconWrap}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="10" cy="7" r="4" stroke="#4f46e5" strokeWidth="1.8"/>
                    <path d="M20 8v6M17 11h6" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <h3 style={styles.cardTitle}>Add new client</h3>
                  <p style={styles.cardSubtitle}>Capture lead details</p>
                </div>
                <button
                  type="button"
                  aria-label={isClientFormExpanded ? 'Collapse add new client form' : 'Expand add new client form'}
                  onClick={() => setIsClientFormExpanded((expanded) => !expanded)}
                  style={styles.expandClientButton}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={isClientFormExpanded ? styles.chevronExpanded : undefined}>
                    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {isClientFormExpanded && <form style={styles.clientFormGrid} onSubmit={handleCreateClient}>
                <div style={styles.inlineField}>
                  <label style={styles.label}>Name</label>
                  <input type="text" name="name" value={clientForm.name} onChange={handleClientInput} style={styles.clientInput} placeholder="John Doe" maxLength={100} required />
                </div>
                <div style={styles.inlineField}>
                  <label style={styles.label}>Email ID</label>
                  <input type="email" name="email_id" value={clientForm.email_id} onChange={handleClientInput} style={styles.clientInput} maxLength={254} placeholder="john@example.com" required />
                </div>
                <div style={styles.inlineField}>
                  <label style={styles.label}>Phone Number</label>
                  <input type="tel" name="phone_number" value={clientForm.phone_number} onChange={handleClientInput} style={styles.clientInput} maxLength={10} placeholder="10 digit phone" required />
                </div>
                <div style={styles.inlineField}>
                  <label style={styles.label}>Conversion Probability (%)</label>
                  <input type="number" min="0" max="100" name="conversion_probability" value={clientForm.conversion_probability} onChange={handleClientInput} style={styles.clientInput} required />
                </div>
                {message.text && (
                  <div style={{ ...message.type === 'success' ? styles.bannerSuccess : styles.bannerError, gridColumn: '1 / -1' }}>
                    {message.text}
                  </div>
                )}

                <div style={{ ...styles.clientFormActions, gridColumn: '1 / -1' }}>
                  <button type="submit" style={clientSubmitting ? { ...styles.primaryBtn, ...styles.primaryBtnDisabled } : styles.primaryBtn} disabled={clientSubmitting}>
                    {clientSubmitting ? 'Saving...' : 'Add Client'}
                  </button>
                </div>
              </form>}
            </div>

            <div style={styles.clientTableCard}>
              <div style={styles.clientFilterBar}>
                <div style={styles.inlineFieldFilter}>
                  <label style={styles.label}>Search</label>
                  <input type="text" name="search" value={clientFilters.search} onChange={handleClientFilterInput} style={styles.clientInput} placeholder="Search all fields" />
                </div>
                <div style={styles.inlineFieldFilter}>
                  <label style={styles.label}>State</label>
                  <StateDropdown name="current_state" value={clientFilters.current_state} onChange={handleClientFilterInput} includeAll />
                </div>
                <div style={styles.inlineFieldFilter}>
                  <label style={styles.label}>Min %</label>
                  <input type="number" name="minProbability" value={clientFilters.minProbability} onChange={handleClientFilterInput} style={styles.clientInput} placeholder="0" min="0" max="100" />
                </div>
                <div style={styles.inlineFieldFilter}>
                  <label style={styles.label}>Max %</label>
                  <input type="number" name="maxProbability" value={clientFilters.maxProbability} onChange={handleClientFilterInput} style={styles.clientInput} placeholder="100" min="0" max="100" />
                </div>
                <div style={styles.filterActionWrap}>
                  <button type="button" onClick={applyClientFilters} style={styles.secondaryBtn}>Apply</button>
                  <button type="button" onClick={clearClientFilters} style={styles.ghostBtn}>Clear</button>
                </div>
              </div>

              <div style={styles.clientTableWrapper}>
                <table style={styles.clientTable}>
                  <colgroup>
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '180px' }} />
                    <col style={{ width: '220px' }} />
                    <col style={{ width: '220px' }} />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '200px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ ...styles.clientTh, ...styles.clientEditCell }}>Action</th>
                      <th style={{ ...styles.clientTh, ...styles.clientIdCell }}>Client ID</th>
                      <th style={{ ...styles.clientTh, ...styles.clientNameCell }}>Name</th>
                      <th style={{ ...styles.clientTh, ...styles.clientEmailCell }}>Email ID</th>
                      <th style={styles.clientTh}>Phone</th>
                      <th style={{ ...styles.clientTh, ...styles.clientStateCell }}>State</th>
                      <th style={styles.clientTh}>Probability</th>
                      <th style={styles.clientTh}>Call Details</th>
                      <th style={styles.clientTh}>Created At</th>
                      <th style={styles.clientTh}>Updated At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsLoading ? (
                      <tr>
                        <td colSpan="10" style={styles.emptyCell}>Loading clients...</td>
                      </tr>
                    ) : clientsData.clients.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={styles.emptyCell}>No clients found.</td>
                      </tr>
                    ) : (
                      clientsData.clients.map((client) => (
                        <tr key={client._id} style={styles.clientRow}>
                          <td style={{ ...styles.clientTd, ...styles.clientEditCell }}>
                            <div style={styles.actionButtons}>
                              <button type="button" onClick={() => openEditClient(client)} style={styles.editClientButton}>Edit</button>
                              <button type="button" onClick={() => openViewClient(client)} style={styles.viewClientButton}>View</button>
                            </div>
                          </td>
                          <td style={{ ...styles.clientTd, ...styles.clientIdCell }}>{client.client_id || '-'}</td>
                          <td style={{ ...styles.clientTd, ...styles.clientNameCell }}>{client.name}</td>
                          <td style={{ ...styles.clientTd, ...styles.clientEmailCell }}>{client.email_id}</td>
                          <td style={{ ...styles.clientTd, ...styles.clientNoWrap }}>{client.phone_number}</td>
                          <td style={{ ...styles.clientTd, ...styles.clientStateCell }}>
                            <span style={{ ...styles.stateBadge, background: getClientStateMeta(client.current_state).bg, color: getClientStateMeta(client.current_state).color }}>
                              {getClientStateMeta(client.current_state).label}
                            </span>
                          </td>
                          <td style={styles.clientTd}>{client.conversion_probability}%</td>
                          <td style={styles.clientTd}>{client.call_details?.length || 0} call(s)</td>
                          <td style={styles.clientTd}>{formatISTDate(client.created_at)}</td>
                          <td style={styles.clientTd}>{formatISTDate(client.updated_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {editingClient && (
                <div style={styles.modalBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeEditClient()}>
                  <div style={styles.clientModal} role="dialog" aria-modal="true" aria-labelledby="edit-client-title">
                    <div style={styles.modalHeader}>
                      <div>
                        <h3 id="edit-client-title" style={styles.cardTitle}>{isClientReadOnly ? 'Client details' : 'Edit client details'}</h3>
                        <p style={styles.cardSubtitle}>{editingClient.name} · {editingClient.email_id} · {editingClient.phone_number}</p>
                      </div>
                      <button type="button" onClick={closeEditClient} style={styles.modalCloseButton} aria-label="Close edit client modal">×</button>
                    </div>

                    <form style={styles.editFormGrid} onSubmit={handleUpdateClient}>
                      <div style={styles.inlineField}>
                        <label style={styles.label}>Current State</label>
                        <StateDropdown name="current_state" value={editForm.current_state} onChange={handleEditInput} disabled={isClientReadOnly} />
                      </div>
                      <div style={styles.inlineField}>
                        <label style={styles.label}>Conversion Probability (%)</label>
                        <input type="number" name="conversion_probability" min="0" max="100" value={editForm.conversion_probability} onChange={handleEditInput} style={styles.clientInput} readOnly={isClientReadOnly} required />
                      </div>
                      {!isClientReadOnly && <div style={styles.modalActions}>
                        <button type="button" onClick={closeEditClient} style={styles.ghostBtn}>Cancel</button>
                        <button type="submit" style={editSubmitting ? { ...styles.primaryBtn, ...styles.primaryBtnDisabled } : styles.primaryBtn} disabled={editSubmitting}>{editSubmitting ? 'Saving...' : 'Save changes'}</button>
                      </div>}
                    </form>

                    <div style={styles.callSection}>
                      <div style={styles.callSectionHeader}>
                        <div>
                          <h4 style={styles.callTitle}>Call details</h4>
                          <p style={styles.cardSubtitle}>{editingClient.call_details?.length || 0} saved call(s)</p>
                        </div>
                        {!isClientReadOnly && <button type="button" onClick={() => setIsCallFormExpanded((expanded) => !expanded)} style={styles.addCallButton} aria-label="Add call details">+</button>}
                      </div>
                      {!isClientReadOnly && isCallFormExpanded && (
                        <form style={styles.callForm} onSubmit={handleAddCall}>
                          <div style={styles.fullWidthField}>
                            <label style={styles.label}>Call notes</label>
                            <textarea name="notes" value={callForm.notes} onChange={handleCallInput} style={styles.clientTextarea} required />
                          </div>
                          <div style={styles.modalActions}>
                            <button type="submit" style={callSubmitting ? { ...styles.primaryBtn, ...styles.primaryBtnDisabled } : styles.primaryBtn} disabled={callSubmitting}>{callSubmitting ? 'Saving...' : 'Save call'}</button>
                          </div>
                        </form>
                      )}
                      {callEdits.length > 0 && (
                        <div style={styles.callList}>
                          {callEdits.map((call) => (
                            <div key={call._id} style={styles.callItem}>
                              <div style={styles.callId}>{call.call_id || 'Call'}</div>
                              <div style={styles.callCaller}>
                                Called by: {call.created_by?.name || call.created_by?.email || 'Unknown user'}
                                {call.created_by?.name && call.created_by?.email ? ` (${call.created_by.email})` : ''}
                              </div>
                              <div style={styles.callCaller}>
                                Called at: {formatISTDate(call.created_at)}
                              </div>
                              <div style={styles.callCaller}>
                                Call notes: <textarea name="notes" value={call.notes} onChange={(event) => handleExistingCallInput(call._id, event)} style={styles.clientTextarea} readOnly={isClientReadOnly} />
                              </div>
                                {!isClientReadOnly && <div style={styles.modalActions}>
                                  <button type="button" onClick={() => handleUpdateCall(call)} style={styles.secondaryBtn} disabled={callSubmitting}>Save call changes</button>
                                </div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {isClientReadOnly && (
                      <div style={styles.auditSection}>
                        <div style={styles.callSectionHeader}>
                          <div>
                            <h4 style={styles.callTitle}>Audit history</h4>
                            <p style={styles.cardSubtitle}>Changes recorded for this client</p>
                          </div>
                        </div>
                        {auditsLoading ? (
                          <div style={styles.emptyCell}>Loading audits...</div>
                        ) : clientAudits.length === 0 ? (
                          <div style={styles.emptyCell}>No audits found.</div>
                        ) : (
                          <div style={styles.auditList}>
                            {clientAudits.map((audit) => (
                              <div key={audit._id} style={styles.auditItem}>
                                <div style={styles.auditItemHeader}>
                                  <strong>{audit.action}</strong>
                                  <span>{formatISTDate(audit.created_at)}</span>
                                </div>
                                  <div style={styles.auditChangeList}>
                                    {(audit.change || []).map((change) => (
                                      <div key={change.attribute} style={styles.auditChange}>
                                        <div style={styles.auditAttribute}>{change.attribute}</div>
                                        <div style={styles.auditValues}>
                                          <span>From: {change.oldValue == null ? '-' : String(change.oldValue)}</span>
                                          <span>To: {change.newValue == null ? '-' : String(change.newValue)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                <div style={styles.auditActor}>By: {audit.performed_by?.name || audit.performed_by?.email || 'System'}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={styles.paginationBar}>
                <button
                  type="button"
                  onClick={() => fetchClients(Math.max(1, clientsData.pagination.page - 1))}
                  disabled={clientsData.pagination.page <= 1 || clientsLoading}
                  style={clientsData.pagination.page <= 1 ? { ...styles.paginationBtn, ...styles.paginationBtnDisabled } : styles.paginationBtn}
                >
                  Previous
                </button>
                <span style={styles.pageInfo}>Page {clientsData.pagination.page} of {clientsData.pagination.totalPages || 1}</span>
                <button
                  type="button"
                  onClick={() => fetchClients(Math.min(clientsData.pagination.totalPages || 1, clientsData.pagination.page + 1))}
                  disabled={clientsData.pagination.page >= (clientsData.pagination.totalPages || 1) || clientsLoading}
                  style={clientsData.pagination.page >= (clientsData.pagination.totalPages || 1) ? { ...styles.paginationBtn, ...styles.paginationBtnDisabled } : styles.paginationBtn}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    fontFamily: "'Inter', -apple-system, sans-serif",
    zoom: '0.96',
  },

  /* Navbar */
  navbar: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 28px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 8px rgba(15,23,42,0.06)',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navLogo: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 10px rgba(79,70,229,0.28)',
  },
  navTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.3px',
  },
  navSep: {
    color: '#cbd5e1',
    margin: '0 8px',
    fontWeight: 300,
  },
  navSection: {
    fontSize: '13.5px',
    fontWeight: 500,
    color: '#64748b',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  /* User chip */
  userChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 14px 6px 8px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '9999px',
  },
  chipAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  chipInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  chipName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.2,
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '10.5px',
    fontWeight: 700,
    letterSpacing: '0.03em',
    lineHeight: 1.4,
  },
  roleDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: '1.5px solid #fca5a5',
    borderRadius: '9999px',
    background: 'transparent',
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },

  /* Container & Sidebar */
  container: {
    display: 'flex',
    minHeight: 'calc(100vh - 64px)',
  },
  sidebar: {
    width: '240px',
    borderRight: '1px solid #e2e8f0',
    background: '#fff',
    padding: '28px 0',
    overflow: 'auto',
  },
  sidebarClosed: {
    width: '68px',
  },
  sidebarHeader: {
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'space-between',
    padding: '0 12px 18px',
  },
  sidebarTitle: {
    color: '#94a3b8',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  sidebarToggle: {
    width: '34px',
    height: '34px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: '9px',
    background: '#f8fafc',
    color: '#475569',
    cursor: 'pointer',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '0 12px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    width: '100%',
    padding: '12px 25px 12px 22px',
    border: 'none',
    borderLeft: '3px solid transparent',
    boxSizing: 'border-box',
    background: 'transparent',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: '10px',
    transition: 'all 150ms ease',
  },
  navItemActive: {
    background: '#eef2ff',
    color: '#4f46e5',
    fontWeight: 600,
    borderLeftColor: '#4f46e5',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    padding: '12px 0',
  },

  /* Main content */
  main: {
    flex: 1,
    padding: '36px 24px',
    height: 'calc(100vh - 64px)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  pageHeader: {
    marginBottom: '28px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.5px',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px',
    fontWeight: 400,
  },
  clientPageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    marginBottom: '0px',
  },
  clientLiveStatus: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  liveMetric: {
    minWidth: '68px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    background: '#fff',
    color: '#334155',
  },
  liveStateMetric: {
    minWidth: '82px',
    border: 'none',
  },
  liveMetricValue: {
    fontSize: '17px',
    lineHeight: 1.1,
    fontWeight: 800,
  },
  liveMetricLabel: {
    marginTop: '4px',
    fontSize: '10px',
    lineHeight: 1.1,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  monitoringWrap: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  monitoringFilters: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 1.5fr) minmax(170px, 1fr) minmax(170px, 1fr) auto',
    gap: '12px',
    alignItems: 'end',
    padding: '18px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    background: '#fff',
  },
  monitoringDateInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: '43px',
    padding: '0 11px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    background: '#f8fafc',
    color: '#64748b',
  },
  monitoringDateInput: {
    width: '100%',
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#0f172a',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  monitoringCard: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '420px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    background: '#fff',
    boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
  },
  monitoringContentGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 260px',
    gap: '20px',
    alignItems: 'start',
  },
  monitoringStatsCard: {
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    background: '#fff',
    boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
  },
  monitoringStatsTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: '16px',
    fontWeight: 750,
  },
  monitoringStatsSubtitle: {
    margin: '5px 0 16px',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.4,
  },
  monitoringStatRow: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 12px',
    borderTop: '1px solid #f1f5f9',
    color: '#475569',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  monitoringStatRowActive: {
    borderRadius: '8px',
    background: '#eef2ff',
    color: '#3730a3',
  },
  clientManagementWrap: {
    display: 'flex',
    flexDirection: 'column',
    height: 'auto',
    minHeight: 0,
  },
  clientFormCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
    marginBottom: '24px',
    flexShrink: 0,
  },
  clientFormCardCollapsed: {
    background: '#fff',
    borderRadius: '20px',
    padding: '16px 24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
    marginBottom: '24px',
    flexShrink: 0,
  },
  clientFormBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  expandClientButton: {
    marginLeft: 'auto',
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #c7d2fe',
    borderRadius: '10px',
    background: '#eef2ff',
    color: '#4f46e5',
    cursor: 'pointer',
  },
  chevronExpanded: {
    transform: 'rotate(180deg)',
  },
  clientFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
    gap: '16px',
  },
  inlineField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fullWidthField: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  clientInput: {
    width: '100%',
    padding: '11px 12px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
  },
  clientSelect: {
    width: '100%',
    padding: '11px 12px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
  },
  stateDropdown: {
    position: 'relative',
    width: '100%',
  },
  stateDropdownTrigger: {
    width: '100%',
    minHeight: '43px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '11px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    background: '#f8fafc',
    color: '#0f172a',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  stateDropdownDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  stateDropdownChevronOpen: {
    transform: 'rotate(180deg)',
  },
  stateDropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '6px',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    background: '#fff',
    boxShadow: '0 12px 24px rgba(15,23,42,0.14)',
  },
  stateDropdownOption: {
    width: '100%',
    padding: '9px 10px',
    border: 'none',
    borderRadius: '8px',
    background: 'transparent',
    color: '#334155',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  stateDropdownOptionActive: {
    background: '#eef2ff',
    color: '#3730a3',
    fontWeight: 700,
  },
  clientTextarea: {
    width: '100%',
    marginTop: '5px',
    minHeight: '84px',
    resize: 'none',
    padding: '11px 12px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: '13px',
    color: '#0f172a',
    outline: 'none',
  },
  readOnlyValue: {
    minHeight: '42px',
    display: 'flex',
    alignItems: 'center',
    padding: '11px 12px',
    borderRadius: '10px',
    background: '#f1f5f9',
    color: '#475569',
    fontSize: '14px',
  },
  clientFormActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  clientTableCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
    flex: 'none',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  clientFilterBar: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 0.7fr 0.7fr auto',
    gap: '12px',
    alignItems: 'end',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  inlineFieldFilter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterActionWrap: {
    display: 'flex',
    gap: '8px',
  },
  secondaryBtn: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #c7d2fe',
    background: '#eef2ff',
    color: '#3730a3',
    fontWeight: 600,
    cursor: 'pointer',
  },
  ghostBtn: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    fontWeight: 600,
    cursor: 'pointer',
  },
  clientTableWrapper: {
    flex: 'none',
    overflowX: 'auto',
    overflowY: 'visible',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    background: '#fff',
  },
  clientTable: {
    width: '100%',
    minWidth: '2400px',
    borderCollapse: 'collapse',
    fontSize: '13px',
    textAlign: 'center',
  },
  clientTh: {
    textAlign: 'center',
    padding: '12px 10px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    color: '#475569',
    fontWeight: 700,
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  clientStateCell: {
    width: '120px',
    minWidth: '120px',
    maxWidth: '120px',
    whiteSpace: 'nowrap',
  },
  clientNameCell: {
    width: '220px',
    minWidth: '220px',
    maxWidth: '220px',
    position: 'sticky',
    left: '300px',
    zIndex: 2,
    background: '#fff',
  },
  clientEditCell: {
    width: '120px',
    minWidth: '120px',
    maxWidth: '120px',
    position: 'sticky',
    left: 0,
    zIndex: 3,
    background: '#fff',
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  clientIdCell: {
    width: '180px',
    minWidth: '180px',
    maxWidth: '180px',
    position: 'sticky',
    left: '120px',
    zIndex: 3,
    background: '#fff',
  },
  clientEmailCell: {
    width: '220px',
    minWidth: '220px',
    maxWidth: '220px',
    position: 'sticky',
    left: '520px',
    zIndex: 2,
    background: '#fff',
  },
  clientTd: {
    padding: '12px 10px',
    borderBottom: '1px solid #f1f5f9',
    color: '#0f172a',
    verticalAlign: 'top',
    wordBreak: 'break-word',
  },
  clientNoWrap: {
    whiteSpace: 'nowrap',
    wordBreak: 'normal',
  },
  editClientButton: {
    padding: '7px 11px',
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
    background: '#eef2ff',
    color: '#3730a3',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  viewClientButton: {
    padding: '7px 11px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: '#f8fafc',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  clientRow: {
    background: '#fff',
  },
  stateBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  },
  emptyCell: {
    textAlign: 'center',
    padding: '20px 12px',
    color: '#64748b',
  },
  paginationBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  paginationBtn: {
    padding: '9px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#0f172a',
  },
  paginationBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '13px',
    color: '#475569',
    fontWeight: 600,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'rgba(15, 23, 42, 0.48)',
  },
  clientModal: {
    width: 'min(680px, 100%)',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
    padding: '24px',
    borderRadius: '18px',
    background: '#fff',
    boxShadow: '0 20px 50px rgba(15,23,42,0.25)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '22px',
  },
  modalCloseButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '8px',
    background: '#f1f5f9',
    color: '#475569',
    fontSize: '22px',
    lineHeight: 1,
    cursor: 'pointer',
  },
  editFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
  },
  modalActions: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  callSection: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  callSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  callTitle: {
    margin: 0,
    fontSize: '15px',
    color: '#0f172a',
  },
  addCallButton: {
    width: '34px',
    height: '34px',
    border: '1px solid #c7d2fe',
    borderRadius: '9px',
    background: '#eef2ff',
    color: '#3730a3',
    fontSize: '22px',
    lineHeight: 1,
    cursor: 'pointer',
  },
  callForm: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginTop: '16px',
    padding: '16px',
    borderRadius: '12px',
    background: '#f8fafc',
  },
  callList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  callItem: {
    padding: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    background: '#fff',
  },
  callId: {
    marginBottom: '10px',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 700,
  },
  callCaller: {
    marginBottom: '12px',
    color: '#64748b',
    fontSize: '12px',
  },
  callEditGrid: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: '12px',
  },
  auditSection: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  auditList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '14px',
  },
  auditItem: {
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    background: '#f8fafc',
  },
  auditItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    color: '#3730a3',
    fontSize: '12px',
  },
  auditAttribute: {
    marginTop: '8px',
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: 700,
  },
  auditChangeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  auditChange: {
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
  },
  auditValues: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginTop: '6px',
    color: '#475569',
    fontSize: '12px',
    wordBreak: 'break-word',
  },
  auditActor: {
    marginTop: '8px',
    color: '#64748b',
    fontSize: '11px',
  },
  auditEntity: {
    marginTop: '8px',
    color: '#64748b',
    fontSize: '12px',
  },
  monitoringStatement: {
    marginTop: '8px',
    color: '#334155',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  userWorkspace: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '20px',
    height: 'calc(100vh - 230px)',
    minHeight: '520px',
  },

  /* Action card */
  card: {
    width: '62%',
    minWidth: '62%',
    background: '#fff',
    borderRadius: '20px',
    padding: '28px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '22px',
  },
  cardIconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.2px',
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '1px',
  },

  managePanel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
  },
  tabColumn: {
    width: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '12px',
    borderRight: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  formPanel: {
    flex: 1,
    minWidth: 0,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '8px',
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 150ms ease',
  },
  verticalTab: {
    justifyContent: 'flex-start',
  },
  tabActive: {
    background: '#eef2ff',
    borderColor: '#c7d2fe',
    color: '#4f46e5',
  },
  verticalTabActive: {
    boxShadow: 'inset 0 0 0 1px rgba(79,70,229,0.12)',
  },

  /* Form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    letterSpacing: '0.01em',
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '13px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '11px 14px 11px 40px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    color: '#0f172a',
    background: '#f8fafc',
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },
  select: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    color: '#0f172a',
    background: '#f8fafc',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },

  /* Banners */
  bannerSuccess: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderLeft: '4px solid #059669',
    fontSize: '13.5px',
    fontWeight: 500,
    color: '#065f46',
    lineHeight: 1.5,
  },
  bannerError: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderLeft: '4px solid #dc2626',
    fontSize: '13.5px',
    fontWeight: 500,
    color: '#b91c1c',
    lineHeight: 1.5,
  },

  /* Primary button */
  primaryBtn: {
    padding: '12px 18px',
    border: 'none',
    borderRadius: '11px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: '#fff',
    fontSize: '14.5px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(79,70,229,0.24)',
    transition: 'transform 150ms ease, box-shadow 150ms ease',
    letterSpacing: '0.01em',
  },
  primaryBtnDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
    transform: 'none !important',
    boxShadow: 'none',
  },
  btnContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    animation: 'spin 0.9s linear infinite',
  },

  /* Info card */
  infoCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
  },
  infoCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  infoIconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: '#f3f0ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
  },
  infoSubtitle: {
    fontSize: '12.5px',
    color: '#94a3b8',
    marginTop: '1px',
  },
  featureList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  featureItem: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  featureDot: {
    color: '#6366f1',
    fontSize: '10px',
    marginTop: '4px',
    flexShrink: 0,
  },
  featureText: {
    fontSize: '13.5px',
    color: '#475569',
    lineHeight: 1.5,
  },
  policyBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    fontSize: '12.5px',
    fontWeight: 500,
    color: '#92400e',
  },

  /* Users Section */
  usersSection: {
    flex: 1,
    minWidth: '32%',
    maxWidth: '38%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  usersHeader: {
    marginBottom: '16px',
    flexShrink: 0,
  },
  usersTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  usersSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '6px 0 0',
  },
  usersListWrapper: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '6px',
  },
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
    transition: 'all 150ms ease',
  },
  userCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  userAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
  },
  userEmail: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  userDates: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '14px',
    paddingBottom: '14px',
    borderBottom: '1px solid #e2e8f0',
  },
  dateLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  userActions: {
    display: 'flex',
    gap: '8px',
  },
  deactivateBtn: {
    flex: 1,
    padding: '9px 12px',
    border: '1.5px solid #ef4444',
    borderRadius: '9px',
    background: '#fff',
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  deactivateBtnDisabled: {
    flex: 1,
    padding: '9px 12px',
    border: '1.5px solid #d1d5db',
    borderRadius: '9px',
    background: '#f3f4f6',
    color: '#9ca3af',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  confirmBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: '#fef2f2',
    borderRadius: '9px',
    border: '1px solid #fecaca',
    fontSize: '12px',
    color: '#b91c1c',
  },
  confirmButtons: {
    display: 'flex',
    gap: '6px',
    marginLeft: 'auto',
  },
  confirmYes: {
    padding: '6px 10px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmNo: {
    padding: '6px 10px',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  loadingText: {
    padding: '24px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
    background: '#f8fafc',
    borderRadius: '12px',
  },
};
