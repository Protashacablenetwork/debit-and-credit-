import React, { useMemo } from 'react';
import { Transaction, SalaryPayment, Staff, SheetConfig } from '../types';
import { formatCurrency, getMonthBengaliName } from '../data/categories';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wifi,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  Calendar,
  Layers
} from 'lucide-react';

interface DashboardOverviewProps {
  transactions: Transaction[];
  salaries: SalaryPayment[];
  staffList: Staff[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onOpenCardDetail: (type: 'income' | 'expense' | 'staff_salary' | 'bandwidth_ops' | 'net_profit') => void;
  onOpenNewTransaction: (type?: 'income' | 'expense', category?: string) => void;
  onNavigateToStaff: () => void;
  onNavigateToLedger: () => void;
  config: SheetConfig;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  transactions,
  salaries,
  staffList,
  selectedMonth,
  onMonthChange,
  onOpenCardDetail,
  onOpenNewTransaction,
  onNavigateToStaff,
  onNavigateToLedger,
  config
}) => {
  // Filter transactions for this month safely
  const monthTxns = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(t => t && typeof t.date === 'string' && t.date.startsWith(selectedMonth || ''));
  }, [transactions, selectedMonth]);

  // Income Category Breakdown
  const incomeCategoryData = useMemo(() => {
    const incomes = monthTxns.filter(t => t && t.type === 'income');
    const total = incomes.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const map: Record<string, number> = {};
    incomes.forEach(t => {
      if (t) {
        const cat = String(t.category || 'অন্যান্য');
        map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
      }
    });
    return {
      total,
      items: Object.entries(map)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: total > 0 ? Math.min(100, Math.round((amount / total) * 100)) : 0
        }))
        .sort((a, b) => b.amount - a.amount)
    };
  }, [monthTxns]);

  // Expense Category Breakdown
  const expenseCategoryData = useMemo(() => {
    const expenses = monthTxns.filter(t => t && t.type === 'expense');
    const total = expenses.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const map: Record<string, number> = {};
    expenses.forEach(t => {
      if (t) {
        const cat = String(t.category || 'অন্যান্য');
        map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
      }
    });
    return {
      total,
      items: Object.entries(map)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: total > 0 ? Math.min(100, Math.round((amount / total) * 100)) : 0
        }))
        .sort((a, b) => b.amount - a.amount)
    };
  }, [monthTxns]);

  // Month staff salary data
  const monthSalaries = useMemo(() => {
    if (!Array.isArray(salaries)) return [];
    return salaries.filter(s => s && s.month === selectedMonth);
  }, [salaries, selectedMonth]);

  const activeStaff = (staffList || []).filter(s => s && s.status === 'active');
  const paidCount = monthSalaries.filter(s => s && s.paymentStatus === 'paid').length;
  const pendingCount = Math.max(0, activeStaff.length - paidCount);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Month Selector & Information notice */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {getMonthBengaliName(selectedMonth)} মাসের কোম্পানি সার্বিক হিসাব বিবরণী
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              নির্দিষ্ট খাতের বিস্তারিত লেনদেন দেখতে উপরের যেকোনো রঙিন কার্ডে ক্লিক করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">হিসাবের মাস:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => onMonthChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Two Column Grid: Income vs Expense Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Card: Income Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  আয়ের প্রধান খাতসমূহ (ISP Revenue)
                </h3>
              </div>
              <button
                onClick={() => onOpenCardDetail('income')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>সব দেখুন</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {incomeCategoryData.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  চলতি মাসে এখনো কোনো আয় এন্ট্রি করা হয়নি
                </div>
              ) : (
                incomeCategoryData.items.slice(0, 5).map(item => (
                  <div key={item.category} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                        {item.category}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        {formatCurrency(item.amount, config.currencySymbol)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>মোট আয়ের {item.percentage}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">চলতি মাসের মোট আয়:</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
              {formatCurrency(incomeCategoryData.total, config.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Right Card: Expense Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  ব্যয় ও অপারেশন খাতসমূহ (ISP Expenses)
                </h3>
              </div>
              <button
                onClick={() => onOpenCardDetail('expense')}
                className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>সব দেখুন</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {expenseCategoryData.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  চলতি মাসে এখনো কোনো ব্যয় এন্ট্রি করা হয়নি
                </div>
              ) : (
                expenseCategoryData.items.slice(0, 5).map(item => (
                  <div key={item.category} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                        {item.category}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        {formatCurrency(item.amount, config.currencySymbol)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>মোট ব্যয়ের {item.percentage}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">চলতি মাসের মোট ব্যয়:</span>
            <span className="font-black text-rose-700 dark:text-rose-400 text-sm">
              {formatCurrency(expenseCategoryData.total, config.currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Staff Payroll Highlight & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Staff Payroll Status Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>স্টাফ বেতন অবস্থা</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-800 text-indigo-200 text-[10px] font-semibold">
                {getMonthBengaliName(selectedMonth)}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">মোট সক্রিয় স্টাফ:</span>
                <span className="font-bold text-white">{activeStaff.length} জন</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span>বেতন পরিশোধিত:</span>
                <span className="font-bold">{paidCount} জন</span>
              </div>
              <div className="flex items-center justify-between text-xs text-amber-300">
                <span>বেতন বকেয়া:</span>
                <span className="font-bold">{pendingCount > 0 ? `${pendingCount} জন` : 'সব পরিশোধিত'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToStaff}
            className="mt-5 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>বেতন হিসাব ও পে-রোলে যান</span>
          </button>
        </div>

        {/* Quick Action Buttons Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              দ্রুত কাজের শর্টকাট (Quick Actions)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              সরাসরি এক ক্লিকে ইন্টারনেট বিল সংগ্রহ, নতুন সংযোগ ফি বা আপস্ট্রিম ব্যান্ডউইথ খরচ যুক্ত করুন
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => onOpenNewTransaction('income', 'মাসিক ইন্টারনেট বিল')}
                className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-left transition-all group cursor-pointer"
              >
                <span className="text-lg block mb-1">📶</span>
                <span className="font-bold text-xs text-emerald-900 dark:text-emerald-300 block group-hover:text-emerald-950 dark:group-hover:text-emerald-200">
                  ইন্টারনেট বিল
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">মাসিক কালেকশন</span>
              </button>

              <button
                onClick={() => onOpenNewTransaction('income', 'নতুন সংযোগ ফি')}
                className="p-3 rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-100/70 dark:hover:bg-teal-900/50 text-left transition-all group cursor-pointer"
              >
                <span className="text-lg block mb-1">🔌</span>
                <span className="font-bold text-xs text-teal-900 dark:text-teal-300 block group-hover:text-teal-950 dark:group-hover:text-teal-200">
                  নতুন সংযোগ ফি
                </span>
                <span className="text-[10px] text-teal-700 dark:text-teal-400">ফাইবার লাইন ফি</span>
              </button>

              <button
                onClick={() => onOpenNewTransaction('expense', 'ব্যান্ডউইথ/আপস্ট্রিম বিল')}
                className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-900/50 text-left transition-all group cursor-pointer"
              >
                <span className="text-lg block mb-1">🌐</span>
                <span className="font-bold text-xs text-rose-900 dark:text-rose-300 block group-hover:text-rose-950 dark:group-hover:text-rose-200">
                  ব্যান্ডউইথ বিল
                </span>
                <span className="text-[10px] text-rose-700 dark:text-rose-400">আপস্ট্রিম বিল</span>
              </button>

              <button
                onClick={() => onOpenNewTransaction('expense', 'অপটিক্যাল ফাইবার ও কেবল')}
                className="p-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 text-left transition-all group cursor-pointer"
              >
                <span className="text-lg block mb-1">🪛</span>
                <span className="font-bold text-xs text-blue-900 dark:text-blue-300 block group-hover:text-blue-950 dark:group-hover:text-blue-200">
                  ফাইবার কেবল
                </span>
                <span className="text-[10px] text-blue-700 dark:text-blue-400">কেবল সামগ্রী</span>
              </button>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">সমস্ত লেনদেনের বিস্তারিত খতিয়ান দেখতে চান?</span>
            <button
              onClick={onNavigateToLedger}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>সকল লেনদেন খতিয়ান দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
