import React, { useState } from 'react';
import { LOGO_URL } from '../constants';
import { User } from '../types';
import { LogIn, Lock, User as UserIcon, RefreshCw, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  onResetPassword: (email: string) => Promise<boolean>;
}

export const Login: React.FC<LoginProps> = ({ onLogin, users, onResetPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (user) {
      if (user.password === password) {
        onLogin(user);
      } else {
        setError('Password salah.');
      }
    } else {
      setError('Email tidak terdaftar dalam sistem.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setResetLoading(true);

    try {
        const success = await onResetPassword(email);
        if (success) {
            setSuccessMsg('Password berhasil direset menjadi "000000". Silakan login.');
            setTimeout(() => {
                setIsResetMode(false);
                setSuccessMsg('');
                setPassword('');
            }, 3000);
        } else {
            setError('Email tidak ditemukan dalam sistem.');
        }
    } catch (err) {
        setError('Terjadi kesalahan koneksi.');
    } finally {
        setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-[#EE2E24]">
        <div className="flex flex-col items-center mb-8">
          <img 
            src={LOGO_URL} 
            alt="JNE Logo" 
            className="h-16 object-contain mb-4"
          />
          <h2 className="text-2xl font-bold text-[#002F6C]">
            {isResetMode ? 'Reset Password' : 'Job Dashboard'}
          </h2>
          <p className="text-gray-500 text-sm">
            {isResetMode ? 'Masukkan email untuk mereset password' : 'Silakan login untuk melanjutkan'}
          </p>
        </div>

        {isResetMode ? (
            <form onSubmit={handleResetSubmit} className="space-y-5">
                <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email JNE
                    </label>
                    <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="email"
                        id="reset-email"
                        required
                        placeholder="nama@jne.co.id"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE2E24] focus:border-[#EE2E24] outline-none transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center animate-pulse">
                        <span className="font-medium mr-1">Error:</span> {error}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-center">
                        <span className="font-medium mr-1">Sukses:</span> {successMsg}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full flex items-center justify-center py-3 px-4 bg-[#EE2E24] hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
                >
                    {resetLoading ? (
                        <>Processing...</>
                    ) : (
                        <>
                            <RefreshCw className="w-5 h-5 mr-2" />
                            Reset ke Password Awal
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => { setIsResetMode(false); setError(''); setSuccessMsg(''); }}
                    className="w-full flex items-center justify-center py-2 text-sm text-gray-500 hover:text-[#002F6C] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
                </button>
            </form>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email JNE
                </label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="email"
                    id="email"
                    required
                    placeholder="nama@jne.co.id"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE2E24] focus:border-[#EE2E24] outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                </div>
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
                </label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="password"
                    id="password"
                    required
                    placeholder="Default: 000000"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE2E24] focus:border-[#EE2E24] outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                </div>
                <div className="flex justify-end mt-1">
                    <button 
                        type="button" 
                        onClick={() => setIsResetMode(true)}
                        className="text-xs text-[#002F6C] hover:underline"
                    >
                        Lupa Password?
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center animate-pulse">
                <span className="font-medium mr-1">Error:</span> {error}
                </div>
            )}

            <button
                type="submit"
                className="w-full flex items-center justify-center py-3 px-4 bg-[#EE2E24] hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-200"
            >
                <LogIn className="w-5 h-5 mr-2" />
                Masuk Dashboard
            </button>
            </form>
        )}

        <div className="mt-8 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} JNE Express. All rights reserved.
        </div>
      </div>
    </div>
  );
};