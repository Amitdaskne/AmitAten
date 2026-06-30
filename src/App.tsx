import React, { useState } from 'react';
import { AppProvider, useApp } from './components/AppContext';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import AdminEmployees from './components/AdminEmployees';
import AdminReports from './components/AdminReports';
import SettingsView from './components/SettingsView';
import UserDashboard from './components/UserDashboard';
import UserHistory from './components/UserHistory';
import UserProfile from './components/UserProfile';
import UserIdCard from './components/UserIdCard';

import { 
  LayoutGrid, Users, BarChart3, Settings, Smartphone, 
  CalendarRange, CreditCard, User as UserIcon, Shield, Building, LogOut 
} from 'lucide-react';

function AppContent() {
  const { currentUser, setCurrentUser, companySettings, loading, showToast } = useApp();
  
  // Navigation states
  const [adminTab, setAdminTab] = useState<string>('dashboard');
  const [userTab, setUserTab] = useState<string>('hub');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0C] text-white select-none">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-red-800 shadow-xl shadow-red-600/20 mb-4 animate-pulse">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <div className="w-44 h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div className="w-1/2 h-full bg-red-600 rounded-full animate-progress" />
        </div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mt-3.5">
          Initializing AmitAten Roster...
        </span>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!currentUser) {
    return <Login />;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('Securely logged out.', 'info');
  };

  const renderActiveView = () => {
    if (currentUser.role === 'admin') {
      switch (adminTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={(tab) => setAdminTab(tab)} />;
        case 'employees':
          return <AdminEmployees />;
        case 'reports':
          return <AdminReports />;
        case 'settings':
          return <SettingsView />;
        default:
          return <AdminDashboard onNavigate={(tab) => setAdminTab(tab)} />;
      }
    } else {
      switch (userTab) {
        case 'hub':
          return <UserDashboard />;
        case 'history':
          return <UserHistory />;
        case 'idcard':
          return companySettings ? (
            <div className="p-4 rounded-3xl bg-zinc-900/30 border border-zinc-850 space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-tight">Your Digital Badge</h2>
                <p className="text-xs text-zinc-500">Scan this code at terminal gates or print as physical card</p>
              </div>
              <UserIdCard user={currentUser} settings={companySettings} />
            </div>
          ) : null;
        case 'profile':
          return <UserProfile />;
        default:
          return <UserDashboard />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col relative select-none">
      
      {/* PREMIUM APPLICATION TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#0A0A0C]/90 border-b border-zinc-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {companySettings?.companyLogo ? (
            <img 
              src={companySettings.companyLogo} 
              referrerPolicy="no-referrer"
              alt="Logo" 
              className="w-8 h-8 rounded-lg object-cover border border-zinc-800" 
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-xs text-white">
              AA
            </div>
          )}
          <div>
            <span className="text-[9px] font-mono font-bold tracking-widest text-red-500 uppercase">
              {currentUser.role === 'admin' ? 'ADMIN CONSOLE' : 'EMPLOYEE PORTAL'}
            </span>
            <h1 className="text-sm font-extrabold text-white tracking-tight leading-none mt-0.5">
              {companySettings?.companyName || 'AmitAten'}
            </h1>
          </div>
        </div>

        {/* User quick badge info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-white block">{currentUser.name}</span>
            <span className="text-[10px] text-zinc-500 block font-mono">{currentUser.employeeId}</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 border border-zinc-850 transition-all cursor-pointer active:scale-95"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CORE VIEWPORT / LAYOUT CONTAINER */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {renderActiveView()}
      </main>

      {/* PREMIUM ANDROID BOTTOM NAV DRAWER */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 border-t border-zinc-900/90 backdrop-blur-lg pb-safe-bottom shadow-2xl">
        <div className="max-w-md mx-auto grid grid-cols-4 pt-2.5 pb-4 px-2">
          
          {currentUser.role === 'admin' ? (
            /* ADMIN ROLE BOTTOM NAVIGATION TABS */
            <>
              <button
                onClick={() => setAdminTab('dashboard')}
                className={`flex flex-col items-center gap-1 transition-all relative ${
                  adminTab === 'dashboard' ? 'text-red-500' : 'text-zinc-500'
                }`}
                id="nav-admin-dashboard"
              >
                <LayoutGrid className="w-5.5 h-5.5" />
                <span className="text-[9px] font-extrabold tracking-wide uppercase">Dashboard</span>
                {adminTab === 'dashboard' && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setAdminTab('employees')}
                className={`flex flex-col items-center gap-1 transition-all relative ${
                  adminTab === 'employees' ? 'text-red-500' : 'text-zinc-500'
                }`}
                id="nav-admin-employees"
              >
                <Users className="w-5.5 h-5.5" />
                <span className="text-[9px] font-extrabold tracking-wide uppercase">Staff</span>
                {adminTab === 'employees' && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setAdminTab('reports')}
                className={`flex flex-col items-center gap-1 transition-all relative ${
                  adminTab === 'reports' ? 'text-red-500' : 'text-zinc-500'
                }`}
                id="nav-admin-reports"
              >
                <BarChart3 className="w-5.5 h-5.5" />
                <span className="text-[9px] font-extrabold tracking-wide uppercase">Reports</span>
                {adminTab === 'reports' && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setAdminTab('settings')}
                className={`flex flex-col items-center gap-1 transition-all relative ${
                  adminTab === 'settings' ? 'text-red-500' : 'text-zinc-500'
                }`}
                id="nav-admin-settings"
              >
                <Settings className="w-5.5 h-5.5" />
                <span className="text-[9px] font-extrabold tracking-wide uppercase">Rules</span>
                {adminTab === 'settings' && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            </>
          ) : (
            /* REGULAR STAFF BOTTOM NAVIGATION TABS */
            <>
              <button
                onClick={() => setUserTab('hub')}
                className={`flex flex-col items-center gap-1 transition-all relative ${
                  userTab === 'hub' ? 'text-red-500' : 'text-zinc-500'
                }`}
                id="nav-user-hub"
              >
                <Smartphone className="w-5.5 h-5.5" />
                <span className="text-[9px] font-extrabold tracking-wide uppercase">My Hub</span>
                {userTab === 'hub' && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setUserTab('history')}
                className={`flex flex-col items-center gap-1 transition-all relative ${
                  userTab === 'history' ? 'text-red-500' : 'text-zinc-500'
                }`}
                id="nav-user-history"
              >
                <CalendarRange className="w-5.5 h-5.5" />
                <span className="text-[9px] font-extrabold tracking-wide uppercase">History</span>
                {userTab === 'history' && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setUserTab('idcard')}
                className={`flex flex-col items-center gap-1 transition-all relative ${
                  userTab === 'idcard' ? 'text-red-500' : 'text-zinc-500'
                }`}
                id="nav-user-idcard"
              >
                <CreditCard className="w-5.5 h-5.5" />
                <span className="text-[9px] font-extrabold tracking-wide uppercase">My Card</span>
                {userTab === 'idcard' && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setUserTab('profile')}
                className={`flex flex-col items-center gap-1 transition-all relative ${
                  userTab === 'profile' ? 'text-red-500' : 'text-zinc-500'
                }`}
                id="nav-user-profile"
              >
                <UserIcon className="w-5.5 h-5.5" />
                <span className="text-[9px] font-extrabold tracking-wide uppercase">Account</span>
                {userTab === 'profile' && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            </>
          )}

        </div>
      </nav>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
