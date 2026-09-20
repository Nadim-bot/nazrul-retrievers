import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, ShieldAlert, Search, Filter, Edit2, Trash2, 
  Key, Activity, CheckCircle, XCircle, AlertTriangle, ChevronDown, 
  UserCheck, MoreVertical, X, Lock, Check, ShieldCheck, Mail, Phone, BookOpen
} from 'lucide-react';
import { apiFetch } from '../utils/api';

interface ModeratorPermissions {
  approve_posts: boolean;
  delete_posts: boolean;
  warn_users: boolean;
  view_audit_logs: boolean;
}

interface Moderator {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  department: string;
  phone?: string;
  session_year?: string;
  avatar?: string;
  assigned_date?: string;
  status?: 'Active' | 'Suspended' | 'Disabled';
  last_login?: string;
  total_verified_claims: number;
  total_approved_listings: number;
  total_rejected_listings: number;
  permissions?: ModeratorPermissions;
}

interface SimpleUser {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  department: string;
  role: string;
  avatar?: string;
}

interface AuditLog {
  id: string;
  adminId: string | number;
  adminName: string;
  action: string;
  description?: string;
  targetType?: string;
  targetId?: string | number;
  ipAddress?: string;
  createdAt: string;
}

interface ModeratorManagementProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ModeratorManagement({ onShowToast }: ModeratorManagementProps) {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isConfirmDemoteOpen, setIsConfirmDemoteOpen] = useState(false);

  // Selected items state
  const [selectedModerator, setSelectedModerator] = useState<Moderator | null>(null);
  const [selectedAuditHistory, setSelectedAuditHistory] = useState<AuditLog[]>([]);
  const [isViewingHistory, setIsViewingHistory] = useState(false);

  // Form Fields
  // 1. Create/Edit Form Fields
  const [moderatorType, setModeratorType] = useState<'student' | 'external'>('student');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [permissions, setPermissions] = useState<ModeratorPermissions>({
    approve_posts: true,
    delete_posts: true,
    warn_users: true,
    view_audit_logs: true
  });

  // 2. Promotion Select Field
  const [studentToPromoteId, setStudentToPromoteId] = useState('');

  // 3. Password Reset Form Fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch all initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get moderators
      const modRes = await apiFetch<{ moderators: Moderator[] }>('/admin/moderators');
      setModerators(modRes.moderators || []);

      // Get users list (to promote)
      const userRes = await apiFetch<{ users: SimpleUser[] }>('/admin/users');
      // Only keep standard student users
      const studentsOnly = (userRes.users || []).filter(u => u.role === 'student');
      setUsers(studentsOnly);

      // Get all activity logs
      const logRes = await apiFetch<{ logs: AuditLog[] }>('/admin/activity-logs');
      setActivityLogs(logRes.logs || []);
    } catch (err: any) {
      console.error('Error fetching moderator management data:', err);
      onShowToast(err.message || 'Failed to load moderator data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter moderators
  const filteredModerators = moderators.filter(mod => {
    const matchesSearch = 
      (mod.full_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (mod.email || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (mod.student_id && (mod.student_id || '').toLowerCase().includes((searchTerm || '').toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || mod.status === statusFilter;
    const matchesDept = deptFilter === 'All' || mod.department === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Get departments lists
  const departments = Array.from(new Set(moderators.map(m => m.department))).filter(Boolean);

  // Handle Create Direct Moderator
  const handleCreateModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanId = studentId.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDept = department.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanId || !cleanEmail || !password || !cleanDept) {
      onShowToast('Please complete all required fields (*).', 'error');
      return;
    }

    if (cleanName.length < 2) {
      onShowToast('Full Name must be at least 2 characters.', 'error');
      return;
    }

    // 1. Validate Registration Number / Employee Code
    if (moderatorType === 'student') {
      const regDigits = cleanId.replace(/\D/g, '');
      if (regDigits.length !== cleanId.length || regDigits.length !== 5) {
        onShowToast('Student Registration Number must be exactly 5 numeric digits (e.g. 21015).', 'error');
        return;
      }
    } else {
      if (cleanId.length < 2) {
        onShowToast('Employee Code / Staff ID must be at least 2 characters (e.g. EMP-001).', 'error');
        return;
      }
    }

    // 1.1 Check ID uniqueness against loaded users/moderators
    const idTakenByUser = users.find(u => {
      const uId = u.studentId || u.student_id || (u as any).employeeCode || (u as any).employee_code;
      return uId && String(uId).trim().toLowerCase() === cleanId.toLowerCase();
    });
    const idTakenByMod = moderators.find(m => {
      const mId = m.studentId || m.student_id || (m as any).employeeCode || (m as any).employee_code;
      return mId && String(mId).trim().toLowerCase() === cleanId.toLowerCase();
    });

    if (idTakenByUser || idTakenByMod) {
      const existingName = (idTakenByUser?.fullName || idTakenByUser?.full_name || idTakenByMod?.full_name || idTakenByMod?.fullName || 'another account');
      onShowToast(
        moderatorType === 'student'
          ? `Registration Number "${cleanId}" is already registered to ${existingName}. Please verify and enter a unique ID.`
          : `Employee Code / Staff ID "${cleanId}" is already in use by ${existingName}. It must be unique across the campus system.`,
        'error'
      );
      return;
    }

    // 2. Validate Email (normal or edu mail format)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      onShowToast('Please enter a valid email address (e.g. name@gmail.com or user@jkkniu.edu).', 'error');
      return;
    }

    // 2.1 Check Email uniqueness against loaded users/moderators
    const emailTaken = users.some(u => u.email && u.email.trim().toLowerCase() === cleanEmail) ||
                       moderators.some(m => m.email && m.email.trim().toLowerCase() === cleanEmail);
    if (emailTaken) {
      onShowToast(`An account with email "${cleanEmail}" already exists in the system.`, 'error');
      return;
    }

    // 3. Validate Password (at least 8 characters, with capital, small, digit, symbol combined)
    if (password.length < 8) {
      onShowToast('Password must be at least 8 characters long.', 'error');
      return;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
      onShowToast('Password must include at least one uppercase letter (A-Z), one lowercase letter (a-z), one number (0-9), and one special symbol (@, #, $, etc.).', 'error');
      return;
    }

    // 4. Validate Department / Office Affiliation
    if (cleanDept.length < 2) {
      onShowToast(moderatorType === 'student' ? 'Please enter a valid Academic Department.' : 'Please enter a valid Office / Cell / Affiliation.', 'error');
      return;
    }

    // 5. Validate Phone (if provided)
    if (cleanPhone && !/^[0-9+\s\-()]{6,20}$/.test(cleanPhone)) {
      onShowToast('Please enter a valid phone number (e.g. +880 1712-XXXXXX).', 'error');
      return;
    }

    try {
      await apiFetch('/admin/moderators', {
        method: 'POST',
        bodyData: {
          fullName: cleanName,
          studentId: cleanId,
          employeeCode: cleanId,
          email: cleanEmail,
          password,
          department: cleanDept,
          phone: cleanPhone,
          permissions,
          moderatorType,
          isExternal: moderatorType === 'external'
        }
      });
      onShowToast(`Coordinator account created successfully for ${cleanName}.`, 'success');
      setIsCreateModalOpen(false);
      // Reset form
      setFullName('');
      setStudentId('');
      setEmail('');
      setPassword('');
      setDepartment('');
      setPhone('');
      setPermissions({
        approve_posts: true,
        delete_posts: true,
        warn_users: true,
        view_audit_logs: true
      });
      fetchData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create coordinator account.', 'error');
    }
  };

  // Handle Promote Student
  const handlePromoteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToPromoteId) {
      onShowToast('Please select a student to promote.', 'error');
      return;
    }

    const targetStudent = users.find(u => u.id === studentToPromoteId);
    if (!targetStudent) return;

    try {
      await apiFetch('/admin/moderators/promote', {
        method: 'POST',
        bodyData: {
          studentId: targetStudent.student_id,
          email: targetStudent.email,
          permissions
        }
      });
      onShowToast(`Successfully elevated ${targetStudent.full_name} to Moderator!`, 'success');
      setIsPromoteModalOpen(false);
      setStudentToPromoteId('');
      setPermissions({
        approve_posts: true,
        delete_posts: true,
        warn_users: true,
        view_audit_logs: true
      });
      fetchData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to promote student.', 'error');
    }
  };

  // Handle Demote Moderator
  const handleDemoteModerator = async () => {
    if (!selectedModerator) return;

    try {
      await apiFetch(`/admin/moderators/${selectedModerator.id}/demote`, {
        method: 'POST'
      });
      onShowToast(`Successfully demoted ${selectedModerator.full_name} to Student role.`, 'success');
      setIsConfirmDemoteOpen(false);
      setSelectedModerator(null);
      fetchData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to demote moderator.', 'error');
    }
  };

  // Handle Delete Moderator
  const handleDeleteModerator = async () => {
    if (!selectedModerator) return;

    try {
      await apiFetch(`/admin/moderators/${selectedModerator.id}`, {
        method: 'DELETE'
      });
      onShowToast(`Permanently deleted Moderator ${selectedModerator.full_name}.`, 'success');
      setIsConfirmDeleteOpen(false);
      setSelectedModerator(null);
      fetchData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to delete account.', 'error');
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModerator) return;

    if (!oldPassword) {
      onShowToast('Please enter the current password for verification.', 'error');
      return;
    }

    if (!newPassword) {
      onShowToast('Please enter a new password.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      onShowToast('New password and confirm password do not match.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      onShowToast('New password must be at least 8 characters long.', 'error');
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
      onShowToast('New password must contain uppercase, lowercase, digit, and special character combinations.', 'error');
      return;
    }

    try {
      await apiFetch(`/admin/moderators/${selectedModerator.id}/reset-password`, {
        method: 'POST',
        bodyData: { oldPassword, newPassword, confirmPassword }
      });
      onShowToast(`Successfully reset password for ${selectedModerator.full_name}.`, 'success');
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to reset password.', 'error');
    }
  };

  // Handle Update Status (Activate, Deactivate/Suspend, Disable)
  const handleStatusChange = async (mod: Moderator, status: 'Active' | 'Suspended' | 'Disabled') => {
    try {
      await apiFetch(`/admin/moderators/${mod.id}/status`, {
        method: 'POST',
        bodyData: { status }
      });
      onShowToast(`Moderator ${mod.full_name} status updated to ${status}.`, 'success');
      fetchData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update moderator status.', 'error');
    }
  };

  // Handle Edit Profile & Permissions
  const handleEditModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModerator) return;

    if (!fullName || !fullName.trim()) {
      onShowToast('Full Name is required.', 'error');
      return;
    }

    if (!department || !department.trim()) {
      onShowToast('Department is required.', 'error');
      return;
    }

    if (phone && phone.trim()) {
      const phoneClean = phone.replace(/[^\d+-\s()]/g, '');
      if (phoneClean !== phone) {
        onShowToast('Please enter a valid phone number format.', 'error');
        return;
      }
    }

    try {
      await apiFetch(`/admin/moderators/${selectedModerator.id}`, {
        method: 'PUT',
        bodyData: {
          fullName: fullName.trim(),
          department: department.trim(),
          phone: phone ? phone.trim() : '',
          permissions
        }
      });
      onShowToast(`Successfully updated details for ${selectedModerator.full_name}.`, 'success');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update moderator profile.', 'error');
    }
  };

  // Open Edit Dialog
  const openEditDialog = (mod: Moderator) => {
    setSelectedModerator(mod);
    setFullName(mod.full_name);
    setDepartment(mod.department);
    setPhone(mod.phone || '');
    setPermissions(mod.permissions || {
      approve_posts: true,
      delete_posts: true,
      warn_users: true,
      view_audit_logs: true
    });
    setIsEditModalOpen(true);
  };

  // Open View History Sidebar
  const viewAuditLogs = (mod: Moderator) => {
    setSelectedModerator(mod);
    // Filter audit logs targeting this user or triggered by this user
    const userLogs = activityLogs.filter(log => {
      const matchTargetId = log.targetId && String(log.targetId) === String(mod.id);
      const matchAdminId = log.adminId && String(log.adminId) === String(mod.id);
      const searchTarget = (log.description || log.action || '').toLowerCase();
      const matchName = searchTarget.includes((mod.full_name || '').toLowerCase());
      const matchEmail = searchTarget.includes((mod.email || '').toLowerCase());
      return matchTargetId || matchAdminId || matchName || matchEmail;
    });
    setSelectedAuditHistory(userLogs);
    setIsViewingHistory(true);
  };

  // Calculate high-level metrics for performance dashboard
  const totalClaimsVerified = moderators.reduce((sum, m) => sum + (m.total_verified_claims || 0), 0);
  const totalListingsApproved = moderators.reduce((sum, m) => sum + (m.total_approved_listings || 0), 0);
  const totalListingsRejected = moderators.reduce((sum, m) => sum + (m.total_rejected_listings || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200" id="moderator-management-container">
      {/* 1. Bento Statistics Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-brand-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <div className="font-serif text-3xl font-black text-brand-navy">{moderators.length}</div>
          <p className="text-xs text-brand-ink2 font-medium uppercase tracking-wider mt-1">Total Moderators</p>
        </div>

        <div className="bg-white border border-brand-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="font-serif text-3xl font-black text-brand-navy">{totalClaimsVerified}</div>
          <p className="text-xs text-brand-ink2 font-medium uppercase tracking-wider mt-1">Claims Verified</p>
        </div>

        <div className="bg-white border border-brand-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="font-serif text-3xl font-black text-brand-navy">{totalListingsApproved}</div>
          <p className="text-xs text-brand-ink2 font-medium uppercase tracking-wider mt-1">Approved Listings</p>
        </div>

        <div className="bg-white border border-brand-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="font-serif text-3xl font-black text-brand-navy">{totalListingsRejected}</div>
          <p className="text-xs text-brand-ink2 font-medium uppercase tracking-wider mt-1">Rejected Listings</p>
        </div>
      </div>

      {/* 2. Control Row with Create and Promote triggers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-navy text-white p-6 rounded-2xl shadow-sm">
        <div>
          <h3 className="font-serif text-lg font-bold text-brand-gold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Moderator Access Directory
          </h3>
          <p className="text-xs text-white/75 mt-1">Create dedicated coordinator accounts or promote active student leaders securely.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button 
            onClick={() => setIsPromoteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl shadow transition-all border border-white/15 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-brand-gold-mid" />
            Promote Student
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-gold to-brand-gold-mid hover:brightness-105 text-[#0D1B2A] font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Direct Create Moderator
          </button>
        </div>
      </div>

      {/* 3. Search and Filtering bar */}
      <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-brand-ink3" />
          <input 
            type="text"
            placeholder="Search coordinators by name, email, or Registration Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-brand-border rounded-xl focus:ring-brand-gold/20 focus:border-brand-gold outline-none text-brand-navy bg-brand-cream/10"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto self-stretch">
          <div className="relative flex-1 md:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-8 py-2.5 text-xs bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-brand-gold/20 focus:border-brand-gold text-brand-navy font-semibold cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Disabled">Disabled</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-3.5 w-3 h-3 text-brand-ink3 pointer-events-none" />
          </div>

          <div className="relative flex-1 md:flex-initial">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-8 py-2.5 text-xs bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-brand-gold/20 focus:border-brand-gold text-brand-navy font-semibold cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-3.5 w-3 h-3 text-brand-ink3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. Moderators Table Registry */}
      <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto"></div>
            <p className="text-xs text-brand-ink2 mt-3 font-semibold">Synchronizing Moderator Registry...</p>
          </div>
        ) : filteredModerators.length === 0 ? (
          <div className="text-center py-16 text-brand-ink2">
            <AlertTriangle className="w-10 h-10 text-brand-gold mx-auto mb-3" />
            <p className="text-base font-bold">No moderators matched query</p>
            <p className="text-xs text-brand-ink3 mt-1">Modify your filters or create a new Moderator to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar touch-scroll rounded-xl border border-brand-border/60">
            <table className="w-full border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-brand-cream/50 border-b border-brand-border/60 text-slate-500 text-left text-xs">
                  <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Moderator Profile</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Reg No &amp; Dept</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-center">Perms</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Performance Stats</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[11px]">Assigned Date</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30 text-sm text-brand-ink">
                {filteredModerators.map(mod => {
                  const initials = mod.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  const perms = mod.permissions || { approve_posts: true, delete_posts: true, warn_users: true, view_audit_logs: true };
                  
                  return (
                    <tr key={mod.id} className="hover:bg-brand-cream/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-navy text-brand-gold font-bold flex items-center justify-center border border-brand-gold/15 shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <span className="block font-bold text-brand-navy text-sm leading-tight">{mod.full_name}</span>
                            <span className="text-[11px] text-brand-ink3 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-brand-gold" />
                              {mod.email}
                            </span>
                            {mod.phone && (
                              <span className="text-[10px] text-brand-ink3 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-brand-gold" />
                                {mod.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="block font-mono text-xs text-brand-navy font-bold">{mod.student_id || 'STAFF-COR'}</span>
                        <span className="block text-xs text-brand-ink2 font-medium mt-0.5 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-brand-gold" />
                          {mod.department}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <span 
                            title={perms.approve_posts ? "Can Approve Posts" : "No Approve Post Perms"} 
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${perms.approve_posts ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
                          >
                            A
                          </span>
                          <span 
                            title={perms.delete_posts ? "Can Delete Posts" : "No Delete Post Perms"} 
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${perms.delete_posts ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
                          >
                            D
                          </span>
                          <span 
                            title={perms.warn_users ? "Can Issue Warnings" : "No Warn User Perms"} 
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${perms.warn_users ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
                          >
                            W
                          </span>
                          <span 
                            title={perms.view_audit_logs ? "Can View Audit Logs" : "No Audit Log Perms"} 
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${perms.view_audit_logs ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
                          >
                            L
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium text-brand-navy">
                        <div className="space-y-0.5">
                          <div>Approved Posts: <strong className="text-emerald-600">{mod.total_approved_listings || 0}</strong></div>
                          <div>Rejected Posts: <strong className="text-red-600">{mod.total_rejected_listings || 0}</strong></div>
                          <div>Verified Claims: <strong className="text-brand-gold-mid">{mod.total_verified_claims || 0}</strong></div>
                          <div className="text-[10px] text-brand-ink3">Last Active: {mod.last_login || 'Never'}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="relative inline-block text-left">
                          <select
                            value={mod.status || 'Active'}
                            onChange={(e) => handleStatusChange(mod, e.target.value as any)}
                            className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider border cursor-pointer outline-none ${
                              mod.status === 'Active' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                : mod.status === 'Suspended' 
                                ? 'bg-amber-50 text-amber-700 border-amber-300' 
                                : 'bg-gray-50 text-gray-700 border-gray-300'
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Disabled">Disabled</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-brand-ink2 font-medium">
                        {mod.assigned_date || 'July 1, 2026'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => openEditDialog(mod)}
                            className="p-2 rounded-lg border border-brand-border hover:bg-brand-gold-light hover:border-brand-gold hover:text-brand-gold text-brand-navy flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Moderator Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => { setSelectedModerator(mod); setIsPasswordModalOpen(true); }}
                            className="p-2 rounded-lg border border-brand-border hover:bg-brand-navy hover:text-white hover:border-brand-navy text-brand-navy flex items-center justify-center transition-colors cursor-pointer"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => viewAuditLogs(mod)}
                            className="p-2 rounded-lg border border-brand-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-brand-navy flex items-center justify-center transition-colors cursor-pointer"
                            title="View Activity Logs"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => { setSelectedModerator(mod); setIsConfirmDemoteOpen(true); }}
                            className="p-2 rounded-lg border border-brand-border hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 text-brand-navy flex items-center justify-center transition-colors cursor-pointer"
                            title="Demote to Student"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => { setSelectedModerator(mod); setIsConfirmDeleteOpen(true); }}
                            className="p-2 rounded-lg border border-brand-border hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-brand-navy flex items-center justify-center transition-colors cursor-pointer"
                            title="Permanently Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. SIDEBAR drawer to view logs */}
      {isViewingHistory && selectedModerator && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-brand-border/40">
              <div>
                <h4 className="font-serif text-lg font-bold text-brand-navy">Moderation History Log</h4>
                <p className="text-xs text-brand-ink2 font-medium mt-0.5">Audit files for {selectedModerator.full_name}</p>
              </div>
              <button 
                onClick={() => setIsViewingHistory(false)}
                className="w-8 h-8 rounded-lg hover:bg-brand-cream flex items-center justify-center text-brand-navy cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 py-4 space-y-4">
              {selectedAuditHistory.length === 0 ? (
                <div className="text-center py-16 text-brand-ink3">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-brand-gold opacity-50" />
                  <p className="font-bold text-xs">No logged moderation activities found</p>
                  <p className="text-[10px] mt-0.5">All actions will be automatically registered in the database audit log.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {selectedAuditHistory.map(log => {
                    const formattedCategory = (log.action || 'system_config')
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <div key={log.id} className="p-3.5 bg-brand-cream/30 border border-brand-border/40 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between font-bold text-brand-navy">
                          <span className="text-brand-gold-mid font-semibold text-[11px] uppercase tracking-wider">{formattedCategory}</span>
                          <span className="text-[10px] text-brand-ink3">{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-brand-ink2 text-[11px] leading-relaxed">{log.description || log.action}</p>
                        <div className="flex justify-between text-[10px] text-brand-ink3 font-mono pt-1 border-t border-brand-border/20">
                          <span>IP: {log.ipAddress || '127.0.0.1'}</span>
                          <span>Device: Web Applet</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALS Section */}

      {/* Modal A: Direct Create Moderator */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[min(calc(100vw-24px),32rem)] overflow-hidden border border-brand-border max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="bg-brand-navy text-white p-5 flex justify-between items-center">
              <h3 className="font-serif text-base font-bold text-brand-gold flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create New Coordinator Account
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCreateModerator} className="p-6 space-y-4">
              {/* Moderator Type Selection */}
              <div className="p-3 bg-brand-cream/60 dark:bg-slate-900/40 rounded-xl border border-brand-border/60">
                <label className="block text-xs font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wider mb-2">
                  Coordinator Category / Role Type *
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    moderatorType === 'student' 
                      ? 'bg-white dark:bg-brand-surface border-brand-gold font-bold text-brand-navy dark:text-brand-gold shadow-2xs' 
                      : 'border-transparent text-brand-ink2 hover:bg-white/50'
                  }`}>
                    <input 
                      type="radio" 
                      name="modType" 
                      checked={moderatorType === 'student'} 
                      onChange={() => setModeratorType('student')}
                      className="accent-brand-gold"
                    />
                    <span>JKKNIU Student Moderator</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    moderatorType === 'external' 
                      ? 'bg-white dark:bg-brand-surface border-brand-gold font-bold text-brand-navy dark:text-brand-gold shadow-2xs' 
                      : 'border-transparent text-brand-ink2 hover:bg-white/50'
                  }`}>
                    <input 
                      type="radio" 
                      name="modType" 
                      checked={moderatorType === 'external'} 
                      onChange={() => setModeratorType('external')}
                      className="accent-brand-gold"
                    />
                    <span>Staff / Faculty / External</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wider">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-brand-border dark:border-brand-border/60 bg-white dark:bg-brand-surface rounded-lg outline-none focus:border-brand-gold text-brand-navy dark:text-slate-100"
                    placeholder={moderatorType === 'student' ? 'e.g. Abdullah Al Mamun' : 'e.g. Ahmed Shuvro'}
                  />
                  <p className="text-[10px] text-brand-ink3">Official full name of coordinator</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wider">
                    {moderatorType === 'student' ? 'Registration Number *' : 'Employee Code / Staff ID *'}
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-brand-border dark:border-brand-border/60 bg-white dark:bg-brand-surface rounded-lg outline-none focus:border-brand-gold text-brand-navy dark:text-slate-100 uppercase"
                    placeholder={moderatorType === 'student' ? 'e.g. 21015 (5 digits)' : 'e.g. EMP-001, STAFF-01'}
                  />
                  <p className="text-[10px] text-brand-ink3">
                    {moderatorType === 'student' ? 'Must be 5 digits and unique' : 'Unique institutional employee code'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wider">Email Address *</label>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-brand-border dark:border-brand-border/60 bg-white dark:bg-brand-surface rounded-lg outline-none focus:border-brand-gold text-brand-navy dark:text-slate-100"
                    placeholder="name@gmail.com or @jkkniu.edu"
                  />
                  <p className="text-[10px] text-brand-ink3">Must be a unique email address</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wider">Password *</label>
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-brand-border dark:border-brand-border/60 bg-white dark:bg-brand-surface rounded-lg outline-none focus:border-brand-gold text-brand-navy dark:text-slate-100"
                    placeholder="Min 8 chars, A-z, 0-9, @"
                  />
                  <p className="text-[10px] text-brand-ink3">8+ chars (A-Z, a-z, 0-9, special char)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wider">
                    {moderatorType === 'student' ? 'Academic Department *' : 'Office / Cell / Affiliation *'}
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-brand-border dark:border-brand-border/60 bg-white dark:bg-brand-surface rounded-lg outline-none focus:border-brand-gold text-brand-navy dark:text-slate-100"
                    placeholder={moderatorType === 'student' ? 'e.g. Computer Science (CSE)' : 'e.g. Proctor Office / IT Cell'}
                  />
                  <p className="text-[10px] text-brand-ink3">
                    {moderatorType === 'student' ? 'University department affiliation' : 'Assigned campus unit/office'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-navy dark:text-slate-200 uppercase tracking-wider">Phone Number (Optional)</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-brand-border dark:border-brand-border/60 bg-white dark:bg-brand-surface rounded-lg outline-none focus:border-brand-gold text-brand-navy dark:text-slate-100"
                    placeholder="+880 1712-XXXXXX"
                  />
                  <p className="text-[10px] text-brand-ink3">For emergency contact (optional)</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-brand-border/40 pt-4">
                <label className="block text-xs font-black text-brand-navy uppercase tracking-widest">Moderation Access Roles &amp; RBAC *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.approve_posts}
                      onChange={(e) => setPermissions({...permissions, approve_posts: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    Approve/Reject Posts
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.delete_posts}
                      onChange={(e) => setPermissions({...permissions, delete_posts: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    Delete/Archive Posts
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.warn_users}
                      onChange={(e) => setPermissions({...permissions, warn_users: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    Issue Warns / Suspend Students
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.view_audit_logs}
                      onChange={(e) => setPermissions({...permissions, view_audit_logs: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    View System Audit Logs
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-brand-border rounded-xl text-xs font-bold text-brand-navy hover:bg-brand-cream transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-brand-navy text-white hover:bg-brand-navy/90 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Create Coordinator Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal B: Promote Student to Moderator */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[min(calc(100vw-24px),28rem)] overflow-hidden border border-brand-border max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="bg-brand-navy text-white p-5 flex justify-between items-center">
              <h3 className="font-serif text-base font-bold text-brand-gold flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Promote Student to Moderator
              </h3>
              <button onClick={() => setIsPromoteModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handlePromoteStudent} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider">Select Student Account *</label>
                {users.length === 0 ? (
                  <p className="text-xs text-rose-600 font-semibold italic bg-rose-50 p-2.5 rounded-lg">No active student accounts available to promote in memory store.</p>
                ) : (
                  <select 
                    required
                    value={studentToPromoteId}
                    onChange={(e) => setStudentToPromoteId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-brand-border rounded-lg bg-white outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="">-- Choose student from directory --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.student_id || 'ID N/A'}) - {u.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2 border-t border-brand-border/40 pt-4">
                <label className="block text-xs font-black text-brand-navy uppercase tracking-widest">Assign RBAC Access Keys *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.approve_posts}
                      onChange={(e) => setPermissions({...permissions, approve_posts: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    Approve/Reject Posts
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.delete_posts}
                      onChange={(e) => setPermissions({...permissions, delete_posts: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    Delete/Archive Posts
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.warn_users}
                      onChange={(e) => setPermissions({...permissions, warn_users: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    Issue Warns / Suspend Students
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.view_audit_logs}
                      onChange={(e) => setPermissions({...permissions, view_audit_logs: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    View System Audit Logs
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="px-4 py-2 border border-brand-border rounded-xl text-xs font-bold text-brand-navy hover:bg-brand-cream transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={users.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-brand-gold to-brand-gold-mid text-[#0D1B2A] hover:brightness-105 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  Promote to Coordinator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal C: Edit Profile & Permissions */}
      {isEditModalOpen && selectedModerator && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[min(calc(100vw-24px),28rem)] overflow-hidden border border-brand-border max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="bg-brand-navy text-white p-5 flex justify-between items-center">
              <h3 className="font-serif text-base font-bold text-brand-gold flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Moderator Profile
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleEditModerator} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider">Full Name *</label>
                <input 
                  type="text" 
                  required 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border rounded-lg outline-none focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider">Department *</label>
                <input 
                  type="text" 
                  required 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border rounded-lg outline-none focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider">Phone Number</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border rounded-lg outline-none focus:border-brand-gold"
                />
              </div>

              <div className="space-y-2 border-t border-brand-border/40 pt-4">
                <label className="block text-xs font-black text-brand-navy uppercase tracking-widest">Update RBAC Permissions *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.approve_posts}
                      onChange={(e) => setPermissions({...permissions, approve_posts: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    Approve/Reject Posts
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.delete_posts}
                      onChange={(e) => setPermissions({...permissions, delete_posts: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    Delete/Archive Posts
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.warn_users}
                      onChange={(e) => setPermissions({...permissions, warn_users: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    Issue Warns / Suspend Students
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-navy font-semibold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permissions.view_audit_logs}
                      onChange={(e) => setPermissions({...permissions, view_audit_logs: e.target.checked})}
                      className="rounded text-brand-gold focus:ring-brand-gold/20" 
                    />
                    View System Audit Logs
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-brand-border rounded-xl text-xs font-bold text-brand-navy hover:bg-brand-cream transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-brand-navy text-white hover:bg-brand-navy/90 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal D: Password Reset */}
      {isPasswordModalOpen && selectedModerator && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[min(calc(100vw-24px),24rem)] overflow-hidden border border-brand-border max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="bg-brand-navy text-white p-5 flex justify-between items-center">
              <h3 className="font-serif text-base font-bold text-brand-gold flex items-center gap-2">
                <Key className="w-4 h-4" />
                Reset Account Password
              </h3>
              <button 
                onClick={() => { 
                  setIsPasswordModalOpen(false); 
                  setOldPassword('');
                  setNewPassword(''); 
                  setConfirmPassword('');
                }} 
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-xs text-brand-ink2 leading-relaxed">
                Reset password securely for coordinator <strong>{selectedModerator.full_name}</strong>.
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider">Old/Current Password *</label>
                <input 
                  type="password" 
                  required 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border rounded-lg outline-none focus:border-brand-gold"
                  placeholder="Verify old password"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider">New Password *</label>
                <input 
                  type="password" 
                  required 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border rounded-lg outline-none focus:border-brand-gold"
                  placeholder="Min 8 chars, A-z, 0-9, @"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-navy uppercase tracking-wider">Confirm New Password *</label>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border rounded-lg outline-none focus:border-brand-gold"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => { 
                    setIsPasswordModalOpen(false); 
                    setOldPassword('');
                    setNewPassword(''); 
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 border border-brand-border rounded-xl text-xs font-bold text-brand-navy hover:bg-brand-cream transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-brand-navy text-white hover:bg-brand-navy/90 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal E: Confirm Demote */}
      {isConfirmDemoteOpen && selectedModerator && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[min(calc(100vw-24px),24rem)] overflow-hidden border border-brand-border p-5 sm:p-6 text-center space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-brand-navy">Confirm Role Demotion</h3>
              <p className="text-xs text-brand-ink2 leading-relaxed">
                Are you sure you want to demote <strong>{selectedModerator.full_name}</strong> back to a standard Student account? This will revoke all administrative approval permissions immediately.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button 
                onClick={() => { setIsConfirmDemoteOpen(false); setSelectedModerator(null); }}
                className="px-4 py-2 border border-brand-border rounded-xl text-xs font-bold text-brand-navy hover:bg-brand-cream transition-colors cursor-pointer"
              >
                No, Keep Coordinator
              </button>
              <button 
                onClick={handleDemoteModerator}
                className="px-5 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Yes, Demote Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal F: Confirm Delete */}
      {isConfirmDeleteOpen && selectedModerator && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[min(calc(100vw-24px),24rem)] overflow-hidden border border-brand-border p-5 sm:p-6 text-center space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-brand-navy text-red-600">Delete Coordinator Account?</h3>
              <p className="text-xs text-brand-ink2 leading-relaxed">
                This will **permanently delete** the moderator account for <strong>{selectedModerator.full_name}</strong> from the database. This action is irreversible.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button 
                onClick={() => { setIsConfirmDeleteOpen(false); setSelectedModerator(null); }}
                className="px-4 py-2 border border-brand-border rounded-xl text-xs font-bold text-brand-navy hover:bg-brand-cream transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteModerator}
                className="px-5 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Yes, Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
