import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { Html5Qrcode } from 'html5-qrcode';
import { Key, QrCode, Shield, Eye, EyeOff, Sparkles, Upload } from 'lucide-react';

export default function Login() {
  const { setCurrentUser, showToast, usersList, refreshUsers } = useApp();
  const [portalMode, setPortalMode] = useState<'employee' | 'admin'>('employee');
  const [activeTab, setActiveTab] = useState<'credentials' | 'qr'>('credentials');
  
  // Admin passcode state
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);

  // Credentials Auth state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // QR Auth state
  const [qrMode, setQrMode] = useState<'camera' | 'upload'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    refreshUsers(); // Load latest users
  }, []);

  // Cleanup scanner on unmount, portal switch or tab switch
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [activeTab, qrMode, portalMode]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPasscode = adminPasscode.trim();

    if (!finalPasscode) {
      showToast('Please enter the Admin passcode.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      if (finalPasscode === '7277' || finalPasscode === 'adminpassword') {
        // Find admin user in database
        const adminUser = usersList.find(u => u.role === 'admin');
        if (adminUser) {
          if (adminUser.status === 'disabled') {
            showToast('The Admin account is currently disabled.', 'error');
          } else {
            showToast(`Welcome back, ${adminUser.name}!`, 'success');
            setCurrentUser(adminUser);
          }
        } else {
          // Fallback if seeded admin doesn't load immediately
          showToast('Loading Admin profile...', 'info');
          await refreshUsers();
          const recheckAdmin = usersList.find(u => u.role === 'admin');
          if (recheckAdmin) {
            setCurrentUser(recheckAdmin);
          } else {
            showToast('No Admin account found in the system. Seed Initial Data first.', 'error');
          }
        }
      } else {
        showToast('Invalid passcode. Access Denied.', 'error');
      }
    } catch (err) {
      showToast('Login error. Please try again.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUsername = username.trim();
    const finalPassword = password.trim();

    if (!finalUsername || !finalPassword) {
      showToast('Please enter both username and password.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      // Find matching employee/user in database
      const matchedUser = usersList.find(
        u => u.username && u.username.toLowerCase() === finalUsername.toLowerCase() && u.password === finalPassword
      );

      if (matchedUser) {
        if (matchedUser.status === 'disabled') {
          showToast('This account has been disabled by the admin.', 'error');
        } else {
          showToast(`Welcome back, ${matchedUser.name}!`, 'success');
          setCurrentUser(matchedUser);
        }
      } else {
        showToast('Invalid username or password.', 'error');
      }
    } catch (err) {
      showToast('Login error. Please try again.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const startCameraScanner = async () => {
    try {
      setIsScanning(true);
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          handleQRSuccess(decodedText);
        },
        () => {
          // Keep scanning silently
        }
      );
    } catch (err: any) {
      console.error("Camera scan start error:", err);
      showToast("Could not access camera. Please allow camera permissions or upload an image instead.", "error");
      setIsScanning(false);
      setQrMode('upload');
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error("Error stopping scanner", e);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleQRSuccess = (userId: string) => {
    stopCameraScanner();
    
    // Find user by ID
    const matchedUser = usersList.find(u => u.id === userId || u.employeeId === userId);
    
    if (matchedUser) {
      if (matchedUser.status === 'disabled') {
        showToast('This account is disabled. Contact Admin.', 'error');
      } else {
        showToast(`QR Code Verified! Welcome, ${matchedUser.name}`, 'success');
        setCurrentUser(matchedUser);
      }
    } else {
      showToast('Invalid QR Code. User not found.', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Processing QR image...', 'info');
      const html5QrCode = new Html5Qrcode("file-reader-dummy");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleQRSuccess(decodedText);
    } catch (err) {
      console.error(err);
      showToast('Could not find a valid QR Code in this image.', 'error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0C] text-white px-4 py-8 select-none relative overflow-hidden">
      {/* Dynamic Ambient Accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-red-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-red-600/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800/80 rounded-3xl backdrop-blur-2xl shadow-2xl p-8 relative z-10">
        
        {/* Company Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-red-800 shadow-lg shadow-red-600/30 mb-3 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">AmitAten</h1>
          <p className="text-zinc-500 text-xs font-mono tracking-wider uppercase">Android Premium Attendance</p>
        </div>

        {/* Portal Mode Selector (Employee vs Admin) */}
        <div className="flex p-1 bg-black/40 rounded-2xl border border-zinc-800/50 mb-6">
          <button
            type="button"
            onClick={() => setPortalMode('employee')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
              portalMode === 'employee'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            id="portal-employee"
          >
            Employee Portal
          </button>
          <button
            type="button"
            onClick={() => setPortalMode('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
              portalMode === 'admin'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            id="portal-admin"
          >
            <Shield className="w-4 h-4 text-amber-500" />
            Admin Portal
          </button>
        </div>

        {/* Admin Login Portal */}
        {portalMode === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-5 animate-fadeIn">
            <div>
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Admin Passcode</label>
              <div className="relative">
                <input
                  type={showAdminPasscode ? "text" : "password"}
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  maxLength={12}
                  className="w-full px-4 py-3.5 bg-black/40 border border-zinc-800 rounded-2xl text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-white placeholder-zinc-600"
                  id="input-admin-passcode"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showAdminPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 mt-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 font-bold text-sm tracking-wide text-white border border-zinc-700/50 shadow-xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
              id="btn-admin-submit"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Login as Admin'
              )}
            </button>
          </form>
        )}

        {/* Employee Login Portal */}
        {portalMode === 'employee' && (
          <div className="animate-fadeIn">
            {/* Custom iOS/Android Segmented Tab Control */}
            <div className="flex p-1 bg-black/40 rounded-2xl border border-zinc-800/50 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('credentials')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  activeTab === 'credentials'
                    ? 'bg-zinc-800 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                id="tab-login-credentials"
              >
                <Key className="w-4 h-4" />
                Password
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  activeTab === 'qr'
                    ? 'bg-zinc-800 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                id="tab-login-qr"
              >
                <QrCode className="w-4 h-4" />
                QR Code ID
              </button>
            </div>

            {/* Tab 1: Username & Password Login */}
            {activeTab === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter employee username"
                      className="w-full px-4 py-3.5 bg-black/40 border border-zinc-800 rounded-2xl text-sm font-medium focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-white placeholder-zinc-600"
                      id="input-username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-12 py-3.5 bg-black/40 border border-zinc-800 rounded-2xl text-sm font-medium focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-white placeholder-zinc-600"
                      id="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-4 mt-2 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 font-bold text-sm tracking-wide text-white shadow-xl shadow-red-600/10 transition-all duration-300 hover:shadow-red-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                  id="btn-login-submit"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Access System'
                  )}
                </button>
              </form>
            )}

            {/* Tab 2: QR Code Scan Login */}
            {activeTab === 'qr' && (
              <div className="flex flex-col items-center">
                {/* Mode Switcher */}
                <div className="flex border border-zinc-800 rounded-xl p-0.5 bg-black/30 mb-6 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraScanner();
                      setQrMode('camera');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      qrMode === 'camera' ? 'bg-zinc-800 text-white' : 'text-zinc-500'
                    }`}
                    id="btn-qr-mode-camera"
                  >
                    Live Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraScanner();
                      setQrMode('upload');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      qrMode === 'upload' ? 'bg-zinc-800 text-white' : 'text-zinc-500'
                    }`}
                    id="btn-qr-mode-upload"
                  >
                    Upload ID Image
                  </button>
                </div>

                {qrMode === 'camera' ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="relative w-64 h-64 bg-black/50 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col items-center justify-center mb-6 shadow-inner">
                      {/* Neon QR guide corners */}
                      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-red-500 rounded-tl-md z-20" />
                      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-red-500 rounded-tr-md z-20" />
                      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-red-500 rounded-bl-md z-20" />
                      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-red-500 rounded-br-md z-20" />
                      
                      {isScanning && (
                        <div className="absolute left-0 w-full h-1 bg-red-500/80 blur-xs animate-scanner z-10" />
                      )}

                      <div id="reader" className="w-full h-full object-cover"></div>

                      {!isScanning && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-zinc-950/90 text-center">
                          <QrCode className="w-12 h-12 text-zinc-600 mb-3" />
                          <p className="text-zinc-400 text-xs mb-4">Click below to activate employee badge reader</p>
                        </div>
                      )}
                    </div>

                    {!isScanning ? (
                      <button
                        type="button"
                        onClick={startCameraScanner}
                        className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-all shadow-md active:scale-95 flex items-center gap-2"
                        id="btn-start-camera"
                      >
                        <Sparkles className="w-4 h-4" />
                        Activate Camera
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopCameraScanner}
                        className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-all active:scale-95"
                        id="btn-stop-camera"
                      >
                        Turn Off Camera
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-12 px-6 bg-black/40 border border-dashed border-zinc-800 hover:border-red-500/50 rounded-2xl cursor-pointer flex flex-col items-center justify-center group transition-colors mb-6"
                    >
                      <Upload className="w-12 h-12 text-zinc-600 group-hover:text-red-500 mb-3 transition-colors" />
                      <p className="text-zinc-400 text-xs font-bold mb-1">Click to browse your device</p>
                      <p className="text-zinc-600 text-[10px] uppercase tracking-wider font-mono">Supports PNG, JPG, JPEG with QR Code</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <div id="file-reader-dummy" className="hidden"></div>
                  </div>
                )}

                <p className="text-zinc-500 text-[11px] text-center mt-4 max-w-xs leading-relaxed">
                  Every employee receives a printable ID Card containing a unique login credentials barcode. Present the badge to log in instantly.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* App Credentials Helper Hint for immediate, out-of-the-box usage */}
      
  );
}
