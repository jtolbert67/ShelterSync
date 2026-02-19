
export type StatusColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'gray';
export type UserRole = 'STAFF' | 'ADMIN';

export interface Resident {
  id: string;
  name: string;
  photoUrl: string;
  statusText: string;
  statusColor: StatusColor;
  bio: string;
  gender: string;
  customFieldLabel: string;
  customFieldValue: string;
  isCheckedIn: boolean;
  lastActionAt: string;
  currentDestination?: string;
  expectedReturnTime?: string;
  expectedReturnDate?: string;
  notes: string;
}

export interface KioskSettings {
  title: string;
  subtitle: string;
  backgroundUrl: string;
  overlayOpacity: number;
}

export interface AuthUser {
  id: string;
  username: string;
  pin: string;
  role: UserRole;
  name: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface MovementLog {
  id: string;
  residentId: string;
  residentName: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'PROFILE_UPDATE';
  timestamp: string;
  performerName?: string;
  destination?: string;
  expectedReturnTime?: string;
  expectedReturnDate?: string;
  isLate?: boolean;
}

export interface AppState {
  residents: Resident[];
  logs: MovementLog[];
  view: 'ADMIN' | 'KIOSK';
  currentUser: AuthUser | null;
  kioskSettings: KioskSettings;
}
