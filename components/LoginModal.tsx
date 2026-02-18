
import React, { useState } from 'react';
import { Lock, X, ShieldCheck } from 'lucide-react';
import { AuthUser } from '../types';

interface LoginModalProps {
  onLogin: (username: string, pin: string) => boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(username, pin)) {
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-8">
          <div className="bg-indigo-100 p-4 rounded-3xl text-indigo-600">
            <ShieldCheck size={32} />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <h2 className="text-3xl font-black text-gray-900 mb-2">Staff Portal</h2>
        <p className="text-gray-500 mb-8 font-medium">Please enter your credentials to access the management dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
            <input
              type="text"
              required
              autoFocus
              className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-lg"
              placeholder="e.g. admin"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(false); }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Staff PIN</label>
            <input
              type="password"
              required
              maxLength={6}
              className={`w-full px-6 py-4 bg-gray-50 border-2 ${error ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-indigo-500 focus:bg-white'} rounded-2xl outline-none transition-all font-bold text-2xl tracking-[0.5em] text-center`}
              placeholder="••••"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(false); }}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-bold text-center animate-bounce">
              Invalid credentials. Please try again.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-5 rounded-3xl bg-indigo-600 text-white font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Lock size={20} />
            Authorize Access
          </button>
        </form>
      </div>
    </div>
  );
};
