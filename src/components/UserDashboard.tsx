import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { performTapIn, performTapOut, getTodayUserAttendance, getUserAttendance } from '../firebase/dbService';
import { getLocalDateString, formatTime, formatDuration, formatDatePretty } from '../utilities/dateUtils';
import { AttendanceRecord } from '../types';
import { Play, Square, Clock, Calendar, Shield, Award, AlertCircle, TrendingUp, Compass } from 'lucide-react';

export default function UserDashboard() {
  const { currentUser, companySettings, showToast } = useApp();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [personalHistory, setPersonalHistory] = useState<AttendanceRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Running work hours timer
  const [activeWorkHours, setActiveWorkHours] = useState('0h 0m 0s');

  useEffect(() => {
    // Dynamic Clock
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's and recent attendance
  const loadAttendance = async () => {
    if (!currentUser) return;
    try {
      const today = await getTodayUserAttendance(currentUser.id);
      setTodayRecord(today);
      
      const history = await getUserAttendance(currentUser.id);
      // Sort history descending by date
      setPersonalHistory(history.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [currentUser]);

  // Active duration counter (triggers only when tapped in but not out)
  useEffect(() => {
    if (!todayRecord || todayRecord.tapOutTime) {
      setActiveWorkHours('0h 0m 0s');
      return;
    }

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - todayRecord.tapInTime;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setActiveWorkHours(`${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [todayRecord]);

  const handleTapIn = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const record = await performTapIn(
        currentUser.id,
        currentUser.name,
        currentUser.employeeId,
        currentUser.department
      );
      setTodayRecord(record);
      showToast('Tapped In successfully! Work session started.', 'success');
      loadAttendance();
    } catch (err: any) {
      showToast(err.message || 'Failed to Tap In', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTapOut = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const record = await performTapOut(currentUser.id);
      setTodayRecord(record);
      showToast('Tapped Out successfully! Work session ended.', 'success');
      loadAttendance();
    } catch (err: any) {
      showToast(err.message || 'Failed to Tap Out', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Quick Stats for Personal Hub
  const totalDays = personalHistory.length;
  const presentDays = personalHistory.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'early_exit').length;
  const lateDays = personalHistory.filter(r => r.isLate).length;
  const earlyExits = personalHistory.filter(r => r.isEarlyExit).length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  return (
    <div className="w-full space-y-6 pb-24">
      
      {/* Visual Welcome Card */}
      <div className="relative p-6 rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-850 overflow-hidden shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Decorative backdrop */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="relative">
            {currentUser?.photoUrl ? (
              <img
                src={currentUser.photoUrl}
                referrerPolicy="no-referrer"
                alt={currentUser.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-red-600"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-red-600 flex items-center justify-center font-black text-xl text-zinc-300">
                {(currentUser?.name || '').split(' ').map(n => n?.[0] || '').join('')}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-900" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold block">Welcome Back,</span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">{currentUser?.name}</h2>
            <p className="text-zinc-400 text-xs">{currentUser?.designation} • <span className="font-mono text-zinc-500">{currentUser?.employeeId}</span></p>
          </div>
        </div>

        <div className="text-right sm:text-right flex flex-col items-end shrink-0 bg-black/30 p-3 rounded-2xl border border-zinc-900 self-start sm:self-center">
          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Local Server Time</span>
          <span className="text-lg font-black font-mono text-white leading-tight">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono tracking-tight block">
            {formatDatePretty(getLocalDateString(currentTime))}
          </span>
        </div>
      </div>

      {/* CORE ATTENDANCE PUNCH PANEL */}
      <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-850 backdrop-blur-xl shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Abstract design elements */}
        <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-zinc-800 text-[11px] font-bold text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-red-500" />
            Shift: {currentUser?.shiftTiming || '09:00 AM - 05:00 PM'}
          </span>
        </div>

        {/* Dynamic visual indicator */}
        <div className="relative flex items-center justify-center w-52 h-52 rounded-full border border-zinc-800/80 bg-zinc-950/60 mb-6 shadow-inner">
          <div className="absolute inset-4 rounded-full border border-dashed border-zinc-850" />
          
          {/* Ripple rings */}
          {todayRecord && !todayRecord.tapOutTime && (
            <div className="absolute inset-0 rounded-full border border-red-500/10 animate-ping" />
          )}

          <div className="flex flex-col items-center z-10">
            {todayRecord ? (
              todayRecord.tapOutTime ? (
                <>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">SHIFT COMPLETED</span>
                  <span className="text-3xl font-black font-mono text-white mt-1">{todayRecord.totalWorkingTime}</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">Checked Out</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-extrabold animate-pulse">ACTIVE SESSION</span>
                  <span className="text-3xl font-black font-mono text-white mt-1 animate-pulse">{activeWorkHours}</span>
                  <span className="text-[10px] font-semibold text-zinc-400 mt-2">Started at {formatTime(todayRecord.tapInTime)}</span>
                </>
              )
            ) : (
              <>
                <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">SESSION READY</span>
                <span className="text-3xl font-black font-mono text-zinc-600 mt-1">00:00:00</span>
                <span className="text-[10px] font-bold text-zinc-500 mt-2">Tap In to start day</span>
              </>
            )}
          </div>
        </div>

        {/* Dynamic control buttons */}
        <div className="w-full max-w-sm">
          {loading ? (
            <button className="w-full py-4 rounded-2xl bg-zinc-800 text-zinc-500 font-bold text-sm flex items-center justify-center gap-2" disabled>
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
              Processing Shift Log...
            </button>
          ) : !todayRecord ? (
            <button
              onClick={handleTapIn}
              className="w-full py-4.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-red-600/10 hover:shadow-red-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
              id="btn-tap-in"
            >
              <Play className="w-5 h-5 fill-current" />
              START SHIFT (TAP IN)
            </button>
          ) : !todayRecord.tapOutTime ? (
            <button
              onClick={handleTapOut}
              className="w-full py-4.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-white font-extrabold text-sm tracking-wide shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 border border-zinc-750"
              id="btn-tap-out"
            >
              <Square className="w-4 h-4 fill-current text-red-500" />
              END SHIFT (TAP OUT)
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl bg-zinc-950/40 border border-zinc-850/60 text-zinc-500 font-bold text-xs uppercase tracking-wider">
              Today's Attendance Completed 🎉
            </div>
          )}
        </div>

        {/* Simple details summary */}
        {todayRecord && (
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-6 border-t border-zinc-850 pt-5">
            <div className="text-left bg-black/30 p-3 rounded-xl border border-zinc-900">
              <span className="block text-[8px] font-bold text-zinc-500 uppercase">Tap In Time</span>
              <span className="text-xs font-mono font-bold text-white">{formatTime(todayRecord.tapInTime)}</span>
              {todayRecord.isLate && (
                <span className="inline-block text-[8px] font-extrabold text-red-500 uppercase mt-1 px-1.5 py-0.5 bg-red-500/10 rounded">Late Arrival</span>
              )}
            </div>
            <div className="text-left bg-black/30 p-3 rounded-xl border border-zinc-900">
              <span className="block text-[8px] font-bold text-zinc-500 uppercase">Tap Out Time</span>
              <span className="text-xs font-mono font-bold text-white">{formatTime(todayRecord.tapOutTime)}</span>
              {todayRecord.isEarlyExit && (
                <span className="inline-block text-[8px] font-extrabold text-orange-500 uppercase mt-1 px-1.5 py-0.5 bg-orange-500/10 rounded">Early Exit</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUICK STATS CARD ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Presence rate</span>
          <div className="my-2">
            <span className="text-2xl font-black text-white">{attendanceRate}%</span>
          </div>
          <span className="text-[9px] text-zinc-600 font-mono">Present {presentDays}/{totalDays} shifts</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Late Checkins</span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-500">{lateDays}</span>
            <span className="text-xs text-zinc-600">days</span>
          </div>
          <span className="text-[9px] text-zinc-600 font-mono">Grace limits apply</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Early Exits</span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-500">{earlyExits}</span>
            <span className="text-xs text-zinc-600">days</span>
          </div>
          <span className="text-[9px] text-zinc-600 font-mono">Before shift close</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Working days</span>
          <div className="my-2">
            <span className="text-2xl font-black text-white">{totalDays}</span>
          </div>
          <span className="text-[9px] text-zinc-600 font-mono">Cumulative records</span>
        </div>
      </div>

      {/* RECENT PUNCH LOGS */}
      <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-850">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Recent Punch Logs</h3>
          <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Last 3 entries</span>
        </div>

        <div className="space-y-3">
          {personalHistory.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-zinc-850 rounded-2xl">
              <p className="text-xs text-zinc-500">No punch history available.</p>
            </div>
          ) : (
            personalHistory.slice(0, 3).map(record => (
              <div key={record.id} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-900">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-zinc-900 ${
                    record.status === 'present' ? 'text-emerald-500' :
                    record.status === 'late' ? 'text-red-500' :
                    record.status === 'early_exit' ? 'text-orange-500' :
                    'text-zinc-500'
                  }`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{formatDatePretty(record.date)}</span>
                    <span className="text-[10px] text-zinc-500 block">
                      In: <span className="font-mono text-zinc-400">{formatTime(record.tapInTime)}</span> • Out: <span className="font-mono text-zinc-400">{formatTime(record.tapOutTime)}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${
                    record.status === 'present' ? 'bg-emerald-500/10 text-emerald-400' :
                    record.status === 'late' ? 'bg-red-500/10 text-red-400' :
                    record.status === 'early_exit' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {record.status}
                  </span>
                  <span className="block text-[10px] font-mono text-zinc-500 mt-1">{record.totalWorkingTime || 'In Progress'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
