
import React, { useState } from 'react';
import { Resident, KioskSettings } from '../types';
import { LogIn, LogOut, Search, Clock, MapPin, X, ArrowRight } from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface KioskUIProps {
  residents: Resident[];
  settings: KioskSettings;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string, destination: string, eta: string) => void;
}

export const KioskUI: React.FC<KioskUIProps> = ({ residents, settings, onCheckIn, onCheckOut }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForCheckout, setSelectedForCheckout] = useState<Resident | null>(null);
  const [destination, setDestination] = useState('');
  const [eta, setEta] = useState('');

  const filteredResidents = residents.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleAction = (resident: Resident) => {
    if (resident.isCheckedIn) {
      setSelectedForCheckout(resident);
    } else {
      onCheckIn(resident.id);
    }
  };

  const handleCheckOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedForCheckout && destination && eta) {
      onCheckOut(selectedForCheckout.id, destination, eta);
      setSelectedForCheckout(null);
      setDestination('');
      setEta('');
    }
  };

  const backgroundStyle = settings.backgroundUrl 
    ? { backgroundImage: `url(${settings.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div className="h-screen relative flex flex-col p-6 overflow-hidden transition-all duration-700" style={backgroundStyle}>
      {/* Background Overlay */}
      {settings.backgroundUrl && (
        <div 
          className="absolute inset-0 bg-black transition-opacity duration-700" 
          style={{ opacity: settings.overlayOpacity }} 
        />
      )}
      
      {/* Content wrapper to ensure z-index above overlay */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-8 flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 w-full">
            <h1 className={`text-4xl md:text-5xl font-black mb-2 transition-colors ${settings.backgroundUrl ? 'text-white drop-shadow-lg' : 'text-gray-900'}`}>
              {settings.title}
            </h1>
            <p className={`text-xl font-medium transition-colors ${settings.backgroundUrl ? 'text-gray-100 drop-shadow-md' : 'text-gray-600'}`}>
              {settings.subtitle}
            </p>
          </div>
          <div className="w-full md:w-96 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
            <input
              type="text"
              placeholder="Type your name..."
              className="w-full pl-12 pr-6 py-5 bg-white/90 backdrop-blur-sm border-2 border-transparent rounded-2xl text-2xl focus:border-indigo-500 focus:bg-white outline-none shadow-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredResidents.map(resident => (
              <button
                key={resident.id}
                onClick={() => handleAction(resident)}
                className="bg-white/95 backdrop-blur-sm rounded-[32px] p-6 shadow-lg border-4 border-transparent hover:border-indigo-500 hover:shadow-2xl transition-all active:scale-95 text-left group flex flex-col h-full"
              >
                <div className="flex items-start gap-4 mb-4">
                  <img src={resident.photoUrl} className="w-20 h-20 rounded-2xl object-cover shadow-md ring-4 ring-gray-50 group-hover:ring-indigo-50 transition-all" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-black text-gray-900 leading-tight mb-1 truncate">{resident.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${resident.isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {resident.isCheckedIn ? (
                          <><LogIn size={12} /> IN</>
                        ) : (
                          <><LogOut size={12} /> OUT</>
                        )}
                      </div>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_COLORS[resident.statusColor]}`}>
                        {resident.statusText}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  {!resident.isCheckedIn && (
                    <div className="space-y-1.5 p-3 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                        <MapPin size={14} className="text-indigo-400" />
                        <span className="truncate">{resident.currentDestination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                        <Clock size={14} className="text-indigo-400" />
                        <span>ETA: {resident.expectedReturnTime}</span>
                      </div>
                    </div>
                  )}
                  <div className={`w-full py-4 rounded-2xl text-center font-black text-lg flex items-center justify-center gap-2 transition-all ${resident.isCheckedIn ? 'bg-indigo-600 text-white group-hover:bg-indigo-700' : 'bg-green-600 text-white group-hover:bg-green-700'}`}>
                     {resident.isCheckedIn ? 'Check Out' : 'Check In'}
                     <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Check Out Modal */}
      {selectedForCheckout && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
          <div className="bg-white rounded-[48px] w-full max-w-xl p-12 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Check Out</h2>
                <p className="text-xl font-medium text-gray-500">Stay safe out there, {selectedForCheckout.name.split(' ')[0]}!</p>
              </div>
              <button onClick={() => setSelectedForCheckout(null)} className="p-4 hover:bg-gray-100 rounded-full transition-colors">
                <X size={32} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCheckOutSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <MapPin size={16} /> Destination
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Work, Store, Clinic"
                  className="w-full px-6 py-5 bg-gray-50 border-4 border-transparent rounded-[24px] text-2xl font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Clock size={16} /> Expected Return
                </label>
                <input
                  type="time"
                  required
                  className="w-full px-6 py-5 bg-gray-50 border-4 border-transparent rounded-[24px] text-3xl font-black focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm"
                  value={eta}
                  onChange={e => setEta(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedForCheckout(null)}
                  className="flex-1 py-6 rounded-[24px] bg-gray-100 text-xl font-black text-gray-400 hover:bg-gray-200 transition-colors"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-6 rounded-[24px] bg-indigo-600 text-white text-xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  Confirm & Go
                  <ArrowRight size={28} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
