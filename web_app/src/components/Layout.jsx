import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Menu,
  Send,
  Shield,
  ShoppingBag,
  TrendingUp,
  Wrench,
  X
} from 'lucide-react';

export const dashboardCardClass = 'bg-white border border-slate-200 rounded-lg shadow-sm p-6';
export const tableRowClass = 'border-b border-slate-200 odd:bg-white even:bg-slate-50/70 hover:bg-emerald-50/50 transition';
export const buttonClass = 'px-3.5 py-2 rounded-lg font-bold transition hover:bg-slate-100 active:scale-95';

export default function MainLayout({
  currentUser,
  activeRole,
  onRolePreviewChange,
  canImpersonate = false,
  onLogout,
  children
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const navLinks = [
    { label: 'GM Executive Console', role: 'Admin', icon: Shield },
    { label: 'Procurement Officer Desk', role: 'Procurement', icon: ShoppingBag },
    { label: 'Finance Disbursement Desk', role: 'Finance', icon: TrendingUp },
    { label: 'Site Supervisor View', role: 'Supervisor', icon: Wrench },
    { label: 'Field Operator Requisitions', role: 'Requestee', icon: Send }
  ];

  return (
    <div className="flex-1 flex min-h-0 bg-gray-50 relative">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            type="button"
            aria-label="Close navigation overlay"
            className="fixed inset-0 z-20 bg-slate-950/40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed md:sticky top-0 left-0 z-30 h-screen bg-slate-950 text-white flex flex-col justify-between border-r border-white/10 transition-all duration-200 ${
          desktopCollapsed ? 'md:w-[88px]' : 'md:w-[280px]'
        } w-[280px] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          <div className="p-5 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className={desktopCollapsed ? 'md:hidden' : ''}>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 block">Core Portal</span>
                <span className="font-extrabold text-sm">Well Land Nexus</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="hidden md:flex p-2 rounded-lg hover:bg-white/10 text-white"
              aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {desktopCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 text-white md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className={`p-4 bg-white/5 border-b border-white/10 text-xs space-y-1 ${desktopCollapsed ? 'md:px-3 md:text-center' : ''}`}>
            <span className="text-[10px] uppercase font-bold text-slate-400">Security Credentials</span>
            <p className={`font-extrabold truncate text-white ${desktopCollapsed ? 'md:hidden' : ''}`}>{currentUser.display_name}</p>
            <p className={`text-[10px] text-emerald-300 italic truncate font-semibold ${desktopCollapsed ? 'md:hidden' : ''}`}>{currentUser.email}</p>
            <div className={`pt-2 flex items-center gap-1.5 ${desktopCollapsed ? 'md:justify-center' : ''}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-200 border border-emerald-400/20 ${desktopCollapsed ? 'md:hidden' : ''}`}>
                {currentUser.role} {activeRole !== currentUser.role ? `viewing ${activeRole}` : ''}
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {navLinks.map((link) => {
              const hasAccess = currentUser.role === 'Admin' || currentUser.role === link.role;
              const active = activeRole === link.role;
              const isClickable = canImpersonate || currentUser.role === link.role;
              return (
                <button
                  type="button"
                  key={link.role}
                  onClick={() => {
                    if (canImpersonate) onRolePreviewChange?.(link.role);
                  }}
                  disabled={!isClickable}
                  title={desktopCollapsed ? link.label : undefined}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 text-xs font-bold border transition text-left ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : hasAccess
                        ? 'bg-transparent text-slate-300 border-transparent hover:bg-white/5 hover:text-white'
                        : 'opacity-40 bg-transparent text-slate-500 border-transparent cursor-not-allowed'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  <span className={desktopCollapsed ? 'md:hidden' : ''}>{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className={`p-4 border-t border-white/10 text-[10px] text-slate-400 font-semibold space-y-2 ${desktopCollapsed ? 'md:px-3 md:text-center' : ''}`}>
          <p className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-emerald-300" /> Synced schema gateway
          </p>
          <p className={`text-[9px] text-slate-500 ${desktopCollapsed ? 'md:hidden' : ''}`}>Execute-as-owner Apps Script handshakes ready.</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition active:scale-95 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-extrabold text-slate-950 truncate">Well Land Nexus</h1>
              <span className="text-[10px] text-slate-500 font-bold block -mt-0.5 truncate">
                {activeRole} workspace {activeRole !== currentUser.role ? `preview by ${currentUser.role}` : 'active session'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canImpersonate && (
              <span className="hidden md:flex items-center px-2.5 py-1 rounded-lg bg-red-600 text-white font-black text-[9px] uppercase tracking-widest">
                Master Admin
              </span>
            )}
            <div className="hidden sm:flex flex-col text-right text-xs mr-2">
              <span className="font-extrabold text-slate-950">{currentUser.display_name}</span>
              <span className="text-[10px] text-slate-500 italic font-medium">{currentUser.email}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100 transition active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
