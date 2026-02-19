
import React, { useState, useRef, useCallback } from 'react';
import { Resident, MovementLog, StatusColor, AuthUser, UserRole, KioskSettings } from '../types';
import { STATUS_COLORS, COLOR_PICKER_OPTIONS, GENDER_OPTIONS } from '../constants';
import { Plus, Edit2, Trash2, Search, History, User, Sparkles, X, Save, BarChart3, Users as UsersIcon, ArrowUpRight, ShieldCheck, Key, Settings as SettingsIcon, Image as ImageIcon, Camera, AlertCircle, Calendar, MapPin, Clock, LogIn, LogOut, Phone, Mail, FileText, Eye, EyeOff } from 'lucide-react';
import { improveBio } from '../services/geminiService';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { storage } from '../services/storage';

interface AdminDashboardProps {
  residents: Resident[];
  logs: MovementLog[];
  currentUser: AuthUser | null;
  kioskSettings: KioskSettings;
  onUpdateResident: (resident: Resident) => void;
  onAddResident: (resident: Resident) => void;
  onDeleteResident: (id: string) => void;
  onUpdateKioskSettings: (settings: KioskSettings) => void;
  onCheckIn?: (id: string) => void;
}

type AdminView = 'RESIDENTS' | 'LOGS' | 'ANALYTICS' | 'STAFF' | 'SETTINGS';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  residents, logs, currentUser, kioskSettings, onUpdateResident, onAddResident, onDeleteResident, onUpdateKioskSettings, onCheckIn
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [editingStaff, setEditingStaff] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<AdminView>('RESIDENTS');
  const [isImproving, setIsImproving] = useState(false);
  const [staff, setStaff] = useState<AuthUser[]>(storage.getStaff());
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  
  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const isOverdue = (resident: Resident) => {
    if (resident.isCheckedIn) return false;
    if (!resident.expectedReturnDate || !resident.expectedReturnTime) return false;
    
    const returnDateTime = new Date(`${resident.expectedReturnDate}T${resident.expectedReturnTime}`);
    return new Date() > returnDateTime;
  };

  const isBlackout = (resident: Resident) => {
    return !resident.isCheckedIn && resident.statusText.toLowerCase() === 'blackout';
  };

  const sortedResidents = [...residents].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    const aBlackout = isBlackout(a);
    const bBlackout = isBlackout(b);
    if (aBlackout && !bBlackout) return -1;
    if (!aBlackout && bBlackout) return 1;

    return a.name.localeCompare(b.name);
  });

  const filteredResidents = sortedResidents.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.gender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      if (editingStaff.id === '__new_staff__') {
        // Handle staged creation
        const realStaff = {
          ...editingStaff,
          id: Math.random().toString(36).substr(2, 9)
        };
        const nextStaff = [...staff, realStaff];
        setStaff(nextStaff);
        storage.saveStaff(nextStaff);
      } else {
        // Handle normal update
        const nextStaff = staff.map(s => s.id === editingStaff.id ? editingStaff : s);
        setStaff(nextStaff);
        storage.saveStaff(nextStaff);
      }
      setEditingStaff(null);
      stopCamera();
    }
  };

  const handleAddStaff = () => {
    if (!isAdmin) return;
    const newStaff: AuthUser = {
      id: '__new_staff__', // Use flag ID
      name: '',
      username: '',
      pin: '1234',
      role: 'STAFF',
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
      phone: '',
      email: '',
      notes: ''
    };
    // Do not update 'staff' array yet
    setEditingStaff(newStaff);
  };

  const handleDeleteStaff = (id: string) => {
    if (!isAdmin) return;
    if (id === currentUser?.id) return alert("You cannot delete your own account.");
    if (confirm("Are you sure you want to delete this staff account? This action is immediate and cannot be undone.")) {
      const nextStaff = staff.filter(s => s.id !== id);
      setStaff(nextStaff);
      storage.saveStaff(nextStaff);
    }
  };

  const togglePinVisibility = (id: string) => {
    const isOwnProfile = id === currentUser?.id;
    if (!isAdmin && !isOwnProfile) return;
    setShowPin(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResident) {
      if (editingResident.id === '__new__') {
        // Replace temp ID with a real one
        const realResident = {
          ...editingResident,
          id: Math.random().toString(36).substr(2, 9)
        };
        onAddResident(realResident);
      } else {
        onUpdateResident(editingResident);
      }
      setEditingResident(null);
      stopCamera();
    }
  };

  const handleAddResident = (e: React.FormEvent) => {
    e.preventDefault();
    const newResident: Resident = {
      id: '__new__', // Use a flag ID to indicate it's not yet in the list
      name: '',
      photoUrl: `https://picsum.photos/seed/${Math.random()}/200`,
      statusText: 'New',
      statusColor: 'blue',
      bio: '',
      gender: 'Other',
      customFieldLabel: 'Notes',
      customFieldValue: '',
      isCheckedIn: true,
      lastActionAt: new Date().toISOString(),
      notes: ''
    };
    // Do NOT call onAddResident here so the tile doesn't appear yet
    setEditingResident(newResident);
  };

  const handleImproveBio = async () => {
    if (!editingResident) return;
    setIsImproving(true);
    const betterBio = await improveBio(editingResident.bio, editingResident.name);
    setEditingResident({ ...editingResident, bio: betterBio });
    setIsImproving(false);
  };

  const calculateLateDelta = (actualTimestamp: string, expDate?: string, expTime?: string) => {
    if (!expDate || !expTime) return null;
    const actual = new Date(actualTimestamp);
    const expected = new Date(`${expDate}T${expTime}`);
    const diffMs = actual.getTime() - expected.getTime();
    if (diffMs <= 0) return null;

    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) return `${hours}h ${mins}m late`;
    return `${mins}m late`;
  };

  // Camera Logic
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        if (editingResident) setEditingResident({ ...editingResident, photoUrl: dataUrl });
        if (editingStaff) setEditingStaff({ ...editingStaff, photoUrl: dataUrl });
        stopCamera();
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white">
             {activeTab === 'STAFF' ? <ShieldCheck /> : 
              activeTab === 'SETTINGS' ? <SettingsIcon /> :
              <UsersIcon />}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shelter Management</h1>
            <p className="text-gray-500">
              Logged in as <span className="text-indigo-600 font-bold">{currentUser?.name}</span>
            </p>
          </div>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveTab('RESIDENTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-sm whitespace-nowrap ${activeTab === 'RESIDENTS' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <UsersIcon size={16} />
            Residents
          </button>
          <button 
            onClick={() => setActiveTab('ANALYTICS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-sm whitespace-nowrap ${activeTab === 'ANALYTICS' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <BarChart3 size={16} />
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('LOGS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-sm whitespace-nowrap ${activeTab === 'LOGS' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <History size={16} />
            Logs
          </button>
          <button 
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-sm whitespace-nowrap ${activeTab === 'SETTINGS' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <SettingsIcon size={16} />
            Kiosk UI
          </button>
          <button 
            onClick={() => setActiveTab('STAFF')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-sm whitespace-nowrap ${activeTab === 'STAFF' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <ShieldCheck size={16} />
            Staff
          </button>
        </div>
      </div>

      {activeTab === 'ANALYTICS' && (
        <AnalyticsDashboard logs={logs} residents={residents} />
      )}

      {activeTab === 'SETTINGS' && (
        <div className="max-w-2xl bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Kiosk Customization</h3>
            <p className="text-gray-500">Change how the front-end check-in interface appears to residents.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Main Display Title</label>
              <input
                type="text"
                className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                value={kioskSettings.title}
                onChange={e => onUpdateKioskSettings({...kioskSettings, title: e.target.value})}
                placeholder="e.g. Welcome Home"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Header Instructions</label>
              <textarea
                className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium min-h-[80px]"
                value={kioskSettings.subtitle}
                onChange={e => onUpdateKioskSettings({...kioskSettings, subtitle: e.target.value})}
                placeholder="e.g. Please tap your name to continue..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Background Image URL</label>
              <div className="relative">
                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  className="w-full pl-12 pr-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                  value={kioskSettings.backgroundUrl}
                  onChange={e => onUpdateKioskSettings({...kioskSettings, backgroundUrl: e.target.value})}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              <p className="text-[10px] text-gray-400 italic">Leave empty for default gray background.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Overlay Intensity</label>
                <span className="text-xs font-bold text-indigo-600">{Math.round(kioskSettings.overlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                value={kioskSettings.overlayOpacity}
                onChange={e => onUpdateKioskSettings({...kioskSettings, overlayOpacity: parseFloat(e.target.value)})}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'STAFF' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div>
              <h3 className="text-xl font-bold">Staff Directory</h3>
              <p className="text-sm text-gray-500">Contact information and team directory</p>
            </div>
            {isAdmin && (
              <button 
                onClick={handleAddStaff}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Plus size={18} /> Add User
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map(s => {
              const isOwnProfile = s.id === currentUser?.id;
              const canEdit = isAdmin || isOwnProfile;
              const canViewPin = isAdmin || isOwnProfile;
              
              return (
                <div key={s.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 relative group">
                  <div className="flex justify-between items-start">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100">
                      <img src={s.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + s.username} alt={s.name} className="w-full h-full object-cover" />
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-widest ${s.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {s.role}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-gray-900">{s.name}</h4>
                    <p className="text-sm font-medium text-gray-400">@{s.username}</p>
                  </div>
                  <div className="flex flex-col gap-2 text-xs font-bold text-gray-500">
                    <div className="flex items-center gap-2"><Phone size={14} className="text-indigo-400" /> {s.phone || 'No phone set'}</div>
                    <div className="flex items-center gap-2"><Mail size={14} className="text-indigo-400" /> {s.email || 'No email set'}</div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key size={14} className="text-gray-400" />
                      {canViewPin ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold bg-gray-50 px-2 py-1 rounded-md">
                            {showPin[s.id] ? s.pin : '••••'}
                          </span>
                          <button onClick={() => togglePinVisibility(s.id)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                            {showPin[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-bold bg-gray-50 px-2 py-1 rounded-md text-gray-300">PROTECTED</span>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      {canEdit && (
                        <button onClick={() => setEditingStaff(s)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                          <Edit2 size={18} />
                        </button>
                      )}
                      {isAdmin && !isOwnProfile && (
                        <button onClick={() => handleDeleteStaff(s.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'RESIDENTS' && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or gender..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={handleAddResident}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={20} />
              Add Resident
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResidents.map(resident => {
              const overdue = isOverdue(resident);
              const blackout = isBlackout(resident);
              return (
                <div 
                  key={resident.id} 
                  className={`bg-white rounded-3xl border-4 overflow-hidden hover:shadow-xl transition-all group relative ${resident.isCheckedIn ? 'border-green-500' : 'border-red-500'} ${overdue ? 'animate-pulse shadow-2xl shadow-red-200' : (blackout ? 'shadow-lg border-orange-500 ring-2 ring-orange-100' : 'shadow-sm')}`}
                >
                  {overdue && (
                    <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[10px] font-black uppercase py-1 px-4 flex items-center justify-center gap-2 z-10">
                      <AlertCircle size={12} /> Overdue Return
                    </div>
                  )}
                  {blackout && !overdue && (
                    <div className="absolute top-0 left-0 right-0 bg-orange-500 text-white text-[10px] font-black uppercase py-1 px-4 flex items-center justify-center gap-2 z-10">
                      <ShieldCheck size={12} /> Blackout Alert
                    </div>
                  )}
                  <div className="p-6 pt-8">
                    <div className="flex items-start gap-4">
                      <img 
                        src={resident.photoUrl} 
                        alt={resident.name} 
                        className="w-16 h-16 rounded-2xl object-cover ring-4 ring-gray-50"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg text-gray-900 truncate">{resident.name}</h3>
                        </div>
                        <p className="text-sm text-gray-400 font-medium">{resident.gender}</p>
                        <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[resident.statusColor]}`}>
                          {resident.statusText}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`mt-6 p-4 rounded-2xl flex flex-col gap-2 ${overdue ? 'bg-red-50' : (blackout ? 'bg-orange-50' : 'bg-gray-50')}`}>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className={`flex items-center gap-1.5 ${resident.isCheckedIn ? 'text-green-600' : 'text-red-600'}`}>
                          <div className={`w-2 h-2 rounded-full animate-pulse ${resident.isCheckedIn ? 'bg-green-500' : 'bg-red-500'}`} />
                          {resident.isCheckedIn ? 'IN BUILDING' : 'OUT'}
                        </span>
                        {!resident.isCheckedIn && resident.expectedReturnTime && (
                          <div className="text-right">
                            <p className={overdue ? 'text-red-700 font-black' : 'text-gray-400'}>
                              ETA: {resident.expectedReturnTime}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {!resident.isCheckedIn && (
                        <div className="border-t border-gray-100 pt-2 space-y-1">
                          {resident.currentDestination && (
                            <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                              <MapPin size={12} className="text-indigo-400" />
                              <span className="truncate">To: {resident.currentDestination}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                    <div className="flex gap-1">
                      <button onClick={() => setEditingResident(resident)} className="p-2 bg-white/80 backdrop-blur shadow-sm rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDeleteResident(resident.id)} className="p-2 bg-white/80 backdrop-blur shadow-sm rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {!resident.isCheckedIn && (
                      <button 
                        onClick={() => onCheckIn?.(resident.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg font-bold text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all whitespace-nowrap"
                      >
                        <LogIn size={12} />
                        Staff Check In
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="px-8 py-5">Resident</th>
                  <th className="px-8 py-5">Action</th>
                  <th className="px-8 py-5">Performed By</th>
                  <th className="px-8 py-5">Timestamp</th>
                  <th className="px-8 py-5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => {
                  const lateDelta = log.type === 'CHECK_IN' ? calculateLateDelta(log.timestamp, log.expectedReturnDate, log.expectedReturnTime) : null;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-5 font-bold text-gray-900">{log.residentName}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${log.type === 'CHECK_IN' ? 'bg-green-100 text-green-700' : log.type === 'CHECK_OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {log.type.replace('_', ' ')}
                          </span>
                          {log.isLate && (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white animate-pulse shadow-sm shadow-red-200">
                              LATE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                          <User size={14} className="text-gray-400" />
                          {log.performerName || 'System'}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-8 py-5 text-sm text-gray-400 font-medium">
                        {log.type === 'CHECK_OUT' ? (
                          <span className="flex items-center gap-1"><ArrowUpRight size={14} /> {log.destination} (ETA: {log.expectedReturnTime} {log.expectedReturnDate && `on ${log.expectedReturnDate}`})</span>
                        ) : log.type === 'CHECK_IN' ? (
                          log.isLate ? (
                            <div className="flex flex-col text-red-500 font-bold">
                              <span className="flex items-center gap-1"><AlertCircle size={14} /> Returned {lateDelta}</span>
                              <span className="text-[10px] text-gray-400 font-medium">Expected: {log.expectedReturnTime} ({log.expectedReturnDate})</span>
                            </div>
                          ) : '-'
                        ) : (
                          <span className="italic">Resident information updated</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Editor Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <ShieldCheck className="text-indigo-600" />
                {editingStaff.id === '__new_staff__' ? 'New Staff Profile' : 'Staff Profile Editor'}
              </h2>
              <button onClick={() => { setEditingStaff(null); stopCamera(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveStaff} className="overflow-y-auto p-8 flex-1 space-y-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                   {isCameraActive ? (
                      <div className="w-40 h-40 rounded-[32px] overflow-hidden bg-black border-4 border-indigo-100">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button type="button" onClick={capturePhoto} className="p-4 bg-white text-indigo-600 rounded-full shadow-xl hover:scale-110 transition-transform">
                             <Camera size={28} />
                           </button>
                        </div>
                      </div>
                   ) : (
                    <div className="relative">
                      <img 
                        src={editingStaff.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + editingStaff.username} 
                        alt={editingStaff.name} 
                        className="w-40 h-40 rounded-[32px] object-cover ring-8 ring-gray-50 shadow-xl"
                      />
                      <button 
                        type="button"
                        onClick={startCamera}
                        className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all hover:scale-110"
                      >
                        <Camera size={20} />
                      </button>
                    </div>
                   )}
                </div>
                {isCameraActive && (
                  <button type="button" onClick={stopCamera} className="text-xs font-bold text-red-500 hover:underline">Cancel Camera</button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      required
                      className="w-full pl-12 pr-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                      value={editingStaff.name}
                      onChange={e => setEditingStaff({...editingStaff, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Username</label>
                  <input
                    type="text"
                    required
                    readOnly={!isAdmin && editingStaff.id !== '__new_staff__'}
                    className={`w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold ${(!isAdmin && editingStaff.id !== '__new_staff__') && 'opacity-60 cursor-not-allowed'}`}
                    value={editingStaff.username}
                    onChange={e => setEditingStaff({...editingStaff, username: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="tel"
                      className="w-full pl-12 pr-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                      value={editingStaff.phone || ''}
                      onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})}
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      className="w-full pl-12 pr-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                      value={editingStaff.email || ''}
                      onChange={e => setEditingStaff({...editingStaff, email: e.target.value})}
                      placeholder="staff@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {(isAdmin || editingStaff.id === currentUser?.id || editingStaff.id === '__new_staff__') && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Staff PIN</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        className="w-full pl-12 pr-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                        value={editingStaff.pin}
                        onChange={e => setEditingStaff({...editingStaff, pin: e.target.value})}
                      />
                    </div>
                  </div>
                )}
                {(isAdmin || editingStaff.id === '__new_staff__') && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Role</label>
                    <select
                      className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                      value={editingStaff.role}
                      onChange={e => setEditingStaff({...editingStaff, role: e.target.value as UserRole})}
                    >
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Staff Notes</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-gray-400" size={20} />
                  <textarea
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[100px] font-medium"
                    value={editingStaff.notes || ''}
                    onChange={e => setEditingStaff({...editingStaff, notes: e.target.value})}
                    placeholder="Add internal staff notes here..."
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => { setEditingStaff(null); stopCamera(); }}
                  className="flex-1 px-8 py-4 rounded-2xl border-2 border-gray-100 font-bold text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                >
                  <Save size={20} />
                  {editingStaff.id === '__new_staff__' ? 'Create Staff Account' : 'Save Staff Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resident Editor Modal */}
      {editingResident && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                  <User className="text-indigo-600" />
                  {editingResident.id === '__new__' ? 'New Resident Profile' : 'Profile Editor'}
                </h2>
                {editingResident.id !== '__new__' && (
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${editingResident.isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {editingResident.isCheckedIn ? <><LogIn size={12} /> Checked In</> : <><LogOut size={12} /> Checked Out</>}
                  </div>
                )}
              </div>
              <button onClick={() => { setEditingResident(null); stopCamera(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveResident} className="overflow-y-auto p-8 flex-1 space-y-8">
              {/* Photo & Camera Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                   {isCameraActive ? (
                      <div className="w-48 h-48 rounded-[32px] overflow-hidden bg-black border-4 border-indigo-100">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button type="button" onClick={capturePhoto} className="p-4 bg-white text-indigo-600 rounded-full shadow-xl hover:scale-110 transition-transform">
                             <Camera size={32} />
                           </button>
                        </div>
                      </div>
                   ) : (
                    <div className="relative">
                      <img 
                        src={editingResident.photoUrl} 
                        alt={editingResident.name} 
                        className="w-48 h-48 rounded-[32px] object-cover ring-8 ring-gray-50 shadow-2xl"
                      />
                      <button 
                        type="button"
                        onClick={startCamera}
                        className="absolute -bottom-2 -right-2 p-4 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all hover:scale-110"
                      >
                        <Camera size={24} />
                      </button>
                    </div>
                   )}
                </div>
                {isCameraActive && (
                  <button type="button" onClick={stopCamera} className="text-xs font-bold text-red-500 hover:underline">Cancel Camera</button>
                )}
                <div className="text-center min-h-[50px]">
                   <h3 className="text-xl font-black text-gray-900">{editingResident.name || "Full Name Required"}</h3>
                   <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">{editingResident.gender}</p>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                    value={editingResident.name}
                    onChange={e => setEditingResident({...editingResident, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Gender</label>
                  <select
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold appearance-none"
                    value={editingResident.gender}
                    onChange={e => setEditingResident({...editingResident, gender: e.target.value})}
                  >
                    {GENDER_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Status</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                    value={editingResident.statusText}
                    onChange={e => setEditingResident({...editingResident, statusText: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Status Color</label>
                  <div className="flex gap-3 p-1 bg-gray-50 rounded-2xl border-2 border-transparent">
                    {COLOR_PICKER_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditingResident({...editingResident, statusColor: opt.value})}
                        className={`w-10 h-10 rounded-xl transition-all ${editingResident.statusColor === opt.value ? 'ring-4 ring-indigo-500 ring-offset-2 scale-110 shadow-lg' : 'hover:scale-105 shadow-sm'}`}
                        style={{ backgroundColor: opt.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Destination (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                    value={editingResident.currentDestination || ''}
                    onChange={e => {
                      const dest = e.target.value;
                      setEditingResident({
                        ...editingResident, 
                        currentDestination: dest || undefined,
                        isCheckedIn: !dest,
                        lastActionAt: new Date().toISOString(),
                        expectedReturnDate: dest ? editingResident.expectedReturnDate : undefined,
                        expectedReturnTime: dest ? editingResident.expectedReturnTime : undefined
                      });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Bio</label>
                  <button
                    type="button"
                    onClick={handleImproveBio}
                    disabled={isImproving || !editingResident.bio}
                    className="text-[10px] flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full font-black uppercase tracking-tighter hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    {isImproving ? 'Optimizing...' : 'AI Enhance'}
                  </button>
                </div>
                <textarea
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all min-h-[120px] font-medium text-gray-600"
                  value={editingResident.bio}
                  onChange={e => setEditingResident({...editingResident, bio: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => { setEditingResident(null); stopCamera(); }}
                  className="flex-1 px-8 py-5 rounded-3xl border-2 border-gray-100 font-bold text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-8 py-5 rounded-3xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                >
                  <Save size={20} />
                  {editingResident.id === '__new__' ? 'Create Profile' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
