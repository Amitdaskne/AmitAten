import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { getAllAttendanceRecords } from '../firebase/dbService';
import { jsPDF } from 'jspdf';
import { AttendanceRecord, User } from '../types';
import { getLocalDateString, formatDatePretty, formatTime } from '../utilities/dateUtils';
import { 
  Download, Printer, Search, Calendar, Filter, Users, 
  FileSpreadsheet, ShieldAlert, BadgeCheck, Clock, FileText, Check 
} from 'lucide-react';

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom_date' | 'custom_month' | 'custom_range';
type ReportType = 'all' | 'present' | 'late' | 'absent' | 'working_hours';

export default function AdminReports() {
  const { usersList, showToast, companySettings } = useApp();
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDate, setCustomDate] = useState('');
  const [customMonth, setCustomMonth] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['all']);
  const [selectedEmps, setSelectedEmps] = useState<string[]>(['all']);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [reportType, setReportType] = useState<ReportType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown options
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);

  const toggleDept = (dept: string) => {
    if (dept === 'all') {
      setSelectedDepts(['all']);
    } else {
      let next = selectedDepts.filter(d => d !== 'all');
      if (next.includes(dept)) {
        next = next.filter(d => d !== dept);
      } else {
        next.push(dept);
      }
      if (next.length === 0 || next.length === departments.length) {
        setSelectedDepts(['all']);
      } else {
        setSelectedDepts(next);
      }
    }
  };

  const toggleEmp = (empId: string) => {
    if (empId === 'all') {
      setSelectedEmps(['all']);
    } else {
      let next = selectedEmps.filter(e => e !== 'all');
      if (next.includes(empId)) {
        next = next.filter(e => e !== empId);
      } else {
        next.push(empId);
      }
      if (next.length === 0 || next.length === employees.length) {
        setSelectedEmps(['all']);
      } else {
        setSelectedEmps(next);
      }
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const records = await getAllAttendanceRecords();
      setAllRecords(records);
    } catch (e) {
      showToast('Failed to compile logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [usersList]);

  // Extract departments and employees lists
  useEffect(() => {
    const regularEmployees = usersList.filter(u => u.role !== 'admin');
    setEmployees(regularEmployees);

    const presetStores = ['Store 1', 'Store 2', 'Store 3'];
    const dynamicDepts = regularEmployees.map(u => u.department).filter(d => {
      if (!d) return false;
      const lower = d.toLowerCase().trim();
      return lower !== 'management' && lower !== 'engineering';
    });
    const combinedDepts = Array.from(new Set([...presetStores, ...dynamicDepts]));
    setDepartments(combinedDepts);
  }, [usersList]);

  // Compile records in client side based on filters
  useEffect(() => {
    let result: AttendanceRecord[] = [];
    const todayStr = getLocalDateString();
    
    // 1. Compile date filters
    if (datePreset === 'today') {
      result = allRecords.filter(r => r.date === todayStr);
    } else if (datePreset === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      result = allRecords.filter(r => r.date === yesterdayStr);
    } else if (datePreset === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const limitStr = getLocalDateString(oneWeekAgo);
      result = allRecords.filter(r => r.date && r.date >= limitStr);
    } else if (datePreset === 'month') {
      const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
      result = allRecords.filter(r => r.date && r.date.startsWith(currentMonthPrefix));
    } else if (datePreset === 'last_month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const lastMonthPrefix = getLocalDateString(d).substring(0, 7);
      result = allRecords.filter(r => r.date && r.date.startsWith(lastMonthPrefix));
    } else if (datePreset === 'custom_date' && customDate) {
      result = allRecords.filter(r => r.date === customDate);
    } else if (datePreset === 'custom_month' && customMonth) {
      result = allRecords.filter(r => r.date && r.date.startsWith(customMonth));
    } else if (datePreset === 'custom_range') {
      if (customFromDate && customToDate) {
        result = allRecords.filter(r => r.date && r.date >= customFromDate && r.date <= customToDate);
      } else if (customFromDate) {
        result = allRecords.filter(r => r.date && r.date >= customFromDate);
      } else if (customToDate) {
        result = allRecords.filter(r => r.date && r.date <= customToDate);
      } else {
        result = [...allRecords];
      }
    } else {
      result = [...allRecords];
    }

    // 2. Filter by department
    if (!selectedDepts.includes('all') && selectedDepts.length > 0) {
      result = result.filter(r => r.userDepartment && selectedDepts.includes(r.userDepartment));
    }

    // 3. Filter by specific employee
    if (!selectedEmps.includes('all') && selectedEmps.length > 0) {
      result = result.filter(r => selectedEmps.includes(r.userId));
    }

    // 4. Filter by Report Category Type
    if (reportType === 'present') {
      result = result.filter(r => r.status === 'present');
    } else if (reportType === 'late') {
      result = result.filter(r => r.isLate);
    } else if (reportType === 'absent') {
      result = result.filter(r => r.status === 'absent');
    } else if (reportType === 'working_hours') {
      // Sort highest working hours first
      result = result.filter(r => r.workingHours > 0).sort((a, b) => b.workingHours - a.workingHours);
    }

    // 5. Text Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        (r.userName || '').toLowerCase().includes(q) ||
        (r.userEmployeeId || '').toLowerCase().includes(q) ||
        (r.userDepartment || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q)
      );
    } else if (reportType !== 'working_hours') {
      // Default: sort newest dates first
      result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    // Add virtual absent logs if "Absent Report" is compiled for specific days
    if (reportType === 'absent' || (datePreset === 'today' && reportType === 'all')) {
      const activeStaff = usersList.filter(u => u.role !== 'admin' && u.status === 'enabled');
      const targetDates = Array.from(new Set(result.map(r => r.date).filter(Boolean)));
      if (targetDates.length === 0 && datePreset === 'today') {
        targetDates.push(todayStr);
      }

      // Find staff who did NOT punch in for those specific days
      const absentRecords: AttendanceRecord[] = [];
      targetDates.forEach(date => {
        const punchedUserIds = allRecords.filter(r => r.date === date).map(r => r.userId);
        activeStaff.forEach(staff => {
          if (!punchedUserIds.includes(staff.id)) {
            absentRecords.push({
              id: `${staff.id}_${date}_absent`,
              userId: staff.id,
              userName: staff.name,
              userEmployeeId: staff.employeeId,
              userDepartment: staff.department,
              date,
              tapInTime: 0,
              tapOutTime: null,
              workingHours: 0,
              breakDuration: 0,
              totalWorkingTime: '--',
              status: 'absent',
              isLate: false,
              isEarlyExit: false
            });
          }
        });
      });

      // Combine and filter if specific criteria matched
      let combined = [...result];
      absentRecords.forEach(absRecord => {
        if (!selectedDepts.includes('all') && selectedDepts.length > 0 && (!absRecord.userDepartment || !selectedDepts.includes(absRecord.userDepartment))) return;
        if (!selectedEmps.includes('all') && selectedEmps.length > 0 && !selectedEmps.includes(absRecord.userId)) return;
        combined.push(absRecord);
      });
      result = combined;
    }

    setFilteredRecords(result);
  }, [allRecords, datePreset, customDate, customMonth, customFromDate, customToDate, selectedDepts, selectedEmps, reportType, searchQuery, usersList]);

  // Helper to resolve designation of a user
  const getUserDesignation = (userId: string) => {
    const u = usersList.find(user => user.id === userId);
    return u ? u.designation : '--';
  };

  // Export to Excel/CSV spreadsheet format
  const handleCSVExport = () => {
    if (filteredRecords.length === 0) {
      showToast('No filtered records to compile.', 'info');
      return;
    }

    try {
      const headers = ['Date', 'Employee ID', 'Name', 'Store', 'Designation', 'Clock In', 'Clock Out', 'Hours Logged', 'Status', 'Late Status'];
      const rows = filteredRecords.map(r => [
        r.date,
        r.userEmployeeId,
        r.userName,
        r.userDepartment || '--',
        getUserDesignation(r.userId),
        r.tapInTime ? formatTime(r.tapInTime) : '--',
        r.tapOutTime ? formatTime(r.tapOutTime) : '--',
        r.workingHours || 0,
        r.status.toUpperCase(),
        r.isLate ? 'LATE' : 'NORMAL'
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `AmitAten_Company_Report_${getLocalDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Spreadsheet compiled and downloaded!', 'success');
    } catch (e) {
      showToast('Excel/CSV compile failed.', 'error');
    }
  };

  const handlePDFExport = () => {
    if (filteredRecords.length === 0) {
      showToast('No records to export to PDF.', 'info');
      return;
    }

    try {
      showToast('Compiling custom PDF report...', 'info');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const companyNameStr = companySettings?.companyName || 'Amit Opticals';
      const companyAddressStr = companySettings?.officeAddress || 'Main Office';

      // 1. Calculate total pages
      let totalPages = 1;
      let testY = 62;
      filteredRecords.forEach((_, index) => {
        if (testY > 265) {
          totalPages++;
          testY = 62;
        }
        testY += 8;
      });

      const drawHeader = (pageNum: number) => {
        // Red highlight bar at the very top
        doc.setFillColor(220, 38, 38);
        doc.rect(15, 12, 180, 2, 'F');

        // Company Header info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(companyNameStr.toUpperCase(), 15, 22);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(companyAddressStr, 15, 26);

        // Title of Document
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('CORPORATE ATTENDANCE AUDIT REPORT', 15, 34);

        // Metadata Info Box
        doc.setFillColor(248, 250, 252); // soft slate background
        doc.rect(15, 38, 180, 18, 'F');
        doc.setDrawColor(226, 232, 240); // light slate border
        doc.setLineWidth(0.25);
        doc.rect(15, 38, 180, 18, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);

        doc.text('Report Scope:', 18, 43);
        doc.setFont('helvetica', 'normal');
        doc.text(`Preset Range: ${datePreset.toUpperCase().replace('_', ' ')}`, 18, 48);
        const deptText = selectedDepts.includes('all') ? 'All Stores' : selectedDepts.join(', ');
        const truncatedDeptText = deptText.length > 40 ? deptText.substring(0, 38) + '...' : deptText;
        doc.text(`Stores: ${truncatedDeptText}`, 18, 52);

        doc.text(`Generated On: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 100, 43);
        
        let empText = 'All Employees';
        if (!selectedEmps.includes('all') && selectedEmps.length > 0) {
          const names = employees.filter(e => selectedEmps.includes(e.id)).map(e => e.name);
          empText = names.join(', ');
        }
        const truncatedEmpText = empText.length > 40 ? empText.substring(0, 38) + '...' : empText;
        doc.text(`Employees: ${truncatedEmpText}`, 100, 48);
        doc.text(`Category: ${reportType.toUpperCase()}`, 100, 52);

        // Shifts Badge
        doc.setFillColor(220, 38, 38);
        doc.rect(160, 41, 32, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.5);
        doc.text('SHIFTS AGGREGATED', 162, 45);
        doc.setFontSize(10);
        doc.text(`${filteredRecords.length}`, 172, 50);

        // Footer at bottom of the page
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Powered by ${companyNameStr} App • Confidential Compliance Report`, 15, 285);
        doc.text(`Page ${pageNum} of ${totalPages}`, 180, 285, { align: 'right' });
      };

      const drawTableHeader = (currentY: number) => {
        doc.setFillColor(39, 39, 42); // Zinc-800: rgb(39, 39, 42)
        doc.rect(15, currentY, 180, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        
        let currentX = 15;
        doc.text('Date', currentX + 2, currentY + 5.5);
        currentX += 20;
        doc.text('Emp ID', currentX + 2, currentY + 5.5);
        currentX += 18;
        doc.text('Employee Name', currentX + 2, currentY + 5.5);
        currentX += 32;
        doc.text('Store', currentX + 2, currentY + 5.5);
        currentX += 22;
        doc.text('Designation', currentX + 2, currentY + 5.5);
        currentX += 24;
        doc.text('In', currentX + 2, currentY + 5.5);
        currentX += 14;
        doc.text('Out', currentX + 2, currentY + 5.5);
        currentX += 14;
        doc.text('Hours', currentX + 2, currentY + 5.5);
        currentX += 14;
        doc.text('Status', currentX + 2, currentY + 5.5);
        
        return currentY + 8;
      };

      let pageNum = 1;
      let y = 62;

      // Draw first page header
      drawHeader(pageNum);
      y = drawTableHeader(y);

      filteredRecords.forEach((record, index) => {
        // If we reach the bottom of the page, add a new page
        if (y > 265) {
          pageNum++;
          doc.addPage();
          y = 62;
          drawHeader(pageNum);
          y = drawTableHeader(y);
        }

        // Draw Row alternating background
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252); // soft slate
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.rect(15, y, 180, 8, 'F');
        
        // Row border bottom
        doc.setDrawColor(241, 245, 249); // light border
        doc.setLineWidth(0.15);
        doc.line(15, y + 8, 195, y + 8);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85); // slate-700
        
        let currentX = 15;
        // Date
        doc.text(record.date || '--', currentX + 2, y + 5.5);
        currentX += 20;
        // Emp ID
        doc.text(record.userEmployeeId || '--', currentX + 2, y + 5.5);
        currentX += 18;
        // Name (truncated if too long)
        const nameStr = record.userName || '--';
        const truncatedName = nameStr.length > 15 ? nameStr.substring(0, 13) + '..' : nameStr;
        doc.text(truncatedName, currentX + 2, y + 5.5);
        currentX += 32;
        // Store (truncated if too long)
        const storeStr = record.userDepartment || '--';
        const truncatedStore = storeStr.length > 11 ? storeStr.substring(0, 9) + '..' : storeStr;
        doc.text(truncatedStore, currentX + 2, y + 5.5);
        currentX += 22;
        // Designation (truncated if too long)
        const desigStr = getUserDesignation(record.userId);
        const truncatedDesig = desigStr.length > 13 ? desigStr.substring(0, 11) + '..' : desigStr;
        doc.text(truncatedDesig, currentX + 2, y + 5.5);
        currentX += 24;
        // Clock In
        const inStr = record.tapInTime ? formatTime(record.tapInTime) : '--';
        doc.text(inStr, currentX + 2, y + 5.5);
        currentX += 14;
        // Clock Out
        const outStr = record.tapOutTime ? formatTime(record.tapOutTime) : '--';
        doc.text(outStr, currentX + 2, y + 5.5);
        currentX += 14;
        // Duration
        const durStr = record.status === 'absent' ? '--' : (record.totalWorkingTime || `${record.workingHours || 0}h`);
        doc.text(durStr, currentX + 2, y + 5.5);
        currentX += 14;
        
        // Status with custom styling
        const isAbsent = record.status === 'absent';
        const isLate = record.isLate;
        if (isAbsent) {
          doc.setTextColor(220, 38, 38); // Red
        } else if (isLate) {
          doc.setTextColor(217, 119, 6); // Orange/Amber
        } else {
          doc.setTextColor(22, 163, 74); // Green
        }
        doc.setFont('helvetica', 'bold');
        const statusText = record.status.toUpperCase() + (isLate ? ' (LATE)' : '');
        doc.text(statusText, currentX + 2, y + 5.5);
        
        y += 8;
      });

      doc.save(`AmitAten_Company_Report_${getLocalDateString()}.pdf`);
      showToast('PDF report downloaded successfully!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to compile PDF document.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Report Compiler Controller */}
      <div className="p-5 rounded-3xl bg-zinc-900/40 border border-zinc-850 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850/60 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">Corporate Report Compiler</h2>
            <p className="text-xs text-zinc-500">Aggregate corporate compliance logs and export audit sheets</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCSVExport}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold transition-all active:scale-95 border border-zinc-750"
              id="btn-export-csv"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Spreadsheet
            </button>
            <button
              onClick={handlePDFExport}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold transition-all active:scale-95 border border-zinc-750"
              id="btn-export-pdf"
            >
              <FileText className="w-4 h-4 text-red-500" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all active:scale-95"
              id="btn-print-reports"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
          </div>
        </div>

        {/* Date Filters Selectors Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Preset Select */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Date preset</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full px-4 py-3 bg-black/40 border border-zinc-850 rounded-xl text-xs font-bold text-zinc-300 focus:outline-none"
              id="select-date-preset"
            >
              <option value="today" className="bg-zinc-900 text-white">Today Preset</option>
              <option value="yesterday" className="bg-zinc-900 text-white">Yesterday Preset</option>
              <option value="week" className="bg-zinc-900 text-white">Last 7 Days</option>
              <option value="month" className="bg-zinc-900 text-white">This Calendar Month</option>
              <option value="last_month" className="bg-zinc-900 text-white">Last Calendar Month</option>
              <option value="custom_date" className="bg-zinc-900 text-white">Specific Date Selector</option>
              <option value="custom_month" className="bg-zinc-900 text-white">Specific Month Selector</option>
              <option value="custom_range" className="bg-zinc-900 text-white">Custom Date Range (From - To)</option>
            </select>
          </div>

          {/* Dynamic Extra Custom Inputs */}
          {datePreset === 'custom_date' && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Select specific date</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-black/40 border border-zinc-850 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-red-600"
              />
            </div>
          )}

          {datePreset === 'custom_month' && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Select specific month</label>
              <input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="w-full px-3 py-2.5 bg-black/40 border border-zinc-850 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-red-600"
              />
            </div>
          )}

          {datePreset === 'custom_range' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">From Date</label>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-zinc-850 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-red-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">To Date</label>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-zinc-850 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-red-600"
                />
              </div>
            </>
          )}

          {/* Report Category Type */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Report category</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-4 py-3 bg-black/40 border border-zinc-850 rounded-xl text-xs font-bold text-zinc-300 focus:outline-none"
              id="select-report-category"
            >
              <option value="all" className="bg-zinc-900 text-white">All Records</option>
              <option value="present" className="bg-zinc-900 text-emerald-400">Present (On-Time)</option>
              <option value="late" className="bg-zinc-900 text-red-400">Late Arrivals Report</option>
              <option value="absent" className="bg-zinc-900 text-red-500">Absentee Report</option>
              <option value="working_hours" className="bg-zinc-900 text-sky-400">Highest Logged Work Hours</option>
            </select>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Quick search query</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search compiled logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-black/40 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-600"
                id="input-report-query-search"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            </div>
          </div>
        </div>

        {/* Multi-Select Stores */}
        <div className="space-y-2 border-t border-zinc-850/40 pt-3">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
            Store Filter ({selectedDepts.includes('all') ? 'All Stores Selected' : `${selectedDepts.length} selected`})
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleDept('all')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                selectedDepts.includes('all')
                  ? 'bg-red-500/10 border-red-500/40 text-white'
                  : 'bg-black/40 border-zinc-850 text-zinc-400 hover:bg-zinc-850/40 hover:text-zinc-200'
              }`}
            >
              {selectedDepts.includes('all') && <Check className="w-3.5 h-3.5 text-red-500 stroke-[3]" />}
              All Stores / Management
            </button>
            {departments.map(d => {
              const isSelected = !selectedDepts.includes('all') && selectedDepts.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDept(d)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-red-500/10 border-red-500/40 text-white'
                      : 'bg-black/40 border-zinc-850 text-zinc-400 hover:bg-zinc-850/40 hover:text-zinc-200'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-500 stroke-[3]" />}
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Select Employees with scroll and search */}
        <div className="space-y-2.5 border-t border-zinc-850/40 pt-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
              Employee scope filter ({selectedEmps.includes('all') ? 'All Employees Selected' : `${selectedEmps.length} selected`})
            </label>
            
            {/* Filter Input */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Filter employees list..."
                value={empSearchQuery}
                onChange={(e) => setEmpSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-zinc-850 rounded-lg text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-red-600"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            </div>
          </div>

          <div className="border border-zinc-850/60 bg-black/20 rounded-2xl p-3.5 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleEmp('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
                  selectedEmps.includes('all')
                    ? 'bg-red-500/10 border-red-500/40 text-white'
                    : 'bg-black/40 border-zinc-850 text-zinc-400 hover:bg-zinc-850/40 hover:text-zinc-200'
                }`}
              >
                {selectedEmps.includes('all') && <Check className="w-3 h-3 text-red-500 stroke-[3]" />}
                All Employees
              </button>
            </div>

            {/* Scrollable grid of employee checkbox cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {employees
                .filter(u => {
                  if (!empSearchQuery) return true;
                  const name = u.name || '';
                  const empId = u.employeeId || '';
                  return name.toLowerCase().includes(empSearchQuery.toLowerCase()) || 
                         empId.toLowerCase().includes(empSearchQuery.toLowerCase());
                })
                .map((u, index) => {
                  const isSelected = !selectedEmps.includes('all') && selectedEmps.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id || `emp_${index}`}
                      onClick={() => toggleEmp(u.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500/30 text-white'
                          : 'bg-black/30 border-zinc-900/40 text-zinc-400 hover:bg-zinc-850/20 hover:text-zinc-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-red-500 bg-red-600 text-white' : 'border-zinc-800'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                      </div>
                      {/* Avatar fallback */}
                      <div className="w-6 h-6 rounded-full bg-zinc-800 text-[10px] font-extrabold flex items-center justify-center border border-zinc-700 text-zinc-300 overflow-hidden shrink-0">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          (u.name || 'User').split(' ').filter(Boolean).map(n => n[0] || '').join('').substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="text-[11px] font-extrabold truncate text-zinc-200">{u.name || 'No Name'}</p>
                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{u.employeeId || 'N/A'} • {u.department || 'No Store'} • {u.designation || 'No Designation'}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* COMPILED LOGS LIST */}
      <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-850">
        <div className="flex items-center justify-between mb-4.5 border-b border-zinc-850/60 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Shift Log Statements</h3>
          </div>
          <span className="text-xs text-zinc-500 font-bold">{filteredRecords.length} shifts aggregated</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
            <span className="text-xs text-zinc-500">Querying database...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-850 rounded-3xl bg-zinc-950/20">
            <h4 className="text-sm font-bold text-zinc-500 mb-1">No Shifts Compiled</h4>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto">Try adjusting the filter preset, selecting another store, or clearing search keywords.</p>
          </div>
        ) : (
          <div className="space-y-3 print:space-y-2">
            {filteredRecords.map((record, index) => (
              <div
                key={record.id || `${record.userId}_${record.date}_${index}`}
                className="p-4 rounded-2xl bg-zinc-950/30 border border-zinc-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:border-zinc-300 print:text-black print:bg-white"
              >
                <div className="flex items-center gap-4.5">
                  <div className={`p-3 rounded-2xl shrink-0 print:hidden ${
                    record.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                    record.status === 'late' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                    record.status === 'absent' ? 'bg-red-600/15 text-red-500 border border-red-500/10' :
                    'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}>
                    {record.status === 'absent' ? <ShieldAlert className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>

                  <div>
                    <span className="text-xs font-black text-white print:text-black block leading-none">{record.userName}</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      ID: <strong className="font-mono text-zinc-200 print:text-black font-semibold">{record.userEmployeeId}</strong> • Store: <strong className="text-zinc-300 print:text-black font-medium">{record.userDepartment}</strong> • Desig: <strong className="text-zinc-300 print:text-black font-medium">{getUserDesignation(record.userId)}</strong>
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block font-mono">Date: {formatDatePretty(record.date)}</span>
                  </div>
                </div>

                {/* Clock logs and durations */}
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right border-t border-zinc-900/80 pt-3 sm:pt-0 sm:border-none">
                  <div className="text-left sm:text-right">
                    <span className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Clock Session</span>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      {record.status === 'absent' ? (
                        <span className="text-red-500 font-bold">Unreported / Absent</span>
                      ) : (
                        <>
                          <span>In: {formatTime(record.tapInTime)}</span>
                          <span className="mx-1.5">•</span>
                          <span>Out: {formatTime(record.tapOutTime)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-block text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${
                      record.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      record.status === 'late' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      record.status === 'absent' ? 'bg-red-500/15 text-red-500 border border-red-500/25' :
                      'bg-zinc-850 text-zinc-400'
                    }`}>
                      {record.status}
                    </span>
                    {record.workingHours > 0 && (
                      <span className="text-[10px] font-mono text-zinc-500 mt-0.5 block">{record.totalWorkingTime} active</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden, nav, header, button, select, input, label, .fixed {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
