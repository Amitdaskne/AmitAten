import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { saveCompanySettings, getAllUsers, saveUser } from '../firebase/dbService';
import { uploadToCloudinary } from '../cloudinary/upload';
import { CompanySettings } from '../types';
import { 
  Save, Building, Clock, MapPin, ShieldAlert, Download, 
  Upload, LogOut, CheckCircle, RefreshCw, Palette
} from 'lucide-react';

export default function SettingsView() {
  const { companySettings, refreshSettings, setCurrentUser, showToast, usersList, refreshUsers } = useApp();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CompanySettings>({
    companyName: '',
    companyLogo: '',
    officeAddress: '',
    officeTimingStart: '09:00',
    officeTimingEnd: '17:00',
    lateGraceMinutes: 15,
    halfDayHours: 4,
    fullDayHours: 8,
    weekendDays: [0, 6]
  });

  useEffect(() => {
    if (companySettings) {
      setFormData(companySettings);
    }
  }, [companySettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      showToast('Uploading company logo to Cloudinary...', 'info');
      const url = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, companyLogo: url }));
      showToast('Company logo updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Logo upload failed.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveCompanySettings(formData);
      showToast('Company rules and settings updated!', 'success');
      await refreshSettings();
    } catch (err) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Full Database Backup
  const handleBackup = () => {
    try {
      showToast('Compiling secure backup data...', 'info');
      const backupData = {
        settings: formData,
        users: usersList,
        timestamp: Date.now(),
        version: '1.0.0'
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `AmitAten_DB_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Database Backup file downloaded!', 'success');
    } catch (e) {
      showToast('Backup compilation failed.', 'error');
    }
  };

  // Database Restore from JSON
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.settings || !json.users) {
          showToast('Invalid backup file format.', 'error');
          return;
        }

        showToast('Restoring database settings...', 'info');
        // Restore settings
        await saveCompanySettings(json.settings);
        
        // Restore users
        showToast('Restoring employee database...', 'info');
        for (const u of json.users) {
          await saveUser(u);
        }

        showToast('Database completely restored! Syncing state...', 'success');
        await refreshSettings();
        await refreshUsers();
      } catch (err) {
        showToast('Failed to parse or restore backup.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full space-y-6 pb-24">
      
      {/* Settings Form Card */}
      <form onSubmit={handleFormSubmit} className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-850 space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-tight">System Settings</h2>
          <p className="text-xs text-zinc-500">Modify corporate credentials, working hours, and grace limits</p>
        </div>

        {/* Logo Upload Section */}
        <div className="flex items-center gap-4 bg-black/35 p-4 rounded-2xl border border-zinc-850/60">
          <div className="relative shrink-0">
            {formData.companyLogo ? (
              <img src={formData.companyLogo} referrerPolicy="no-referrer" className="w-14 h-14 rounded-xl object-cover border border-zinc-800" alt="Logo Preview" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center font-extrabold text-white text-sm">
                AA
              </div>
            )}
            {uploadingLogo && (
              <div className="absolute inset-0 bg-black/85 rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Corporate Logo</span>
            <p className="text-[10px] text-zinc-500 mb-2">Display logo for premium printable ID badges</p>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-[10px] font-bold text-white transition-colors"
            >
              Upload New Logo
            </button>
            <input
              type="file"
              ref={logoInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Company and Site Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Company Name */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Company Name</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
              />
              <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            </div>
          </div>

          {/* Office site Address */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Corporate Headquarters Address</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.officeAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, officeAddress: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
              />
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            </div>
          </div>
        </div>

        {/* Timings and Grace rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Shift start */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Official Shift Start</label>
            <div className="relative">
              <input
                type="time"
                required
                value={formData.officeTimingStart}
                onChange={(e) => setFormData(prev => ({ ...prev, officeTimingStart: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 font-mono"
              />
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            </div>
          </div>

          {/* Shift End */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Official Shift End</label>
            <div className="relative">
              <input
                type="time"
                required
                value={formData.officeTimingEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, officeTimingEnd: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 font-mono"
              />
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Grace minutes */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Grace Minutes Limit</label>
            <input
              type="number"
              required
              value={formData.lateGraceMinutes}
              onChange={(e) => setFormData(prev => ({ ...prev, lateGraceMinutes: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-black/40 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 font-mono"
            />
          </div>

          {/* Half day threshold */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Half Day Hours Threshold</label>
            <input
              type="number"
              required
              value={formData.halfDayHours}
              onChange={(e) => setFormData(prev => ({ ...prev, halfDayHours: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-black/40 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 font-mono"
            />
          </div>

          {/* Full day requirement */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Full Day Target Hours</label>
            <input
              type="number"
              required
              value={formData.fullDayHours}
              onChange={(e) => setFormData(prev => ({ ...prev, fullDayHours: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-black/40 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 font-mono"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 border-t border-zinc-850">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-extrabold text-xs tracking-wider transition-all flex items-center justify-center gap-2"
            id="btn-save-settings"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Commit Corporate Rules
              </>
            )}
          </button>
        </div>
      </form>

      {/* BACKUP & RESTORE UTILITIES */}
      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-850 space-y-5">
        <div>
          <h3 className="text-xs font-black uppercase text-white tracking-widest">Disaster Recovery & Sync</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Maintain system-wide backups of settings and employee rosters</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Backup */}
          <div className="p-4 rounded-2xl bg-black/25 border border-zinc-900 flex flex-col justify-between items-start gap-3">
            <div>
              <span className="text-xs font-bold text-white block">Compile System Backup</span>
              <span className="text-[10px] text-zinc-500 block mt-1">Serializes employee rosters, settings, and structural metadata into an encrypted JSON file for download.</span>
            </div>
            <button
              onClick={handleBackup}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold transition-all active:scale-95 border border-zinc-750"
              id="btn-backup-db"
            >
              <Download className="w-4 h-4 text-red-500" />
              Download Backup JSON
            </button>
          </div>

          {/* Restore */}
          <div className="p-4 rounded-2xl bg-black/25 border border-zinc-900 flex flex-col justify-between items-start gap-3">
            <div>
              <span className="text-xs font-bold text-white block">Restore System Backup</span>
              <span className="text-[10px] text-zinc-500 block mt-1">Upload a previously compiled backup file to instantly override current cloud database settings and records.</span>
            </div>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold cursor-pointer transition-all active:scale-95 border border-zinc-750">
              <Upload className="w-4 h-4 text-red-500" />
              Upload Backup File
              <input
                type="file"
                onChange={handleRestore}
                accept=".json"
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* ACTIVE THEME INFO */}
      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-850 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-zinc-850 border border-zinc-800 text-red-500">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Active UI Skin</span>
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase">Premium Slate Dark (Black, White, Red Accents)</span>
          </div>
        </div>
        <span className="px-2.5 py-1 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
          Default Active
        </span>
      </div>

    </div>
  );
}
