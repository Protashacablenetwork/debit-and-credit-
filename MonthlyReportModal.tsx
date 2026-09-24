import React, { useState, useMemo } from 'react';
import { Transaction, SheetConfig } from '../types';
import { formatCurrency, getMonthBengaliName } from '../data/categories';
import { 
  X, 
  Printer, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  AlertCircle,
  BarChart,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  config: SheetConfig;
  currencySymbol?: string;
  isFullPage?: boolean;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  config,
  currencySymbol = '৳',
  isFullPage = false,
}) => {
  // Available months extracted from transaction dates
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const currentYM = new Date().toISOString().substring(0, 7);
    set.add(currentYM);

    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });

    return Array.from(set).sort().reverse();
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => availableMonths[0] || new Date().toISOString().substring(0, 7)
  );

  // Month specific transactions
  const monthTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter((t) => t && typeof t.date === 'string' && t.date.startsWith(selectedMonth || ''));
  }, [transactions, selectedMonth]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    monthTransactions.forEach((t) => {
      if (!t) return;
      const amt = Number(t.amount) || 0;
      const cat = String(t.category || 'অন্যান্য');
      if (t.type === 'income') {
        totalIncome += amt;
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amt;
      } else {
        totalExpense += amt;
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
      }
    });

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100) : 0;

    // Sort categories
    const sortedExpenseCats = Object.entries(expenseByCategory)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalExpense > 0 ? (amt / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedIncomeCats = Object.entries(incomeByCategory)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalIncome > 0 ? (amt / totalIncome) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpense,
      netBalance,
      savingsRate,
      topExpense: sortedExpenseCats[0] || null,
      sortedExpenseCats,
      sortedIncomeCats,
      count: monthTransactions.length
    };
  }, [monthTransactions]);

  if (!isOpen && !isFullPage) return null;

  // Print as PDF
  const handlePrint = () => {
    window.print();
  };

  // Export CSV for this month
  const handleExportMonthCsv = () => {
    let csv = '\uFEFFআইডি,তারিখ,ধরন,বিবরণ,বিভাগ,পরিমাণ,পেমেন্ট মাধ্যম,নোট\r\n';
    monthTransactions.forEach((t) => {
      const row = [
        `"${t.id}"`,
        `"${t.date}"`,
        `"${t.type === 'income' ? 'আয়' : 'ব্যয়'}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-statement-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthLabel = getMonthBengaliName(selectedMonth);

  const content = (
    <div
      id="monthlyReportContainer"
      onClick={(e) => e.stopPropagation()}
      className={`bg-white dark:bg-slate-900 w-full ${
        isFullPage
          ? 'rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs'
          : 'max-w-4xl mx-auto rounded-[32px] p-5 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 my-auto'
      } overflow-y-auto print-page text-slate-900 dark:text-slate-100`}
    >
      {/* Modal Top Bar (Hidden on print) */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 no-print">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <BarChart className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
              মাসিক আর্থিক রিপোর্ট ও স্টেটমেন্ট
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              কোম্পানির ব্যালেন্স শিট, আয়-ব্যয় সারসংক্ষেপ ও পিডিএফ ডাউনলোড
            </p>
          </div>
        </div>
      </div>

      {/* Month Selector & Action Controls (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-slate-100 dark:border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">মাস নির্বাচন:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {getMonthBengaliName(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition shadow-xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>পিডিএফ ডাউনলোড / প্রিন্ট</span>
            </button>
            <button
              onClick={handleExportMonthCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>এক্সেল / CSV</span>
            </button>
          </div>
        </div>

        {/* ================= Printable Report Body ================= */}
        <div className="pt-4 space-y-6">
          {/* Official Printable Header */}
          <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800 print:border-slate-300">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white print:text-slate-900 tracking-tight">
              {config.companyName || 'স্মার্ট বিজনেস সল্যুশনস'}
            </div>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 print:text-indigo-700 uppercase tracking-wider mt-0.5">
              মাসিক আর্থিক বিবরণী — {monthLabel}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 print:text-slate-500 mt-1">
              রিপোর্ট প্রস্তুতের তারিখ: {new Date().toLocaleDateString('bn-BD')} | মোট লেনদেন সংখ্যা: {stats.count} টি
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> মোট আয়
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-800 mt-1">
                {formatCurrency(stats.totalIncome, currencySymbol)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100">
              <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> মোট ব্যয়
              </span>
              <div className="text-base sm:text-lg font-black text-rose-800 mt-1">
                {formatCurrency(stats.totalExpense, currencySymbol)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100">
              <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
                <PiggyBank className="w-3 h-3" /> নিট উদ্বৃত্ত/মুনাফা
              </span>
              <div className="text-base sm:text-lg font-black text-purple-800 mt-1">
                {formatCurrency(stats.netBalance, currencySymbol)}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100">
              <span className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> সঞ্চয়ের অনুপাত
              </span>
              <div className="text-base sm:text-lg font-black text-blue-800 mt-1">
                {stats.savingsRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Visual Income vs Expense Ratio Bar */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span>আয় বনাম ব্যয়ের অনুপাত</span>
              <span>
                আয় {stats.totalIncome > 0 ? ((stats.totalIncome / (stats.totalIncome + stats.totalExpense || 1)) * 100).toFixed(0) : 0}% | 
                ব্যয় {stats.totalExpense > 0 ? ((stats.totalExpense / (stats.totalIncome + stats.totalExpense || 1)) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${(stats.totalIncome / (stats.totalIncome + stats.totalExpense || 1)) * 100}%`
                }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title="মোট আয়"
              />
              <div
                style={{
                  width: `${(stats.totalExpense / (stats.totalIncome + stats.totalExpense || 1)) * 100}%`
                }}
                className="bg-rose-500 h-full transition-all duration-500"
                title="মোট ব্যয়"
              />
            </div>
          </div>

          {/* Expense Category Breakdown */}
          {stats.sortedExpenseCats.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                📊 ব্যয়ের প্রধান খাতসমূহ (Expense Breakdown)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {stats.sortedExpenseCats.map((cat, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex justify-between font-semibold text-slate-800 mb-1">
                      <span>{cat.category}</span>
                      <span>{formatCurrency(cat.amount, currencySymbol)} ({cat.percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Statement Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              📑 বিস্তারিত লেনদেন তালিকা
            </h4>
            {monthTransactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                এই মাসে কোনো লেনদেন পাওয়া যায়নি
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">তারিখ</th>
                      <th className="py-2.5 px-3">বিবরণ</th>
                      <th className="py-2.5 px-3">বিভাগ</th>
                      <th className="py-2.5 px-3">পেমেন্ট</th>
                      <th className="py-2.5 px-3 text-right">আয় (৳)</th>
                      <th className="py-2.5 px-3 text-right">ব্যয় (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {monthTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 whitespace-nowrap text-slate-500">{t.date}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{t.description}</td>
                        <td className="py-2 px-3 text-slate-500">{t.category}</td>
                        <td className="py-2 px-3 text-slate-500">{t.paymentMethod || 'নগদ'}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">
                          {t.type === 'income' ? formatCurrency(t.amount, currencySymbol) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                          {t.type === 'expense' ? formatCurrency(t.amount, currencySymbol) : '-'}
                        </td>
                      </tr>
                    ))}
                    {/* Summary Row */}
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <td colSpan={4} className="py-2.5 px-3 text-slate-800">
                        মোট সর্বমোট হিসাব
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-extrabold">
                        {formatCurrency(stats.totalIncome, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-700 font-extrabold">
                        {formatCurrency(stats.totalExpense, currencySymbol)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Printable Signature & Verification Footer */}
          <div className="pt-8 pb-4 flex justify-between items-end border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <p className="font-medium text-slate-600 dark:text-slate-400">কম্পিউটার জেনারেটেড রিপোর্ট</p>
            </div>
            <div className="text-center">
              <div className="w-36 border-b border-slate-400 dark:border-slate-600 pb-1 mb-1"></div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">কর্তৃপক্ষের স্বাক্ষর</p>
            </div>
          </div>
        </div>
      </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div
      id="monthlyReportModal"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    >
      {content}
    </div>
  );
};
