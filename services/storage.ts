
import { Resident, MovementLog, AuthUser, KioskSettings } from '../types';
import { INITIAL_RESIDENTS } from '../constants';

const KEYS = {
  RESIDENTS: 'sheltersync_residents',
  LOGS: 'sheltersync_logs',
  STAFF: 'sheltersync_staff',
  KIOSK_SETTINGS: 'sheltersync_kiosk_settings'
};

const DEFAULT_STAFF: AuthUser[] = [
  { 
    id: 'admin1', 
    username: 'admin', 
    pin: '1234', 
    role: 'ADMIN', 
    name: 'System Admin',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    phone: '',
    email: 'admin@sheltersync.com',
    notes: 'Primary system administrator.'
  }
];

const DEFAULT_KIOSK_SETTINGS: KioskSettings = {
  title: 'Resident Check Point',
  subtitle: 'Please tap your name to check in or out.',
  backgroundUrl: '',
  overlayOpacity: 0.5
};

export const storage = {
  getResidents: (): Resident[] => {
    const data = localStorage.getItem(KEYS.RESIDENTS);
    return data ? JSON.parse(data) : INITIAL_RESIDENTS;
  },

  saveResidents: (residents: Resident[]) => {
    localStorage.setItem(KEYS.RESIDENTS, JSON.stringify(residents));
  },

  getLogs: (): MovementLog[] => {
    const data = localStorage.getItem(KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  },

  addLog: (log: Omit<MovementLog, 'id'>) => {
    const logs = storage.getLogs();
    const newLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    localStorage.setItem(KEYS.LOGS, JSON.stringify([newLog, ...logs].slice(0, 1000)));
    return newLog;
  },

  getStaff: (): AuthUser[] => {
    const data = localStorage.getItem(KEYS.STAFF);
    return data ? JSON.parse(data) : DEFAULT_STAFF;
  },

  saveStaff: (staff: AuthUser[]) => {
    localStorage.setItem(KEYS.STAFF, JSON.stringify(staff));
  },

  getKioskSettings: (): KioskSettings => {
    const data = localStorage.getItem(KEYS.KIOSK_SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_KIOSK_SETTINGS;
  },

  saveKioskSettings: (settings: KioskSettings) => {
    localStorage.setItem(KEYS.KIOSK_SETTINGS, JSON.stringify(settings));
  }
};
