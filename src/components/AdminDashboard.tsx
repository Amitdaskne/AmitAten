import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { getAllAttendanceRecords } from '../firebase/dbService';
import { AttendanceRecord, User } from '../types';
import { getLocalDateString, formatTime, formatDatePretty } from '../utilities/dateUtils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Users, UserCheck, UserMinus, Clock, Play, CheckCircle2, ChevronRight, Activity, Search } from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { usersList, showToast } = useApp();
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const records = await getAllAttendanceRecords();
      setAllRecords(records);
    } catch (e) {
      showToast('Failed to load realtime stats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [usersList]);

  // Calculations for Today
  const todayStr = getLocalDateString();
  const enabledEmployees = usersList.filter(u => u.status === 'enabled' && u.role !== 'admin');
  const todayRecords = allRecords.filter(r => r.date === todayStr);

  const presentCount = todayRecords.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'early_exit').length;
  const absentCount = Math.max(0, enabledEmployees.length - presentCount);
  
  const tapInCount = todayRecords.length;
  const tapOutCount = todayRecords.filter(r => r.tapOutTime !== null).length;
  const lateCount = todayRecords.filter(r => r.isLate).length;
  const workingCount = todayRecords.filter(r => r.tapInTime && !r.tapOutTime).length;
  const completedCount = todayRecords.filter(r => r.tapOutTime).length;

  // Recent activity logs (sort all records descending by tapInTime)
  const recentActivities = [...allRecords]
    .sort((a, b) => b.tapInTime - a.tapInTime)
    .slice(0, 5);

  // Chart Data 1: Last 7 Days Attendance Trend
  const generate7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = getLocalDateString(d);
      const label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      
      const dayRecords = allRecords.filter(r => r.date === dStr);
      const present = dayRecords.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'early_exit').length;
      const late = dayRecords.filter(r => r.isLate).length;
      const absent = Math.max(0, enabledEmployees.length - present);

      data.push({
        name: label,
        Present: present - late,
        Late: late,
        Absent: absent
      });
    }
    return data;
  };

  // Chart Data 2: Monthly Status Split (Pie Chart)
  const generatePieData = () => {
    const currentMonthPrefix = todayStr.substring(0, 7);
    const monthRecords = allRecords.filter(r => r.date && r.date.startsWith(currentMonthPrefix));
    
    const present = monthRecords.filter(r => r.status === 'present').length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    const early = monthRecords.filter(r => r.status === 'early_exit').length;
    const half = monthRecords.filter(r => r.status === 'half_day').length;

    return [
      { name: 'Present On-Time', value: present || 1, color: '#10B981' },
      { name: 'Late Arrival', value: late || 0, color: '#EF4444' },
      { name: 'Early Exit', value: early || 0, color: '#F97316' },
      { name: 'Half Day', value: half || 0, color: '#6B7280' }
    ].filter(item => item.value > 0);
  };

  const trendData = generate7DaysData();
  const pieData = generatePieData();

  // Handle Search for Employees Quick Directory
  const filteredEmployees = usersList
    .filter(u => u.role !== 'admin')
    .filter(u => {
      const q = searchQuery.toLowerCase();
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.employeeId || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 3);

  return (
    <div className="w-full space-y-6 pb-24 select-none">
      
      {/* Realtime Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Staff */}
        <div className="p-4.5 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-zinc-850 text-white border border-zinc-800">
            <Users className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-zinc-500 uppercase">Active Staff</span>
            <span className="text-xl font-black text-white">{enabledEmployees.length}</span>
          </div>
        </div>

        {/* Present Today */}
        <div className="p-4.5 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-zinc-850 text-white border border-zinc-800">
            <UserCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-zinc-500 uppercase">Present Today</span>
            <span className="text-xl font-black text-white">{presentCount}</span>
          </div>
        </div>

        {/* Absent Today */}
        <div className="p-4.5 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-zinc-850 text-white border border-zinc-800">
            <UserMinus className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-zinc-500 uppercase">Absent Today</span>
            <span className="text-xl font-black text-white">{absentCount}</span>
          </div>
        </div>

        {/* Active Working */}
        <div className="p-4.5 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-zinc-850 text-white border border-zinc-800 animate-pulse">
            <Clock className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-zinc-500 uppercase">On Duty Now</span>
            <span className="text-xl font-black text-white">{workingCount}</span>
          </div>
        </div>
      </div>

      {/* TODAY'S SHIFT PIPELINE STATS */}
      <div className="p-5 rounded-3xl bg-zinc-900/30 border border-zinc-850 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-left">
          <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Total Tap In</span>
          <span className="text-lg font-bold text-white font-mono mt-1 block">{tapInCount}</span>
        </div>
        <div className="text-left border-l border-zinc-850 pl-4">
          <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Total Tap Out</span>
          <span className="text-lg font-bold text-white font-mono mt-1 block">{tapOutCount}</span>
        </div>
        <div className="text-left border-l border-zinc-850 pl-4">
          <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Late Arrivals</span>
          <span className="text-lg font-bold text-red-500 font-mono mt-1 block">{lateCount}</span>
        </div>
        <div className="text-left border-l border-zinc-850 pl-4">
          <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Completed Shifts</span>
          <span className="text-lg font-bold text-emerald-400 font-mono mt-1 block">{completedCount}</span>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart (Colspan 2) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-zinc-900/40 border border-zinc-850">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Weekly Attendance Curve</h3>
              <span className="text-[10px] text-zinc-500">Present vs. Absent counts (Last 7 days)</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="Present" stackId="a" fill="#10B981" />
                <Bar dataKey="Late" stackId="a" fill="#DC2626" />
                <Bar dataKey="Absent" fill="#3F3F46" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie status split */}
        <div className="p-5 rounded-3xl bg-zinc-900/40 border border-zinc-850 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Monthly Status Split</h3>
            <span className="text-[10px] text-zinc-500">Current calendar month stats</span>
          </div>
          <div className="h-44 w-full flex items-center justify-center my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {pieData.map((item, index) => (
              <div key={`pie-legend-${item.name}-${index}`} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white">{item.value} days</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS & DIRECTORY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Quick actions panel */}
        <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-850">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Quick Administrator Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('employees')}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900 hover:border-red-500/20 hover:bg-zinc-950/80 transition-all text-left group"
              id="action-manage-employees"
            >
              <div className="p-2.5 rounded-xl bg-red-600/10 text-red-500 group-hover:bg-red-600/20 transition-all">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white block">Manage Employees</span>
              <span className="text-[10px] text-zinc-500">Create, edit, generate QR & print ID cards</span>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900 hover:border-red-500/20 hover:bg-zinc-950/80 transition-all text-left group"
              id="action-admin-reports"
            >
              <div className="p-2.5 rounded-xl bg-red-600/10 text-red-500 group-hover:bg-red-600/20 transition-all">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white block">Generate Reports</span>
              <span className="text-[10px] text-zinc-500">View logs, download PDF, CSV, Excel sheets</span>
            </button>
          </div>
        </div>

        {/* Quick Directory Lookup */}
        <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-850 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Staff Directory Lookup</h3>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search staff directory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 transition-colors"
                id="input-staff-lookup"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            </div>
          </div>

          <div className="space-y-2">
            {filteredEmployees.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">No matching staff found.</p>
            ) : (
              filteredEmployees.map((u, idx) => (
                <div key={`staff-${u.id || idx}`} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/50 border border-zinc-900">
                  <div className="flex items-center gap-2.5">
                    {u.photoUrl ? (
                      <img src={u.photoUrl} referrerPolicy="no-referrer" alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                        {(u.name || '').split(' ').map(n=>n?.[0] || '').join('')}
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-white block leading-none">{u.name}</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 block">{u.department} • {u.employeeId}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('employees')}
                    className="text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* RECENT REALTIME ACTIVITIES LOG */}
      <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-850">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Recent Tap Activity Streams</h3>
        <div className="space-y-3.5">
          {recentActivities.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-6">No recent tap events logged today.</p>
          ) : (
            recentActivities.map((activity, idx) => (
              <div key={`activity-${activity.id || idx}`} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activity.tapOutTime ? 'bg-zinc-900 text-red-500' : 'bg-red-600/10 text-red-500 animate-pulse'}`}>
                    {activity.tapOutTime ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 fill-current" />}
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block">{activity.userName}</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      {activity.userDepartment} • {activity.userEmployeeId}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-zinc-300 block">
                    {activity.tapOutTime ? `Out: ${formatTime(activity.tapOutTime)}` : `In: ${formatTime(activity.tapInTime)}`}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono block mt-1">{formatDatePretty(activity.date)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
