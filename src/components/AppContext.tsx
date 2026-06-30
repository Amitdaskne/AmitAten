import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, CompanySettings, ToastMessage } from '../types';
import { seedInitialData, getAllUsers, getCompanySettings } from '../firebase/dbService';

interface ConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  companySettings: CompanySettings | null;
  refreshSettings: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  confirmModal: ConfirmState | null;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirm: () => void;
  usersList: User[];
  refreshUsers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Seed DB and fetch initial settings and users
  useEffect(() => {
    async function initApp() {
      try {
        setLoading(true);
        await seedInitialData();
        const settings = await getCompanySettings();
        setCompanySettings(settings);
        const users = await getAllUsers();
        setUsersList(users);

        // Recover session from session storage if page reloaded
        const cachedUser = sessionStorage.getItem('amitaten_user');
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser);
            // Re-fetch current state to make sure status is accurate
            const freshUser = users.find(u => u.id === parsed.id);
            if (freshUser) {
              if (freshUser.status === 'disabled') {
                showToast('Your account is disabled. Contact your administrator.', 'error');
                sessionStorage.removeItem('amitaten_user');
              } else {
                setCurrentUser(freshUser);
              }
            } else {
              setCurrentUser(parsed);
            }
          } catch (e) {
            console.error('Failed to parse cached session', e);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    initApp();
  }, []);

  const refreshSettings = async () => {
    const settings = await getCompanySettings();
    setCompanySettings(settings);
  };

  const refreshUsers = async () => {
    const users = await getAllUsers();
    setUsersList(users);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove toast after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmModal(null);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser: (user) => {
        setCurrentUser(user);
        if (user) {
          sessionStorage.setItem('amitaten_user', JSON.stringify(user));
        } else {
          sessionStorage.removeItem('amitaten_user');
        }
      },
      loading,
      setLoading,
      companySettings,
      refreshSettings,
      toasts,
      showToast,
      confirmModal,
      showConfirm,
      closeConfirm,
      usersList,
      refreshUsers
    }}>
      {children}
      
      {/* Dynamic Glassmorphism Toast Overlay */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl animate-bounce-in
              ${toast.type === 'success' ? 'bg-zinc-900/90 text-emerald-400 border-emerald-500/30' : ''}
              ${toast.type === 'error' ? 'bg-zinc-900/90 text-red-500 border-red-500/30' : ''}
              ${toast.type === 'info' ? 'bg-zinc-900/90 text-sky-400 border-sky-500/30' : ''}
            `}
          >
            {toast.type === 'success' && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            )}
            {toast.type === 'error' && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            )}
            {toast.type === 'info' && (
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
            )}
            <span className="text-sm font-medium text-white">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Modern Android Glassmorphism Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-white mb-2">{confirmModal.title}</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeConfirm}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                id="btn-confirm-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  closeConfirm();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors shadow-lg shadow-red-600/20 active:scale-95"
                id="btn-confirm-yes"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
