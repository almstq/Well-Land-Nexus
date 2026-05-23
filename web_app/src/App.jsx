import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, AlertTriangle, Key, 
  Sparkles, Database, ArrowRight,
  RefreshCw, Layers
} from 'lucide-react';
import * as api from './services/api';
import Dashboards from './components/Dashboards';
import MainLayout from './components/Layout';

const MASTER_ADMIN_EMAIL = 'alie.mustarq@gmail.com';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [viewRole, setViewRole] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Try loading active user from sessionStorage on mount
  useEffect(() => {
    const user = api.getSessionUser();
    if (user) {
      setCurrentUser(user);
      setViewRole(user.role);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setAuthLoading(true);
    setAuthError('');
    try {
      const user = await api.authenticateUser(emailInput);
      setCurrentUser(user);
      setViewRole(user.role);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.setSessionUser(null);
    setCurrentUser(null);
    setViewRole('');
    setEmailInput('');
  };

  // Master-admin preview switcher. This never mutates the authenticated session role.
  const handleRoleSwap = (newRole) => {
    if (currentUser?.email !== MASTER_ADMIN_EMAIL) return;
    setViewRole(newRole);
  };

  const handleQuickLogin = async (email) => {
    setEmailInput(email);
    setAuthLoading(true);
    setAuthError('');
    try {
      const user = await api.authenticateUser(email);
      setCurrentUser(user);
      setViewRole(user.role);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans transition-colors duration-300">
      
      {/* 1. DEVELOPER BYPASS PANEL — visible only to privileged accounts */}
      {currentUser && currentUser.email === MASTER_ADMIN_EMAIL && (
        <div className="z-40 bg-primary-dark text-white shadow-md border-b border-white/10 premium-glass-dark">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentUser.email === 'alie.mustarq@gmail.com' && (
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px] uppercase tracking-widest border border-red-400 shadow flex items-center gap-1">
                  <Shield className="w-3 h-3" /> [SYSTEM DEVELOPER MODE]
                </span>
              )}
              <span className="p-1 rounded bg-yellow-500/20 text-yellow-400 font-bold text-[10px] uppercase tracking-wider animate-pulse flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Dev Mode Active
              </span>
              <p className="text-[11px] font-semibold text-white/90 hidden sm:inline-block">
                Instant multi-role swap utility for testing the stage-gate pipeline:
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white/70 mr-1 hidden md:inline">Role Filter:</span>
              {[
                { id: 'Admin', label: 'GM Admin', color: 'bg-red-600 hover:bg-red-700' },
                { id: 'Procurement', label: 'Procurement', color: 'bg-emerald-600 hover:bg-emerald-700' },
                { id: 'Finance', label: 'Finance', color: 'bg-purple-600 hover:bg-purple-700' },
                { id: 'Supervisor', label: 'Supervisor', color: 'bg-amber-600 hover:bg-amber-700' },
                { id: 'Requestee', label: 'Operator', color: 'bg-blue-600 hover:bg-blue-700' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => handleRoleSwap(item.id)}
                  className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all border ${
                    viewRole === item.id 
                      ? 'bg-white text-primary-dark border-white shadow-sm scale-105 font-black' 
                      : 'bg-transparent text-white/80 border-white/20 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. AUTHENTICATION / LOGIN BARRIER LAYER */}
      {!currentUser ? (
        <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden bg-[#0c1322]">
          
          {/* Visual Showcase (Left Column on large, otherwise hidden) */}
          <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative overflow-hidden bg-gradient-to-tr from-[#030712] via-[#091530] to-[#0c2049] border-r border-white/5">
            {/* Animated Glow Rings */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-soft-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-secondary/15 blur-3xl animate-soft-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="flex items-center gap-2.5 z-10">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg border border-primary-container/20">
                <Shield className="w-5.5 h-5.5 text-white" />
              </div>
              <div>
                <span className="text-sm font-extrabold uppercase tracking-widest text-primary/80 block">Operations Gateway</span>
                <span className="text-xl font-black text-white tracking-tight">Well Land Ops <span className="text-primary">v3.0</span></span>
              </div>
            </div>

            <div className="space-y-6 z-10 max-w-lg">
              <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
                Vessel Fleet, Industrial Procurement & Secure Compliance Sheets Layer
              </h1>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">
                Experience Maldives' premier high-performance port and marine logistics database manager. Integrated with Gemini AI for instant OCR quote structuring, automatic PO execution triggers, and Maldives GST (8%) contracts.
              </p>
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Double-Gate</span>
                  <p className="font-extrabold text-white text-[13px]">PR to PO Sourcing</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">AI Extractor</span>
                  <p className="font-extrabold text-white text-[13px]">Gemini 1.5 OCR</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Ledger Sync</span>
                  <p className="font-extrabold text-white text-[13px]">Atomic Sheets API</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 font-medium z-10">
              © {new Date().getFullYear()} Well Land Investment Pvt Ltd. All rights reserved.
            </p>
          </div>

          {/* Login Card (Right Column) */}
          <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
            <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-secondary/5 blur-3xl animate-soft-pulse"></div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-white shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-secondary to-tertiary"></div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 lg:hidden mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Shield className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="font-black text-white text-base">Well Land Ops</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Staff Authentication Desk</h2>
                <p className="text-xs text-gray-400 font-medium">Please enter your authorized Well Land corporate email to log in.</p>
              </div>

              {authError && (
                <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-xs font-semibold flex items-start gap-2.5 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>{authError}</div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-300 block">Corporate Email Address</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="email" 
                      placeholder="e.g. alie.mustarq@gmail.com"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs"
                      required
                      disabled={authLoading}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-primary hover:bg-primary-dark font-extrabold text-white rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-75"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Securing session handshake...
                    </>
                  ) : (
                    <>
                      Verify Identity <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Instant Testing Accounts Trigger Deck */}
              <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Multi-Role Sandbox Profiles (Quick Demo)
                </span>
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  {[
                    { email: 'alie.mustarq@gmail.com', label: 'Admin (Master Seed)' },
                    { email: 'procurement@welllandops.com', label: 'Procurement Desk' },
                    { email: 'finance@welllandops.com', label: 'Finance Desk' },
                    { email: 'supervisor@welllandops.com', label: 'Site Supervisor' },
                    { email: 'operator@welllandops.com', label: 'Field Operator' }
                  ].map(acc => (
                    <button
                      key={acc.email}
                      onClick={() => handleQuickLogin(acc.email)}
                      className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-left text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/15 transition duration-150 flex flex-col justify-between"
                    >
                      <span className="font-extrabold block text-white">{acc.label}</span>
                      <span className="text-[9px] text-gray-500 italic block mt-0.5 truncate w-full">{acc.email}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 text-center text-[10px] text-gray-500 font-semibold flex items-center justify-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Direct Secure Connection to active Google Apps Script Proxy.
              </div>
            </motion.div>
          </div>

        </div>
      ) : (
        
        <MainLayout
          currentUser={currentUser}
          activeRole={viewRole || currentUser.role}
          canImpersonate={currentUser.email === MASTER_ADMIN_EMAIL}
          onRolePreviewChange={setViewRole}
          onLogout={handleLogout}
        >
          <Dashboards
            role={viewRole || currentUser.role}
            sessionRole={currentUser.role}
            userEmail={currentUser.email}
            onLogout={handleLogout}
          />
        </MainLayout>
      )}

    </div>
  );
}
