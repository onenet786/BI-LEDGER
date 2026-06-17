/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { loginUser } from '../ledgerService';
import { User } from '../types';
import { Lock, User as UserIcon, LogIn, Database, ShieldAlert, KeyRound } from 'lucide-react';

interface LoginProps {
  onSuccess: (user: User) => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setLoading(true);

    try {
      const authenticatedUser = await loginUser(usernameInput, passwordInput);
      onSuccess(authenticatedUser);
    } catch (err: any) {
      setErrorText(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = (user: string, pass: string) => {
    setUsernameInput(user);
    setPasswordInput(pass);
    setErrorText('');
  };

  const seedProfiles = [
    { label: 'Super Admin', user: 'admin', pass: 'admin786', desc: 'Full control' },
    { label: 'Finance Manager', user: 'manager', pass: 'manager786', desc: 'Checker approvals' },
    { label: 'Data Entry', user: 'operator', pass: 'operator786', desc: 'Maker posting drafts' },
    { label: 'Read-Only Auditor', user: 'auditor', pass: 'auditor786', desc: 'Regulatory logs view' },
    { label: 'Client Acme', user: 'client', pass: 'client786', desc: 'Acme portal logs' },
    { label: 'Executive / CFO', user: 'executive', pass: 'executive786', desc: 'BI insights summary' }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zinc-900/40 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800/30 rounded-full blur-3xl -z-10" />
      
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-white text-zinc-950 rounded-xl flex items-center justify-center font-black shadow-md mb-3">
            <Database size={24} />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Party Ledger System</h1>
          <p className="text-xs text-zinc-400 mt-1.5">Enterprise Ledger Maker-Checker Engine Portal</p>
        </div>

        {errorText && (
          <div id="login-error-banner" className="bg-rose-950/40 border border-rose-900/50 text-rose-350 p-3 rounded-lg text-xs flex items-center gap-2 mb-4 animate-fade-in font-medium">
            <ShieldAlert size={14} className="shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">Username</label>
            <div className="relative">
              <UserIcon size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input 
                id="login-username"
                type="text" 
                required
                className="w-full pl-9 pr-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-zinc-400 transition-all font-semibold"
                placeholder="E.g. admin"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-3.5 text-zinc-500" />
              <input 
                id="login-password"
                type="password" 
                required
                className="w-full pl-9 pr-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-zinc-400 transition-all font-mono"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>
          </div>

          <button 
            id="btn-login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white hover:bg-zinc-150 text-zinc-950 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            <LogIn size={14} />
          </button>
        </form>

        <div className="border-t border-zinc-850 mt-6 pt-5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-3 flex items-center gap-1">
            <KeyRound size={12} /> Click to Autofill Demo Credentials
          </span>
          <div className="grid grid-cols-2 gap-2">
            {seedProfiles.map((p, idx) => (
              <button
                key={idx}
                type="button"
                id={`btn-autofill-${p.user}`}
                onClick={() => handleAutofill(p.user, p.pass)}
                className="p-2 bg-zinc-950/45 border border-zinc-800 hover:border-zinc-700 rounded-lg text-left transition-all cursor-pointer group"
              >
                <span className="text-[10px] font-bold text-zinc-200 block group-hover:text-white">{p.label}</span>
                <span className="text-[8px] text-zinc-500 block leading-tight font-mono mt-0.5">{p.user} / {p.pass}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="text-zinc-650 text-[10px] mt-6 select-none font-mono">
        Audit log enabled ● Security protocol SSL ready
      </div>
    </div>
  );
}
