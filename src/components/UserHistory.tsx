import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { getUserAttendance } from '../firebase/dbService';
import { AttendanceRecord } from '../types';
import { formatDatePretty, formatTime, getLocalDateString } from '../utilities/dateUtils';
import { Calendar, Search, Filter, Download, ArrowUpDown, Clock } from 'lucide-react';

type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function UserHistory() {
  const { currentUser, showToast } = useApp();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [dateFilter, setDateFilter] = useState<DateFilterType>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const records = await getUserAttendance(currentUser.id);
      // Sort newest first
      const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
      setHistory(sorted);
    } catch (e) {
      console.error(e);
      showToast('Failed to load history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [currentUser]);

  // Apply filters in client side
  useEffect(() => {
    let result = [...history];

    // 1. Filter by Date
    const todayStr = getLocalDateString();
    if (dateFilter === 'today') {
      result = result.filter(r => r.date === todayStr);
    } else if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const limitStr = getLocalDateString(oneWeekAgo);
      result = result.filter(r => r.date && r.date >= limitStr);
    } else if (dateFilter === 'month') {
      const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
      result = result.filter(r => r.date && r.date.startsWith(currentMonthPrefix));
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      result = result.filter(r => r.date && r.date >= customStart && r.date <= customEnd);
    }

    // 2. Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    // 3. Search text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        (r.date || '').includes(q) || 
        (r.status || '').toLowerCase().includes(q) || 
        (r.totalWorkingTime && r.totalWorkingTime.toLowerCase().includes(q))
      );
    }

    setFilteredHistory(result);
  }, [history, dateFilter, customStart, customEnd, statusFilter, searchQuery]);

  const downloadCSVReport = () => {
    if (filteredHistory.length === 0) {
      showToast('No records to export.', 'info');
      return;
    }

    try {
      const headers = ['Date', 'Employee ID', 'Name', 'Department', 'Tap In', 'Tap Out', 'Working Hours', 'Status', 'Late', 'Early Exit'];
      const rows = filteredHistory.map(r => [
        r.date,
        r.userEmployeeId,
        r.userName,
        r.userDepartment,
        formatTime(r.tapInTime),
        formatTime(r.tapOutTime),
        r.workingHours,
        r.status.toUpperCase(),
        r.isLate ? 'YES' : 'NO',
        r.isEarlyExit ? 'YES' : 'NO'
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Attendance_Report_${getLocalDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('CSV statement exported successfully!', 'success');
    } catch (e) {
      showToast('Export failed.', 'error');
    }
  };

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Search & Filter Header Container */}
      <div className="p-5 rounded-3xl bg-zinc-900/40 border border-zinc-850 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">Shift Log History</h2>
            <p className="text-xs text-zinc-500">Query and audit your historical attendance records</p>
          </div>
          <button
            onClick={downloadCSVReport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold transition-all active:scale-95 border border-zinc-750 self-start sm:self-center"
            id="btn-export-personal-history"
          >
            <Download className="w-4 h-4 text-red-500" />
            Export CSV
          </button>
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-black/40 rounded-xl border border-zinc-900">
          {(['month', 'week', 'today', 'custom', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                dateFilter === filter 
                  ? 'bg-zinc-800 text-white shadow'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              id={`btn-date-filter-${filter}`}
            >
              {filter === 'month' ? 'This Month' : filter === 'week' ? 'This Week' : filter}
            </button>
          ))}
        </div>

        {/* Custom Dates Inputs */}
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-black/20 border border-zinc-900 animate-fade-in">
            <div>
              <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Start Date</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>
            <div>
              <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">End Date</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>
          </div>
        )}

        {/* Advanced Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by keyword, duration, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black/40 border border-zinc-850 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-red-600 placeholder-zinc-600 transition-colors"
              id="input-personal-history-search"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-zinc-850 rounded-xl text-xs font-bold text-zinc-400 focus:outline-none focus:border-red-600 appearance-none"
              id="select-personal-status-filter"
            >
              <option value="all" className="bg-zinc-900 text-white">All Statuses</option>
              <option value="present" className="bg-zinc-900 text-emerald-400">Present (On-time)</option>
              <option value="late" className="bg-zinc-900 text-red-400">Late Arrival</option>
              <option value="early_exit" className="bg-zinc-900 text-orange-400">Early Exit</option>
              <option value="half_day" className="bg-zinc-900 text-zinc-400">Half Day</option>
            </select>
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* HISTORICAL SHIFTS TABLE / LIST */}
      <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-850">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Record Statements</h3>
          <span className="text-xs text-zinc-500 font-bold">{filteredHistory.length} logs found</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-3 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
            <span className="text-xs text-zinc-500">Querying secure cloud database...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20">
            <Calendar className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-zinc-500 mb-1">No Attendance Found</h4>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">No logs matched your active date filters or keywords.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map(record => (
              <div
                key={record.id}
                className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-900/50 hover:border-zinc-850 hover:bg-zinc-950/80 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-4.5">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    record.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                    record.status === 'late' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                    record.status === 'early_exit' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/10' :
                    'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>

                  <div>
                    <span className="text-sm font-black text-white block">{formatDatePretty(record.date)}</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 items-center mt-1">
                      <span className="text-xs text-zinc-500 font-mono">
                        In: <strong className="text-zinc-300 font-medium">{formatTime(record.tapInTime)}</strong>
                      </span>
                      <span className="text-zinc-700 text-xs">•</span>
                      <span className="text-xs text-zinc-500 font-mono">
                        Out: <strong className="text-zinc-300 font-medium">{formatTime(record.tapOutTime)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right border-t border-zinc-900 pt-3 sm:pt-0 sm:border-none">
                  <div>
                    <span className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Active Shift</span>
                    <span className="text-sm font-black font-mono text-zinc-300 block mt-0.5">{record.totalWorkingTime || 'In Progress'}</span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`inline-block text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${
                      record.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      record.status === 'late' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      record.status === 'early_exit' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
