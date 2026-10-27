import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Stethoscope,
  Microscope,
  HeartHandshake,
  Shield
} from 'lucide-react';
import { adminService } from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve administrative user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (userId, newStatus) => {
    setActionLoading(userId);
    setError('');
    setSuccessMsg('');
    try {
      const updated = await adminService.approveUser(userId, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updated } : u))
      );
      setSuccessMsg(
        `User ${updated.full_name || updated.email} successfully updated to '${newStatus}'.`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || `Failed to update user approval status to ${newStatus}.`);
    } finally {
      setActionLoading(null);
    }
  };

  // Stats calculation
  const totalUsers = users.length;
  const pendingCount = users.filter((u) => u.approval_status === 'pending').length;
  const approvedCount = users.filter((u) => u.approval_status === 'approved').length;
  const rejectedCount = users.filter((u) => u.approval_status === 'rejected').length;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q));

    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.approval_status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor':
        return <Stethoscope className="w-3.5 h-3.5 text-blue-500" />;
      case 'researcher':
        return <Microscope className="w-3.5 h-3.5 text-teal-500" />;
      case 'patient':
        return <HeartHandshake className="w-3.5 h-3.5 text-emerald-500" />;
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Users className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              System Administration
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Admin Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Manage user accounts, review pending clinician & researcher credentials, and control role-based access.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] transition-all cursor-pointer shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)] mb-1">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--color-text-primary)]">
            {totalUsers}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
            All registered platform users
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-amber-200 dark:border-amber-900/50 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">
            {pendingCount}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
            {pendingCount > 0 ? 'Requires administrative approval' : 'All accounts reviewed'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
            <span>Approved Roles</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
            {approvedCount}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
            Full clinical/research clearance
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)] mb-1">
            <span>Rejected / Restricted</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--color-text-primary)]">
            {rejectedCount}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
            Gated from privileged actions
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors (Clinicians)</option>
            <option value="researcher">Researchers</option>
            <option value="patient">Patients</option>
            <option value="admin">Administrators</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] ml-2">
            <span className="font-semibold">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
            User Directory ({filteredUsers.length} shown)
          </h2>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Click 'Approve' to grant clinician/researcher access to privileged endpoints.
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
            <span>Loading user directory...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--color-text-muted)]">
            No user accounts match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] font-bold uppercase tracking-wider border-b border-[var(--color-border-subtle)] text-[10px]">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Approval Status</th>
                  <th className="px-6 py-3">Account Status</th>
                  <th className="px-6 py-3 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {filteredUsers.map((u) => {
                  const isPending = u.approval_status === 'pending';
                  const isApproved = u.approval_status === 'approved';
                  const isRejected = u.approval_status === 'rejected';
                  const isSelfAdmin = u.role === 'admin';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-[var(--color-surface-hover)] transition-colors ${
                        isPending ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--color-text-primary)]">
                              {u.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] capitalize">
                          {getRoleIcon(u.role)}
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`text-[11px] font-medium ${
                            u.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isSelfAdmin ? (
                          <span className="text-[11px] text-[var(--color-text-muted)] italic">
                            System Administrator
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-2 justify-end">
                            {(!isApproved || isPending) && (
                              <button
                                type="button"
                                disabled={actionLoading === u.id}
                                onClick={() => handleUpdateStatus(u.id, 'approved')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{actionLoading === u.id ? 'Updating...' : 'Approve'}</span>
                              </button>
                            )}

                            {(!isRejected || isPending) && (
                              <button
                                type="button"
                                disabled={actionLoading === u.id}
                                onClick={() => handleUpdateStatus(u.id, 'rejected')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
