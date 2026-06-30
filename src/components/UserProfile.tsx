import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { saveUser, getUserAttendance } from '../firebase/dbService';
import { AttendanceRecord } from '../types';
import { formatDatePretty } from '../utilities/dateUtils';
import { 
  Shield, Key, Lock, Eye, EyeOff, Sparkles, Phone, 
  MapPin, Mail, Calendar, UserCheck, ShieldAlert, Award, LogOut
} from 'lucide-react';

export default function UserProfile() {
  const { currentUser, setCurrentUser, showToast } = useApp();
  const [personalHistory, setPersonalHistory] = useState<AttendanceRecord[]>([]);
  
  // Custom password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    async function loadStats() {
      if (!currentUser) return;
      try {
        const history = await getUserAttendance(currentUser.id);
        setPersonalHistory(history);
      } catch (e) {
        console.error(e);
      }
    }
    loadStats();
  }, [currentUser]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('All password fields are required.', 'error');
      return;
    }

    if (oldPassword !== currentUser.password) {
      showToast('The old password you entered is incorrect.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password confirmation does not match.', 'error');
      return;
    }

    try {
      setSavingPass(true);
      const updatedUser = {
        ...currentUser,
        password: newPassword
      };
      await saveUser(updatedUser);
      setCurrentUser(updatedUser);
      
      showToast('Security password changed successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast('Failed to update password.', 'error');
    } finally {
      setSavingPass(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('Logged out successfully.', 'info');
  };

  // Calculations
  const totalDays = personalHistory.length;
  const onTimeDays = personalHistory.filter(r => r.status === 'present').length;
  const lateDays = personalHistory.filter(r => r.isLate).length;
  const earlyExits = personalHistory.filter(r => r.isEarlyExit).length;

  return (
    <div className="w-full space-y-6 pb-24 select-none">
      
      {/* Visual Identity Block */}
      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-850 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* Profile Picture */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-red-600/10 blur-md" />
          {currentUser?.photoUrl ? (
            <img
              src={currentUser.photoUrl}
              referrerPolicy="no-referrer"
              alt={currentUser.name}
              className="w-24 h-24 rounded-full object-cover border-2 border-red-600 relative z-10"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-zinc-850 border-2 border-red-600 flex items-center justify-center font-black text-3xl text-zinc-300 relative z-10">
              {(currentUser?.name || '').split(' ').map(n=>n?.[0] || '').join('')}
            </div>
          )}
        </div>

        <h2 className="text-lg font-extrabold text-white tracking-tight">{currentUser?.name}</h2>
        <span className="text-xs text-red-500 font-bold tracking-wider uppercase mt-0.5">{currentUser?.designation}</span>
        <span className="text-[10px] text-zinc-500 font-mono mt-1">{currentUser?.employeeId} • {currentUser?.department}</span>

        {/* Attendance Micro Dashboard */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-6 border-t border-zinc-850 pt-5">
          <div className="bg-black/30 p-2.5 rounded-xl border border-zinc-900 text-center">
            <span className="text-[9px] font-bold text-zinc-500 uppercase">On-Time</span>
            <span className="block text-sm font-black text-emerald-400 mt-1 font-mono">{onTimeDays}</span>
          </div>
          <div className="bg-black/30 p-2.5 rounded-xl border border-zinc-900 text-center">
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Late Days</span>
            <span className="block text-sm font-black text-red-500 mt-1 font-mono">{lateDays}</span>
          </div>
          <div className="bg-black/30 p-2.5 rounded-xl border border-zinc-900 text-center">
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Early Exits</span>
            <span className="block text-sm font-black text-orange-500 mt-1 font-mono">{earlyExits}</span>
          </div>
        </div>
      </div>

      {/* Corporate Metadata details list */}
      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-850 space-y-4.5">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Identity Directory Details</h3>
        
        <div className="space-y-3">
          {/* Email */}
          <div className="flex gap-3 items-center text-left p-3 rounded-2xl bg-black/20 border border-zinc-900">
            <Mail className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-bold block">Email address</span>
              <span className="text-xs text-zinc-300 block">{currentUser?.email || '--'}</span>
            </div>
          </div>

          {/* Phone */}
          <div className="flex gap-3 items-center text-left p-3 rounded-2xl bg-black/20 border border-zinc-900">
            <Phone className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-bold block">Phone number</span>
              <span className="text-xs text-zinc-300 block font-mono">{currentUser?.phone || '--'}</span>
            </div>
          </div>

          {/* Joining date */}
          <div className="flex gap-3 items-center text-left p-3 rounded-2xl bg-black/20 border border-zinc-900">
            <Calendar className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-bold block">Joining date</span>
              <span className="text-xs text-zinc-300 block">{formatDatePretty(currentUser?.joiningDate || '') || '--'}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex gap-3 items-center text-left p-3 rounded-2xl bg-black/20 border border-zinc-900">
            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-bold block">Office location</span>
              <span className="text-xs text-zinc-300 block">{currentUser?.officeLocation || '--'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECURITY: PASSWORD MODIFICATION CARD */}
      <form onSubmit={handlePasswordChange} className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-850 space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Modify Security Keys</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Change security pass used for credentials login</p>
        </div>

        <div className="space-y-3.5">
          {/* Old pass */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Old password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 font-mono"
                placeholder="••••••••"
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New pass */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 font-mono"
                  placeholder="At least 6 chars"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-550 hover:text-zinc-350 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm new pass */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 font-mono"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPass}
          className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 disabled:bg-zinc-900 text-white font-bold text-xs tracking-wide transition-all border border-zinc-750 flex items-center justify-center gap-2"
          id="btn-update-password"
        >
          {savingPass ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Key className="w-3.5 h-3.5 text-red-500" />
              Update Security Credentials
            </>
          )}
        </button>
      </form>

      {/* LOGOUT SECURE ACTION */}
      <button
        onClick={handleLogout}
        className="w-full py-4 rounded-2xl bg-zinc-950/40 hover:bg-red-950/15 text-zinc-400 hover:text-red-400 border border-zinc-900 hover:border-red-900/30 font-black text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
        id="btn-profile-logout"
      >
        <LogOut className="w-4 h-4" />
        SECURELY LOGOUT FROM AMITATEN
      </button>

    </div>
  );
}
