import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  ReceiptText, 
  BarChart3 
} from 'lucide-react';

interface MobileBottomNavProps {
  activeNav: 'dashboard' | 'staff' | 'new_entry' | 'transactions' | 'card_detail' | 'report';
  onNavChange: (nav: 'dashboard' | 'staff' | 'new_entry' | 'transactions' | 'report') => void;
  onOpenReportModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNav,
  onNavChange,
  onOpenReportModal
}) => {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] no-print">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Dashboard */}
        <button
          onClick={() => onNavChange('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            activeNav === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeNav === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">হোম</span>
        </button>

        {/* 2. Staff & Payroll */}
        <button
          onClick={() => onNavChange('staff')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            activeNav === 'staff'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Users className={`w-5 h-5 ${activeNav === 'staff' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">স্টাফ</span>
        </button>

        {/* 3. New Entry (Floating Center Action) */}
        <button
          onClick={() => onNavChange('new_entry')}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] -mt-4 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-active:scale-95 transition-transform">
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 mt-0.5">এন্ট্রি</span>
        </button>

        {/* 4. Ledger */}
        <button
          onClick={() => onNavChange('transactions')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            activeNav === 'transactions'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <ReceiptText className={`w-5 h-5 ${activeNav === 'transactions' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">খতিয়ান</span>
        </button>

        {/* 5. Report (Navigates to Report Page) */}
        <button
          onClick={() => onNavChange('report')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
            activeNav === 'report'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeNav === 'report' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[10px] mt-0.5">রিপোর্ট</span>
        </button>
      </div>
    </div>
  );
};
