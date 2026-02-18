
import React, { useState, useRef, useCallback } from 'react';
import { Resident, MovementLog, StatusColor, AuthUser, UserRole, KioskSettings } from '../types';
import { STATUS_COLORS, COLOR_PICKER_OPTIONS, GENDER_OPTIONS } from '../constants';
import { Plus, Edit2, Trash2, Search, History, User, Sparkles, X, Save, BarChart3, Users as UsersIcon, ArrowUpRight, ShieldCheck, Key, Settings as SettingsIcon, Image as ImageIcon, Camera, RefreshCw } from 'lucide-react';
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
}

type AdminView = 'RESIDENTS' | 'LOGS' | 'ANALYTICS' | 'STAFF' | 'SETTINGS';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  residents, logs, currentUser, kioskSettings, onUpdateResident, onAddResident, onDeleteResident, onUpdateKioskSettings 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [activeTab, setActiveTab] = useState<AdminView>('RESIDENTS');
  const [isImproving, setIsImproving] = useState(false);
  const [staff, setStaff] = useState<AuthUser[]>(storage.getStaff());
  
  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filteredResidents = residents.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.gender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveStaff = (e: React.FormEvent, updatedStaff: AuthUser) => {
    e.preventDefault();
    const nextStaff = staff.map(s => s.id === updatedStaff.id ? updatedStaff : s);
    setStaff(nextStaff);
    storage.saveStaff(nextStaff);
  };

  const handleAddStaff = () => {
    const newStaff: AuthUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Staff',
      username: 'user' + Math.floor(Math.random() * 1000),
      pin: '1234',
      role: 'STAFF'
    };
    const nextStaff = [...staff, newStaff];
    setStaff(nextStaff);
    storage.saveStaff(nextStaff);
  };

  const handleDeleteStaff = (id: string) => {
    if (id === currentUser?.id) return alert("You cannot delete your own account.");
    if (confirm("Delete this staff account?")) {
      const nextStaff = staff.filter(s => s.id !== id);
      setStaff(nextStaff);
      storage.saveStaff(nextStaff);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResident) {
      onUpdateResident(editingResident);
      setEditingResident(null);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newResident: Resident = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Resident',
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
    onAddResident(newResident);
    setEditingResident(newResident);
  };

  const handleImproveBio = async () => {
    if (!editingResident) return;
    setIsImproving(true);
    const betterBio = await improveBio(editingResident.bio, editingResident.name);
    setEditingResident({ ...editingResident, bio: betterBio });
    setIsImproving(false);
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
    if (videoRef.current && canvasRef.current && editingResident) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setEditingResident({ ...editingResident, photoUrl: dataUrl });
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
          {currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('STAFF')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold text-sm whitespace-nowrap ${activeTab === 'STAFF' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <ShieldCheck size={16} />
              Staff
            </button>
          )}
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

          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
             <ShieldCheck className="text-indigo-600 mt-1" size={20} />
             <p className="text-xs text-indigo-700 leading-relaxed">
               Settings are saved locally and will apply instantly to all tablet kiosks connected to this interface.
             </p>
          </div>
        </div>
      )}

      {activeTab === 'STAFF' && currentUser?.role === 'ADMIN' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div>
              <h3 className="text-xl font-bold">Staff Accounts</h3>
              <p className="text-sm text-gray-500">Manage user access and PINs</p>
            </div>
            <button 
              onClick={handleAddStaff}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
            >
              <Plus size={18} /> Add User
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="bg-gray-100 p-3 rounded-2xl text-gray-400">
                    <User />
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-widest ${s.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {s.role}
                  </span>
                </div>
                <div>
                  <input 
                    className="w-full text-lg font-black text-gray-900 border-none p-0 focus:ring-0 bg-transparent"
                    value={s.name}
                    onChange={e => {
                      const updated = {...s, name: e.target.value};
                      handleSaveStaff({ preventDefault: () => {} } as any, updated);
                    }}
                  />
                  <input 
                    className="w-full text-sm font-medium text-gray-400 border-none p-0 focus:ring-0 bg-transparent"
                    value={s.username}
                    onChange={e => {
                      const updated = {...s, username: e.target.value};
                      handleSaveStaff({ preventDefault: () => {} } as any, updated);
                    }}
                  />
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key size={14} className="text-gray-400" />
                    <input 
                      type="password"
                      className="w-16 text-sm font-bold bg-gray-50 px-2 py-1 rounded-md border-none focus:ring-1 focus:ring-indigo-500"
                      value={s.pin}
                      onChange={e => {
                        const updated = {...s, pin: e.target.value};
                        handleSaveStaff({ preventDefault: () => {} } as any, updated);
                      }}
                    />
                  </div>
                  <button onClick={() => handleDeleteStaff(s.id)} className="text-red-400 hover:text-red-600 p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
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
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={20} />
              Add Resident
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResidents.map(resident => (
              <div key={resident.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all group relative">
                <div className="p-6">
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
                  
                  <div className="mt-6 p-4 rounded-2xl bg-gray-50 flex justify-between items-center text-xs font-bold">
                    <span className={`flex items-center gap-1.5 ${resident.isCheckedIn ? 'text-green-600' : 'text-amber-600'}`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${resident.isCheckedIn ? 'bg-green-500' : 'bg-amber-500'}`} />
                      {resident.isCheckedIn ? 'IN BUILDING' : 'OUT'}
                    </span>
                    {!resident.isCheckedIn && resident.expectedReturnTime && (
                      <span className="text-gray-400">ETA: {resident.expectedReturnTime}</span>
                    )}
                  </div>
                </div>

                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                  <button onClick={() => setEditingResident(resident)} className="p-2 bg-white/80 backdrop-blur shadow-sm rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => onDeleteResident(resident.id)} className="p-2 bg-white/80 backdrop-blur shadow-sm rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
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
                  <th className="px-8 py-5">Timestamp</th>
                  <th className="px-8 py-5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-gray-900">{log.residentName}</td>
                    <td className="px-8 py-5">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${log.type === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-8 py-5 text-sm text-gray-400 font-medium">
                      {log.type === 'CHECK_OUT' ? (
                        <span className="flex items-center gap-1"><ArrowUpRight size={14} /> {log.destination} (ETA: {log.expectedReturnTime})</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingResident && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <User className="text-indigo-600" />
                Profile Editor
              </h2>
              <button onClick={() => { setEditingResident(null); stopCamera(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-8 flex-1 space-y-8">
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
                <div className="text-center">
                   <h3 className="text-xl font-black text-gray-900">{editingResident.name || "Full Name"}</h3>
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
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
