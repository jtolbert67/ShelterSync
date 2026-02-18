
import React, { useState, useEffect, useCallback } from 'react';
import { Resident, MovementLog, AuthUser, KioskSettings } from './types';
import { storage } from './services/storage';
import { AdminDashboard } from './components/AdminDashboard';
import { KioskUI } from './components/KioskUI';
import { LoginModal } from './components/LoginModal';
import { LayoutDashboard, Tablet, ShieldAlert, LogOut, Lock } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'ADMIN' | 'KIOSK'>('KIOSK');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [logs, setLogs] = useState<MovementLog[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [kioskSettings, setKioskSettings] = useState<KioskSettings>(storage.getKioskSettings());

  // Initialize data
  useEffect(() => {
    setResidents(storage.getResidents());
    setLogs(storage.getLogs());
  }, []);

  const handleLogin = (username: string, pin: string) => {
    const staff = storage.getStaff();
    const user = staff.find(s => s.username === username && s.pin === pin);
    if (user) {
      setCurrentUser(user);
      setView('ADMIN');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('KIOSK');
  };

  const updateResidents = useCallback((newResidents: Resident[]) => {
    setResidents(newResidents);
    storage.saveResidents(newResidents);
  }, []);

  const handleUpdateResident = (updated: Resident) => {
    const next = residents.map(r => r.id === updated.id ? updated : r);
    updateResidents(next);
  };

  const handleAddResident = (newResident: Resident) => {
    updateResidents([newResident, ...residents]);
  };

  const handleDeleteResident = (id: string) => {
    if (confirm('Are you sure you want to delete this resident profile?')) {
      updateResidents(residents.filter(r => r.id !== id));
    }
  };

  const handleUpdateKioskSettings = (settings: KioskSettings) => {
    setKioskSettings(settings);
    storage.saveKioskSettings(settings);
  };

  const handleCheckIn = (id: string) => {
    const resident = residents.find(r => r.id === id);
    if (!resident) return;

    const updatedResident = {
      ...resident,
      isCheckedIn: true,
      lastActionAt: new Date().toISOString(),
      currentDestination: undefined,
      expectedReturnTime: undefined
    };

    const log = storage.addLog({
      residentId: id,
      residentName: resident.name,
      type: 'CHECK_IN',
      timestamp: new Date().toISOString()
    });

    handleUpdateResident(updatedResident);
    setLogs([log, ...logs]);
  };

  const handleCheckOut = (id: string, destination: string, eta: string) => {
    const resident = residents.find(r => r.id === id);
    if (!resident) return;

    const updatedResident = {
      ...resident,
      isCheckedIn: false,
      lastActionAt: new Date().toISOString(),
      currentDestination: destination,
      expectedReturnTime: eta
    };

    const log = storage.addLog({
      residentId: id,
      residentName: resident.name,
      type: 'CHECK_OUT',
      timestamp: new Date().toISOString(),
      destination,
      expectedReturnTime: eta
    });

    handleUpdateResident(updatedResident);
    setLogs([log, ...logs]);
  };

  const toggleView = (targetView: 'ADMIN' | 'KIOSK') => {
    if (targetView === 'ADMIN' && !currentUser) {
      setShowLogin(true);
      return;
    }
    setView(targetView);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2 font-bold text-indigo-600">
          <ShieldAlert size={24} />
          <span className="hidden sm:inline">ShelterSync</span>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => toggleView('KIOSK')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'KIOSK' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Tablet size={16} />
            Kiosk Mode
          </button>
          <button
            onClick={() => toggleView('ADMIN')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'ADMIN' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {currentUser ? <LayoutDashboard size={16} /> : <Lock size={16} />}
            Management
          </button>
        </div>
        <div className="flex items-center gap-4">
          {currentUser && (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={14} />
              Logout
            </button>
          )}
          <div className="hidden sm:block text-right text-[10px] text-gray-400 font-mono">
            V1.0.6-UI-CUSTOM
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {view === 'ADMIN' && currentUser ? (
          <AdminDashboard 
            residents={residents} 
            logs={logs}
            currentUser={currentUser}
            kioskSettings={kioskSettings}
            onUpdateResident={handleUpdateResident}
            onAddResident={handleAddResident}
            onDeleteResident={handleDeleteResident}
            onUpdateKioskSettings={handleUpdateKioskSettings}
          />
        ) : (
          <KioskUI 
            residents={residents}
            settings={kioskSettings}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
        )}
      </main>
      
      {showLogin && (
        <LoginModal 
          onLogin={handleLogin}
          onClose={() => setShowLogin(false)}
        />
      )}

      <footer className="bg-white border-t border-gray-100 py-3 px-6 text-xs text-gray-400 flex justify-between items-center">
        <div>
          System Auth: <span className={currentUser ? "text-indigo-500 font-bold" : "text-gray-400 font-medium"}>
            {currentUser ? `CONNECTED (${currentUser.role})` : "LOCKED"}
          </span>
        </div>
        <div className="flex gap-4">
          <span>Total Residents: {residents.length}</span>
          <span className="text-green-600">In: {residents.filter(r => r.isCheckedIn).length}</span>
          <span className="text-amber-600">Out: {residents.filter(r => !r.isCheckedIn).length}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
