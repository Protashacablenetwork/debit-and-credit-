import React from 'react';
import { SheetConfig } from '../types';
import { 
  FileSpreadsheet, 
  Download,
  RefreshCw,
  LayoutDashboard,
  Users,
  PlusCircle,
  ReceiptText,
  Wallet,
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
  BarChart
} from 'lucide-react';

interface HeaderProps {
  config: SheetConfig;
  activeNav: 'dashboard' | 'staff' | 'new_entry' | 'transactions' | 'card_detail' | 'report';
  onNavChange: (nav: 'dashboard' | 'staff' | 'new_entry' | 'transactions' | 'report') => void;
  onOpenSyncModal: () => void;
  onOpenReportModal: () => void;
  onExportCsv: () => void;
  isSyncing: boolean;
  onQuickSync: () => void;
  onPullFromSheet?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activeNav,
  onNavChange,
  onOpenSyncModal,
  onOpenReportModal,
  onExportCsv,
  isSyncing,
  onQuickSync,
  onPullFromSheet,
  isDarkMode,
  onToggleDarkMode,
  isAdminLoggedIn,
  onOpenAdminLogin,
  onAdminLogout
}) => {
  const isConnected = !!config.sheetUrl && config.syncStatus === 'connected';

  return (
    <header className="app-header mb-3 sm:mb-5 pt-1 pb-1 no-print">
      {/* Top Branding & Utilities in a clean single line */}
      <div className="flex items-center justify-between gap-2 pb-2 sm:pb-3 border-b border-slate-200/80 overflow-x-auto sm:overflow-visible scrollbar-none">
        {/* Title and Branding */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200/70 shrink-0">
            <Wallet className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight dark:text-white">
              আয়-ব্যয়
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-wide dark:text-slate-400">
              স্মার্ট বিজনেস সল্যুশনস
            </p>
          </div>
        </div>

        {/* Utilities: Google Sheets & Dark/Light Mode in single line */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Google Sheets Status Pill */}
          <div
            id="sheet-status-indicator"
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold select-none cursor-default transition-all shadow-2xs shrink-0 ${
              isConnected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : config.sheetUrl
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {isConnected ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            )}
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">
              {isConnected ? 'শিট সংযুক্ত ✓' : 'শিট সংযোগ'}
            </span>
          </div>

          {/* Quick Push Sync Button */}
          {config.sheetUrl && (
            <button
              id="btn-quick-sync"
              onClick={onQuickSync}
              disabled={isSyncing}
              title="অ্যাপের সমস্ত ডাটা গুগল শিটে পাঠান (Push)"
              className="p-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 transition shadow-2xs active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          )}

          {/* Dark / Light Mode Toggle Button (Replaces Monthly Report) */}
          <button
            id="btn-theme-toggle"
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'লাইট মোডে পরিবর্তন করুন' : 'ডার্ক মোডে পরিবর্তন করুন'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-400 text-[11px] sm:text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition active:scale-95 shrink-0 cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="whitespace-nowrap">লাইট</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="whitespace-nowrap">ডার্ক</span>
              </>
            )}
          </button>

          {/* Export CSV Button */}
          <button
            id="btn-export-csv"
            onClick={onExportCsv}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition shadow-2xs active:scale-95 shrink-0 cursor-pointer"
            title="এক্সেল / CSV ডাউনলোড"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>CSV</span>
          </button>

          {/* Admin Login / Logout Button at end of Header */}
          {isAdminLoggedIn ? (
            <button
              id="btn-admin-logout"
              onClick={onAdminLogout}
              title="এডমিন লগআউট করুন"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] sm:text-xs font-bold shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="whitespace-nowrap"><span className="hidden sm:inline">এডমিন </span>লগআউট</span>
            </button>
          ) : (
            <button
              id="btn-admin-login"
              onClick={onOpenAdminLogin}
              title="এডমিন প্যানেলে লগইন করুন"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-bold shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="whitespace-nowrap"><span className="hidden sm:inline">এডমিন </span>লগইন</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Bar (Desktop and Tablet ONLY) */}
      <nav className="hidden md:flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onNavChange('dashboard')}
          className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeNav === 'dashboard' || activeNav === 'card_detail'
              ? 'bg-slate-900 text-white shadow-md dark:bg-indigo-600'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-indigo-400 dark:text-indigo-200" />
          <span>ড্যাশবোর্ড (Dashboard)</span>
        </button>

        <button
          onClick={() => onNavChange('staff')}
          className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeNav === 'staff'
              ? 'bg-slate-900 text-white shadow-md dark:bg-indigo-600'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4 text-blue-500" />
          <span>স্টাফ ও বেতন (Payroll)</span>
        </button>

        <button
          onClick={() => onNavChange('new_entry')}
          className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeNav === 'new_entry'
              ? 'bg-slate-900 text-white shadow-md dark:bg-indigo-600'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-emerald-500" />
          <span>নতুন এন্ট্রি (Add)</span>
        </button>

        <button
          onClick={() => onNavChange('transactions')}
          className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeNav === 'transactions'
              ? 'bg-slate-900 text-white shadow-md dark:bg-indigo-600'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <ReceiptText className="w-4 h-4 text-purple-500" />
          <span>লেনদেন খতিয়ান (Ledger)</span>
        </button>

        <button
          onClick={() => onNavChange('report')}
          className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeNav === 'report'
              ? 'bg-slate-900 text-white shadow-md dark:bg-indigo-600'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <BarChart className="w-4 h-4 text-emerald-500" />
          <span>মাসিক রিপোর্ট (Report)</span>
        </button>
      </nav>
    </header>
  );
};
