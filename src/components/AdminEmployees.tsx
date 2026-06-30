import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { saveUser, deleteUser } from '../firebase/dbService';
import { uploadToCloudinary } from '../cloudinary/upload';
import { User, UserRole } from '../types';
import UserIdCard from './UserIdCard';
import { 
  Plus, Edit, Trash2, ShieldAlert, BadgeCheck, Check, 
  X, Image as ImageIcon, QrCode, CreditCard, Search, ArrowLeft, RefreshCw
} from 'lucide-react';

export default function AdminEmployees() {
  const { usersList, refreshUsers, companySettings, showToast, showConfirm } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Modal control
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    photoUrl: '',
    role: 'user' as UserRole,
    department: 'Store 1',
    designation: 'Sales Executive',
    employeeId: '',
    joiningDate: '',
    shiftTiming: '09:30 AM - 07:30 PM',
    officeLocation: 'Store 1',
    emergencyContact: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    // Generate a new temporary unique Employee ID
    const nextEmpId = `EMP-${String(usersList.length + 101).padStart(3, '0')}`;
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      photoUrl: '',
      role: 'user',
      department: 'Store 1',
      designation: 'Sales Executive',
      employeeId: nextEmpId,
      joiningDate: new Date().toISOString().split('T')[0],
      shiftTiming: '09:30 AM - 07:30 PM',
      officeLocation: 'Store 1',
      emergencyContact: ''
    });
    setIsFormOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      password: user.password || '',
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      photoUrl: user.photoUrl || '',
      role: user.role || 'user',
      department: user.department || 'Store 1',
      designation: user.designation || 'Sales Executive',
      employeeId: user.employeeId || '',
      joiningDate: user.joiningDate || '',
      shiftTiming: user.shiftTiming || '09:30 AM - 07:30 PM',
      officeLocation: user.officeLocation || 'Store 1',
      emergencyContact: user.emergencyContact || ''
    });
    setIsFormOpen(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      showToast('Uploading profile image to Cloudinary...', 'info');
      const url = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, photoUrl: url }));
      showToast('Profile image uploaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Image upload failed. Try a smaller file or different image.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.username || !formData.employeeId) {
      showToast('Name, username, and Employee ID are strictly required.', 'error');
      return;
    }

    // Verify username duplicates
    const isDuplicate = usersList.some(
      u => u.username && u.username.toLowerCase() === formData.username.trim().toLowerCase() && (!editingUser || u.id !== editingUser.id)
    );
    if (isDuplicate) {
      showToast('Username already taken. Please enter a different username.', 'error');
      return;
    }

    try {
      const targetId = editingUser ? editingUser.id : `user_${Date.now()}`;
      
      const updatedUser: User = {
        id: targetId,
        username: formData.username.trim(),
        password: formData.password || 'password123', // Default fallback pass
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        photoUrl: formData.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80',
        role: formData.role,
        department: formData.department,
        designation: formData.designation,
        employeeId: formData.employeeId.trim(),
        joiningDate: formData.joiningDate,
        shiftTiming: formData.shiftTiming,
        officeLocation: formData.officeLocation,
        status: editingUser ? editingUser.status : 'enabled',
        qrCodeData: targetId, // Unique ID for QR Login
        emergencyContact: formData.emergencyContact.trim(),
        createdAt: editingUser ? editingUser.createdAt : Date.now()
      };

      await saveUser(updatedUser);
      showToast(editingUser ? 'Employee record updated!' : 'New Employee created successfully!', 'success');
      setIsFormOpen(false);
      refreshUsers();
    } catch (err) {
      console.error(err);
      showToast('Could not save employee details.', 'error');
    }
  };

  const toggleUserStatus = async (user: User) => {
    const nextStatus: 'enabled' | 'disabled' = user.status === 'enabled' ? 'disabled' : 'enabled';
    const actionLabel = nextStatus === 'enabled' ? 'Enable' : 'Disable';

    showConfirm(
      `${actionLabel} Staff Account?`,
      `Are you sure you want to ${actionLabel.toLowerCase()} ${user.name}? This will affect their ability to log in.`,
      async () => {
        try {
          const updated = { ...user, status: nextStatus };
          await saveUser(updated);
          showToast(`Employee ${user.name} has been ${nextStatus}d.`, 'success');
          refreshUsers();
        } catch (err) {
          showToast('Failed to modify account status.', 'error');
        }
      }
    );
  };

  const handleDeleteUser = (user: User) => {
    showConfirm(
      'Permanent Deletion Warning',
      `This will completely erase ${user.name} and all their attendance history. This action is irreversible. Proceed?`,
      async () => {
        try {
          await deleteUser(user.id);
          showToast('Employee records successfully deleted.', 'success');
          refreshUsers();
        } catch (e) {
          showToast('Delete operation failed.', 'error');
        }
      }
    );
  };

  const regenerateQR = async (user: User) => {
    // Generates a new random security hash for login
    const newQRData = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    try {
      const updated = { ...user, qrCodeData: newQRData };
      await saveUser(updated);
      showToast('QR Code Login Badge regenerated successfully!', 'success');
      refreshUsers();
      if (viewingUser?.id === user.id) {
        setViewingUser(updated);
      }
    } catch (e) {
      showToast('QR regeneration failed.', 'error');
    }
  };

  // Filter employees
  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(q) ||
      (u.employeeId || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(searchQuery) ||
      (u.email || '').toLowerCase().includes(q);
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="w-full space-y-6 pb-24">
      
      {/* Filters & Actions Container */}
      <div className="p-5 rounded-3xl bg-zinc-900/40 border border-zinc-850 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">Staff Directories</h2>
            <p className="text-xs text-zinc-500">Add, edit, manage, and print badges for your staff</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all active:scale-95 shadow-lg shadow-red-600/10"
            id="btn-create-employee"
          >
            <Plus className="w-4.5 h-4.5" />
            Add New Employee
          </button>
        </div>

        {/* Filters form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by ID, Name, Dept, Phone, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black/40 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 transition-colors"
              id="input-staff-search"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full px-4 py-3 bg-black/40 border border-zinc-850 rounded-xl text-xs font-bold text-zinc-400 focus:outline-none focus:border-red-600 appearance-none"
              id="select-role-filter"
            >
              <option value="all" className="bg-zinc-900 text-white">All Roles</option>
              <option value="admin" className="bg-zinc-900 text-white">Admins</option>
              <option value="user" className="bg-zinc-900 text-white">Regular Staff</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-3 bg-black/40 border border-zinc-850 rounded-xl text-xs font-bold text-zinc-400 focus:outline-none focus:border-red-600 appearance-none"
              id="select-status-filter"
            >
              <option value="all" className="bg-zinc-900 text-white">All Statuses</option>
              <option value="enabled" className="bg-zinc-900 text-emerald-400">Enabled accounts</option>
              <option value="disabled" className="bg-zinc-900 text-red-400">Disabled accounts</option>
            </select>
          </div>
        </div>
      </div>

      {/* DIRECTORY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-16 border border-dashed border-zinc-850 rounded-3xl bg-zinc-950/20">
            <p className="text-sm text-zinc-500 font-bold mb-1">No employees found</p>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto">Create employees or adjust filters to search again.</p>
          </div>
        ) : (
          filteredUsers.map(user => (
            <div 
              key={user.id} 
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-5 relative overflow-hidden ${
                user.status === 'disabled' 
                  ? 'bg-zinc-950/40 border-zinc-900 opacity-60' 
                  : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-800'
              }`}
            >
              {/* Badge indicators */}
              <div className="absolute top-4 right-4 flex gap-1.5 z-10">
                {user.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-600/10 text-red-500 border border-red-500/20">
                    Admin
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                  user.status === 'enabled' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {user.status}
                </span>
              </div>

              {/* Identity Header */}
              <div className="flex gap-4 items-center">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    referrerPolicy="no-referrer"
                    alt={user.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-zinc-800"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center font-black text-lg text-zinc-300">
                    {(user.name || '').split(' ').map(n=>n?.[0] || '').join('')}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-extrabold text-white truncate max-w-[150px]">{user.name}</h4>
                  <span className="text-[10px] text-zinc-400 block font-bold">{user.designation}</span>
                  <span className="text-[9px] text-zinc-500 font-mono tracking-wide mt-0.5 block">{user.employeeId} • {user.department}</span>
                </div>
              </div>

              {/* Meta information details */}
              <div className="grid grid-cols-2 gap-y-2 text-[10px] bg-black/25 p-3 rounded-xl border border-zinc-900/60 font-medium">
                <div>
                  <span className="text-zinc-600 block">Phone</span>
                  <span className="text-zinc-300 truncate block">{user.phone || '--'}</span>
                </div>
                <div>
                  <span className="text-zinc-600 block">Office Site</span>
                  <span className="text-zinc-300 truncate block">{user.officeLocation || '--'}</span>
                </div>
                <div>
                  <span className="text-zinc-600 block">Shift</span>
                  <span className="text-zinc-300 truncate block font-mono">{user.shiftTiming || '--'}</span>
                </div>
                <div>
                  <span className="text-zinc-600 block">Username</span>
                  <span className="text-zinc-300 truncate block font-mono">{user.username}</span>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex gap-2.5 border-t border-zinc-900/80 pt-4.5">
                <button
                  onClick={() => {
                    setViewingUser(user);
                    setIsCardOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white text-[10px] font-bold tracking-wide transition-all active:scale-95"
                  id={`btn-view-id-${user.id}`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-red-500" />
                  ID Card
                </button>

                <button
                  onClick={() => openEditModal(user)}
                  className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white transition-all active:scale-95"
                  id={`btn-edit-employee-${user.id}`}
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => toggleUserStatus(user)}
                  className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                    user.status === 'enabled' 
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25' 
                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-750'
                  }`}
                  id={`btn-toggle-status-${user.id}`}
                >
                  {user.status === 'enabled' ? <BadgeCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                </button>

                {user.role !== 'admin' && (
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="p-2.5 rounded-xl bg-red-600/10 text-red-400 hover:bg-red-600/20 transition-all active:scale-95"
                    id={`btn-delete-employee-${user.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FORM BOTTOM-SHEET / MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-y-auto max-h-[90vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-850 mb-5">
              <div>
                <h3 className="text-base font-extrabold text-white">{editingUser ? 'Modify Employee Profile' : 'Register New Employee'}</h3>
                <p className="text-[11px] text-zinc-500">Configure corporate identity and login credentials</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Picture Upload Section */}
            <div className="flex items-center gap-4 mb-6 bg-black/30 p-4 rounded-2xl border border-zinc-850/60">
              <div className="relative shrink-0">
                {formData.photoUrl ? (
                  <img src={formData.photoUrl} referrerPolicy="no-referrer" className="w-16 h-16 rounded-2xl object-cover border border-zinc-800" alt="Avatar Preview" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/80 rounded-2xl flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-white block mb-1">Corporate Badge Image</span>
                <p className="text-[10px] text-zinc-500 mb-2">JPG, PNG uploaded securely to Cloudinary storage</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-[10px] font-bold text-white transition-colors"
                >
                  Choose Image
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Form details */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
                    placeholder="Amit Kumar"
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Employee ID (Unique)</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-600 transition-colors"
                    placeholder="EMP-003"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Username (Login ID)</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-600 transition-colors"
                    placeholder="amit_kumar"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Security Password</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-red-600 transition-colors"
                    placeholder="Leave empty for 'password123'"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Store Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Store</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value, officeLocation: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 appearance-none cursor-pointer"
                  >
                    <option value="Store 1" className="bg-zinc-900 text-white">Store 1</option>
                    <option value="Store 2" className="bg-zinc-900 text-white">Store 2</option>
                    <option value="Store 3" className="bg-zinc-900 text-white">Store 3</option>
                  </select>
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Designation</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 appearance-none cursor-pointer"
                  >
                    <option value="Sales Executive" className="bg-zinc-900 text-white">Sales Executive</option>
                    <option value="Manager" className="bg-zinc-900 text-white">Manager</option>
                    <option value="Technician" className="bg-zinc-900 text-white">Technician</option>
                    <option value="Office Attendant" className="bg-zinc-900 text-white">Office Attendant</option>
                    <option value="Director" className="bg-zinc-900 text-white">Director</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Corporate Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                    placeholder="amit@amitaten.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Shift timing */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Shift schedule</label>
                  <input
                    type="text"
                    value={formData.shiftTiming}
                    onChange={(e) => setFormData(prev => ({ ...prev, shiftTiming: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                    placeholder="09:30 AM - 07:30 PM"
                  />
                </div>

                {/* Office site location */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Office Location</label>
                  <select
                    value={formData.officeLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, officeLocation: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 appearance-none cursor-pointer"
                  >
                    <option value="Store 1" className="bg-zinc-900 text-white">Store 1</option>
                    <option value="Store 2" className="bg-zinc-900 text-white">Store 2</option>
                    <option value="Store 3" className="bg-zinc-900 text-white">Store 3</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Joining date */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* Emergency contact info */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Emergency Contact Details</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                    placeholder="Wife: Mary Kumar (+91 99999 11111)"
                  />
                </div>
              </div>

              {/* Physical Address */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Residential Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 h-16 resize-none"
                  placeholder="Street 4, Sector B, Kishanganj"
                />
              </div>

              {/* Role Assignment */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">System Privilege Role</label>
                <div className="flex p-1 bg-black/40 rounded-xl border border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      formData.role === 'user' ? 'bg-zinc-800 text-white' : 'text-zinc-500'
                    }`}
                  >
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      formData.role === 'admin' ? 'bg-red-600 text-white' : 'text-zinc-500'
                    }`}
                  >
                    System Admin
                  </button>
                </div>
              </div>

              {/* Submit panel */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-extrabold text-xs tracking-wider"
                  id="btn-save-employee"
                >
                  {editingUser ? 'Save Updates' : 'Add Employee'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* VIEW ID CARD MODAL */}
      {isCardOpen && viewingUser && companySettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl relative max-h-[95vh] overflow-y-auto animate-scale-up">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850 mb-5">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-widest">Employee Identification Card</h3>
                <p className="text-[10px] text-zinc-500">QR reader & barcode printed ready</p>
              </div>
              <button
                onClick={() => setIsCardOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Render ID Card Component */}
            <UserIdCard user={viewingUser} settings={companySettings} />

            <div className="mt-6 flex flex-col items-center gap-2 text-center text-[10px] text-zinc-500 bg-black/30 p-3 rounded-2xl border border-zinc-900">
              <span className="font-bold text-zinc-400 uppercase">Interactive Verification QR</span>
              <p className="leading-normal">Regenerate security keys to lock/reset login capabilities. Regenerating will instantly update their physical badge requirements.</p>
              <button
                onClick={() => regenerateQR(viewingUser)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-300 hover:text-white transition-all mt-1"
                id="btn-regenerate-qr"
              >
                <RefreshCw className="w-3 h-3 text-red-500" />
                Regenerate Security QR Code
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
