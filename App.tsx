/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, SheetConfig, Staff, SalaryPayment, DashboardCardType } from './types';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { DashboardOverview } from './components/DashboardOverview';
import { CardDetailModal } from './components/CardDetailModal';
import { CardDetailPage } from './components/CardDetailPage';
import { StaffSalaryManager } from './components/StaffSalaryManager';
import { SalarySlipModal } from './components/SalarySlipModal';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { DetailModal } from './components/DetailModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ArrowDownToLine, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export const DEFAULT_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwuQephQg0jvzG67agxTpxnfz9eHsOhm0XGcD5abIPHK2LEwhkeDQX107angHKGASxuXw/exec';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [salaries, setSalaries] = useState<SalaryPayment[]>([]);

  const [config, setConfig] = useState<SheetConfig>({
    sheetUrl: DEFAULT_GOOGLE_SHEET_URL,
    sheetId: '',
    autoSync: true,
    lastSyncTime: null,
    syncStatus: 'connected',
    syncMessage: 'গুগল শিট লাইভ সিঙ্ক সক্রিয় রয়েছে',
    companyName: 'আয়-ব্যয়',
    currencySymbol: '৳'
  });

  // User notification toast
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto hide notification after 3.5 seconds
  useEffect(() => {
    if (syncToast) {
      const timer = setTimeout(() => {
        setSyncToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [syncToast]);

  // Dark / Light Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isp_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('isp_dark_mode', String(isDarkMode));
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [isDarkMode]);

  // Admin Login State for New Entry
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isp_admin_logged') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('isp_admin_logged', String(isAdminLoggedIn));
    } catch {}
  }, [isAdminLoggedIn]);

  // Current Navigation Tab: 'dashboard' | 'staff' | 'new_entry' | 'transactions' | 'card_detail' | 'report'
  const [activeNav, setActiveNav] = useState<'dashboard' | 'staff' | 'new_entry' | 'transactions' | 'card_detail' | 'report'>('dashboard');

  // Month selection for accounts & payroll (defaults to current YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Interactive Card Detail Modal
  const [activeCardDetail, setActiveCardDetail] = useState<DashboardCardType | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  // Salary Slip Modal
  const [selectedSalarySlip, setSelectedSalarySlip] = useState<SalaryPayment | null>(null);
  const [isSalarySlipOpen, setIsSalarySlipOpen] = useState(false);

  // Transaction Modals
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [initialEditInModal, setInitialEditInModal] = useState(false);
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // New Transaction Form Preset
  const [formInitialType, setFormInitialType] = useState<'income' | 'expense'>('income');
  const [formInitialCategory, setFormInitialCategory] = useState<string | undefined>(undefined);

  // Monthly Report & Google Sheet Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Synchronized state reference for device back button popstate handling
  const stateRef = useRef({
    activeNav,
    isCardModalOpen,
    isSalarySlipOpen,
    isDetailModalOpen,
    isReportModalOpen,
    isSyncModalOpen
  });

  useEffect(() => {
    stateRef.current = {
      activeNav,
      isCardModalOpen,
      isSalarySlipOpen,
      isDetailModalOpen,
      isReportModalOpen,
      isSyncModalOpen
    };
  }, [activeNav, isCardModalOpen, isSalarySlipOpen, isDetailModalOpen, isReportModalOpen, isSyncModalOpen]);

  // Push history step when navigation or modal changes so physical back button works
  const pushHistoryStep = useCallback((stepName: string) => {
    try {
      window.history.pushState({ appStep: stepName, timestamp: Date.now() }, '');
    } catch {
      // safe fallback in iframe environments
    }
  }, []);

  // Device back button (popstate listener)
  useEffect(() => {
    try {
      if (!window.history.state) {
        window.history.replaceState({ appStep: 'dashboard' }, '');
      }
    } catch {
      // ignore
    }

    const handlePopState = () => {
      const s = stateRef.current;
      // Close open modals in LIFO order
      if (s.isSalarySlipOpen) {
        setIsSalarySlipOpen(false);
        setSelectedSalarySlip(null);
        return;
      }
      if (s.isDetailModalOpen) {
        setIsDetailModalOpen(false);
        setSelectedTransaction(null);
        return;
      }
      if (s.isCardModalOpen) {
        setIsCardModalOpen(false);
        setActiveCardDetail(null);
        return;
      }
      if (s.isReportModalOpen) {
        setIsReportModalOpen(false);
        return;
      }
      if (s.isSyncModalOpen) {
        setIsSyncModalOpen(false);
        return;
      }
      // If on a sub-page, return to dashboard
      if (s.activeNav !== 'dashboard') {
        setActiveNav('dashboard');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation changer with history push
  const handleNavChange = useCallback((newNav: 'dashboard' | 'staff' | 'new_entry' | 'transactions' | 'card_detail' | 'report') => {
    if (newNav === 'new_entry' && !isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'নতুন এন্ট্রি করার জন্য প্রথমে এডমিন লগইন করুন', type: 'error' });
      return;
    }
    if (newNav !== activeNav) {
      if (newNav !== 'dashboard') {
        pushHistoryStep(`nav-${newNav}`);
      }
      setActiveNav(newNav);
      if (newNav !== 'card_detail') {
        setActiveCardDetail(null);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeNav, isAdminLoggedIn, pushHistoryStep]);

  // Global manual Go Back function
  const handleGoBack = useCallback(() => {
    const s = stateRef.current;
    if (s.isSalarySlipOpen) {
      setIsSalarySlipOpen(false);
      setSelectedSalarySlip(null);
      return;
    }
    if (s.isDetailModalOpen) {
      setIsDetailModalOpen(false);
      setSelectedTransaction(null);
      return;
    }
    if (s.isCardModalOpen) {
      setIsCardModalOpen(false);
      setActiveCardDetail(null);
      return;
    }
    if (s.isReportModalOpen) {
      setIsReportModalOpen(false);
      return;
    }
    if (s.isSyncModalOpen) {
      setIsSyncModalOpen(false);
      return;
    }
    if (s.activeNav !== 'dashboard') {
      setActiveNav('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }, []);

  // Fetch data silently without full-screen loading spinner
  const fetchDataSilent = useCallback(async () => {
    try {
      const [txRes, cfgRes, staffRes, salRes] = await Promise.all([
        fetch('/api/transactions?t=' + Date.now()),
        fetch('/api/config?t=' + Date.now()),
        fetch('/api/staff?t=' + Date.now()),
        fetch('/api/salaries?t=' + Date.now())
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
      }

      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig(prev => ({
          ...prev,
          ...cfgData,
          sheetUrl: cfgData.sheetUrl || DEFAULT_GOOGLE_SHEET_URL
        }));
      }

      if (staffRes.ok) {
        const stfData = await staffRes.json();
        setStaffList(stfData);
      }

      if (salRes.ok) {
        const salData = await salRes.json();
        setSalaries(salData);
      }
    } catch (err) {
      console.warn('Silent sync poll notice:', err);
    }
  }, []);

  // Fetch initial data: transactions, config, staff, salaries
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Ensure we pull fresh data from Google Sheet first
      const pullRes = await fetch('/api/sync/pull', { method: 'POST' });
      const data = await pullRes.json();
      
      if (data && data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
      
      // Fetch other data silently
      await fetchDataSilent();
    } catch (err) {
      console.warn('Initial load notice:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchDataSilent]);

  useEffect(() => {
    fetchData();

    // Auto-sync polling every 3 seconds to capture any direct edits in Google Sheets
    const pollTimer = setInterval(() => {
      fetchDataSilent();
    }, 3000);

    // Instant sync when user switches tabs or refocuses window
    const handleFocus = () => {
      fetch('/api/sync/pull', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.transactions)) {
            setTransactions(data.transactions);
          }
        })
        .catch(() => {})
        .finally(() => {
          fetchDataSilent();
        });
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) handleFocus();
    });

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, fetchDataSilent]);

  // Filter transactions by selected month for month-specific metrics safely
  const monthTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(t => {
      if (!t || typeof t.date !== 'string') return false;
      return t.date.startsWith(selectedMonth || '');
    });
  }, [transactions, selectedMonth]);

  // Compute live dashboard metrics for selected month
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    monthTransactions.forEach((t) => {
      if (!t) return;
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
        incomeCount++;
      } else {
        totalExpense += amt;
        expenseCount++;
      }
    });

    const netProfit = totalIncome - totalExpense;

    // Staff paid salaries for this month
    const monthSal = (salaries || []).filter(s => s && s.month === selectedMonth && s.paymentStatus === 'paid');
    const paidSalaries = monthSal.reduce((acc, s) => acc + (Number(s?.netSalary) || 0), 0);

    // Bandwidth & Operations expenses
    const bandwidthCategories = [
      'ব্যান্ডউইথ/আপস্ট্রিম বিল',
      'বিদ্যুৎ বিল',
      'অফিস ভাড়া',
      'অপটিক্যাল ফাইবার ও কেবল',
      'ONU/OLT/Router ক্রয়',
      'স্প্লিটার, জয়েন্ট বক্স ও অন্যান্য যন্ত্রাংশ',
      'কেবল মেরামত ও রক্ষণাবেক্ষণ'
    ];

    const totalBandwidthOps = monthTransactions
      .filter(t => {
        if (!t || t.type !== 'expense') return false;
        const cat = String(t.category || '');
        return (
          bandwidthCategories.includes(cat) ||
          cat.includes('ব্যান্ডউইথ') ||
          cat.includes('বিদ্যুৎ') ||
          cat.includes('কেবল') ||
          cat.includes('ফাইবার')
        );
      })
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const activeStaffCount = (staffList || []).filter(s => s && s.status === 'active').length;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      paidSalaries,
      totalBandwidthOps,
      incomeCount,
      expenseCount,
      staffCount: activeStaffCount
    };
  }, [monthTransactions, salaries, staffList, selectedMonth]);

  // Interactive Card Click Handler (Opens Full Page Card Detail View)
  const handleCardClick = (type: DashboardCardType) => {
    setActiveCardDetail(type);
    handleNavChange('card_detail');
    pushHistoryStep(`card-${type}`);
  };

  // Open New Transaction Form from anywhere
  const handleOpenNewTransaction = (type?: 'income' | 'expense', category?: string) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'নতুন এন্ট্রি করার জন্য প্রথমে এডমিন লগইন করুন', type: 'error' });
      return;
    }
    setFormInitialType(type || 'income');
    setFormInitialCategory(category);
    handleNavChange('new_entry');
  };

  // Open Salary Slip Modal
  const handleViewSalarySlip = (sal: SalaryPayment) => {
    setSelectedSalarySlip(sal);
    setIsSalarySlipOpen(true);
    pushHistoryStep('salary-slip');
  };

  // Open Report Modal / Page
  const handleOpenReportModal = () => {
    handleNavChange('report');
  };

  // Open Google Sheet Sync Modal
  const handleOpenSyncModal = () => {
    setIsSyncModalOpen(true);
    pushHistoryStep('sync-modal');
  };

  // Add new transaction
  const handleAddTransaction = async (data: {
    type: 'income' | 'expense';
    description: string;
    category: string;
    amount: number;
    date: string;
    paymentMethod: string;
    note?: string;
  }) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'নতুন লেনদেন সংযোজন করতে প্রথমে এডমিন লগইন করুন', type: 'error' });
      return false;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const result = await res.json();
        setTransactions(prev => [result.transaction, ...prev]);
        setSyncToast({ message: '✅ নতুন লেনদেনটি সফলভাবে অন্তর্ভুক্ত হয়েছে!', type: 'success' });
        handleNavChange('dashboard');
        return true;
      }
      setSyncToast({ message: '❌ লেনদেন যোগ করতে সমস্যা হয়েছে', type: 'error' });
      return false;
    } catch (err) {
      console.error('Error adding transaction:', err);
      setSyncToast({ message: '❌ ব্যর্থ হয়েছে! আবার চেষ্টা করুন', type: 'error' });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing transaction
  const handleUpdateTransaction = async (id: string, updatedData: Partial<Transaction>) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'লেনদেন এডিট করার জন্য এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (res.ok) {
        const result = await res.json();
        setTransactions(prev =>
          prev.map(t => (t.id === id ? result.transaction : t))
        );
        setSyncToast({ message: '✅ লেনদেনের তথ্য সফলভাবে আপডেট হয়েছে!', type: 'success' });
        return true;
      }
      setSyncToast({ message: '❌ আপডেট করা সম্ভব হয়নি', type: 'error' });
      return false;
    } catch (err) {
      console.error('Error updating transaction:', err);
      setSyncToast({ message: '❌ এডিটে ত্রুটি হয়েছে', type: 'error' });
      return false;
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'লেনদেন ডিলিট করার জন্য এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        if (selectedTransaction?.id === id) {
          setIsDetailModalOpen(false);
          setSelectedTransaction(null);
        }
        setSyncToast({ message: '🗑️ লেনদেনটি সফলভাবে মুছে ফেলা হয়েছে!', type: 'success' });
        return true;
      }
      setSyncToast({ message: '❌ মুছে ফেলা সম্ভব হয়নি', type: 'error' });
      return false;
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setSyncToast({ message: '❌ ডিলিট করার সময় ত্রুটি ঘটেছে', type: 'error' });
      return false;
    }
  };

  // STAFF MANAGEMENT HANDLERS
  const handleAddStaff = async (data: Omit<Staff, 'id' | 'createdAt'>) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'নতুন স্টাফ যোগ করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const newStaff = await res.json();
        setStaffList(prev => [...prev, newStaff]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding staff:', err);
      return false;
    }
  };

  const handleUpdateStaff = async (id: string, data: Partial<Staff>) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'স্টাফ তথ্য পরিবর্তন করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setStaffList(prev => prev.map(s => (s.id === id ? updated : s)));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating staff:', err);
      return false;
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'স্টাফ ডিলিট করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStaffList(prev => prev.filter(s => s.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting staff:', err);
      return false;
    }
  };

  // SALARY DISBURSAL HANDLER
  const handleDisburseSalary = async (data: {
    staffId: string;
    month: string;
    baseSalary: number;
    bonusOrAllowance: number;
    deductionOrAdvance: number;
    paymentStatus: 'paid' | 'pending';
    paymentDate?: string;
    paymentMethod?: string;
    voucherNumber?: string;
    note?: string;
  }) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'বেতন প্রদান করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch('/api/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const record = await res.json();
        // Update salaries in state
        setSalaries(prev => {
          const idx = prev.findIndex(s => s.staffId === data.staffId && s.month === data.month);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = record;
            return copy;
          }
          return [record, ...prev];
        });

        // Re-fetch transactions because paying salary automatically adds or updates an Expense transaction!
        const txRes = await fetch('/api/transactions');
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData);
        }

        return true;
      }
      return false;
    } catch (err) {
      console.error('Error disbursing salary:', err);
      return false;
    }
  };

  const handleDeleteSalary = async (id: string) => {
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
      setSyncToast({ message: 'বেতন রেকর্ড ডিলিট করতে এডমিন লগইন প্রয়োজন', type: 'error' });
      return false;
    }
    try {
      const res = await fetch(`/api/salaries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSalaries(prev => prev.filter(s => s.id !== id));
        // refresh transactions
        const txRes = await fetch('/api/transactions');
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting salary record:', err);
      return false;
    }
  };

  // Save Config
  const handleSaveConfig = async (newConfig: Partial<SheetConfig>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (res.ok) {
        const saved = await res.json();
        setConfig(saved);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving config:', err);
      return false;
    }
  };

  // Force Push to Google Sheet
  const handleForcePush = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/push', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        setConfig(prev => ({
          ...prev,
          syncStatus: 'connected',
          lastSyncTime: new Date().toISOString(),
          syncMessage: 'গুগল শিটে সমস্ত ডাটা সফলভাবে সংরক্ষিত'
        }));
        setTransactions(prev => prev.map(t => ({ ...t, syncedToSheet: true })));
        return { success: true, message: 'গুগল শিটে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে!' };
      } else {
        return { success: false, message: data.error || data.message || 'সিঙ্ক ব্যর্থ হয়েছে' };
      }
    } catch (err: any) {
      return { success: false, message: `সংযোগ ত্রুটি: ${err.message}` };
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when user returns to window tab ("spreadsheets লিখলে এখানে দেখাবে")
  useEffect(() => {
    const handleFocus = () => {
      if (config.sheetUrl && config.autoSync) {
        fetch('/api/sync/pull', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.transactions)) {
              setTransactions(data.transactions);
              setConfig(prev => ({
                ...prev,
                syncStatus: 'connected',
                lastSyncTime: new Date().toISOString()
              }));
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [config.sheetUrl, config.autoSync]);

  // Force Pull from Google Sheet
  const handleForcePull = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/pull', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        setConfig(prev => ({
          ...prev,
          syncStatus: 'connected',
          lastSyncTime: new Date().toISOString(),
          syncMessage: `গুগল শিট থেকে ${data.count} টি রেকর্ড সিঙ্ক হয়েছে`
        }));
        setSyncToast({
          message: `গুগল স্প্রেডশিট থেকে সফলভাবে ${data.count} টি রেকর্ড আপডেট হয়েছে!`,
          type: 'success'
        });
        setTimeout(() => setSyncToast(null), 4000);
        return { success: true, message: `সফলভাবে ${data.count} টি রেকর্ড গুগল শিট থেকে ইমপোর্ট হয়েছে!` };
      } else {
        setSyncToast({
          message: data.error || 'শিট থেকে সঠিক ডাটা পাওয়া যায়নি',
          type: 'error'
        });
        setTimeout(() => setSyncToast(null), 4000);
        return { success: false, message: data.error || 'ইমপোর্ট ব্যর্থ হয়েছে' };
      }
    } catch (err: any) {
      setSyncToast({
        message: `সংযোগ ত্রুটি: ${err.message}`,
        type: 'error'
      });
      setTimeout(() => setSyncToast(null), 4000);
      return { success: false, message: `সংযোগ ত্রুটি: ${err.message}` };
    } finally {
      setIsSyncing(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    window.open('/api/export/csv', '_blank');
  };

  return (
    <main className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-[#f0f4fa] text-slate-900'} py-4 sm:py-5 px-3 sm:px-6 max-w-6xl mx-auto font-sans pb-24 sm:pb-8 transition-colors`}>
      {/* Top Toast Notification */}
      {syncToast && (
        <div 
          onClick={() => setSyncToast(null)}
          className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-4 duration-300 cursor-pointer"
          title="ক্লিক করে হাইড করুন"
        >
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${
            syncToast.type === 'success' 
              ? 'bg-emerald-900 text-white border-emerald-700' 
              : 'bg-rose-900 text-white border-rose-700'
          }`}>
            {syncToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{syncToast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header with Branding & Navigation Tabs */}
      <Header
        config={config}
        activeNav={activeNav}
        onNavChange={handleNavChange}
        onOpenSyncModal={handleOpenSyncModal}
        onOpenReportModal={handleOpenReportModal}
        onExportCsv={handleExportCsv}
        isSyncing={isSyncing}
        onQuickSync={handleForcePush}
        onPullFromSheet={handleForcePull}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onAdminLogout={() => {
          setIsAdminLoggedIn(false);
          setSyncToast({ message: 'এডমিন লগআউট সফল হয়েছে', type: 'success' });
        }}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={() => {
          setIsAdminLoggedIn(true);
          setSyncToast({ message: 'এডমিন লগইন সফল হয়েছে! এখন নতুন এন্ট্রি করতে পারবেন।', type: 'success' });
          handleNavChange('new_entry');
        }}
      />

      {/* VIEW 1: DASHBOARD VIEW (NO TRANSACTION LIST AT BOTTOM!) */}
      {activeNav === 'dashboard' && (
        <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
          {/* Google Sheets Live Status Banner (Desktop/Tablet only - hidden on mobile as requested) */}
          {config.sheetUrl && (
            <div className="hidden md:flex bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 border border-emerald-300/80 dark:border-emerald-800/80 rounded-2xl p-3 sm:px-4 flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>
                  <strong className="text-emerald-950 dark:text-emerald-300 font-bold">গুগল স্প্রেডশিট সংযুক্ত:</strong> আপনি সরাসরি গুগল শিটে কোনো লেনদেন লিখলেও এখানে তা সাথে সাথে লোড হবে।
                </span>
              </div>
              <button
                onClick={handleForcePull}
                disabled={isSyncing}
                title="গুগল শিট থেকে নতুন ডাটা আনুন"
                className="shrink-0 px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold flex items-center gap-1.5 transition shadow-2xs active:scale-95 disabled:opacity-50"
              >
                <ArrowDownToLine className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span>শিট থেকে রিফ্রেশ</span>
              </button>
            </div>
          )}

          {/* 5 Interactive Colorful KPI Cards (2 per line on mobile: grid-cols-2 lg:grid-cols-4) */}
          <StatsCards
            totalIncome={stats.totalIncome}
            totalExpense={stats.totalExpense}
            netProfit={stats.netProfit}
            paidSalaries={stats.paidSalaries}
            totalBandwidthOps={stats.totalBandwidthOps}
            incomeCount={stats.incomeCount}
            expenseCount={stats.expenseCount}
            staffCount={stats.staffCount}
            onCardClick={handleCardClick}
            onNavigateToLedger={() => handleNavChange('transactions')}
            currencySymbol={config.currencySymbol}
          />

          {/* 
            ANIMATED ENTRY FORM TRIGGER ON DASHBOARD:
            "নতুন লেনদেন এন্ট্রি ফরম দেখাবে না লেখা এনিমেশন হবে চাপ দিলে ফর্ম আসবে , ডেটা হারাবে না"
          */}
          <TransactionForm
            onAddTransaction={handleAddTransaction}
            isSubmitting={isSubmitting}
            initialType={formInitialType}
            initialCategory={formInitialCategory}
            isOpenInitially={false}
            isAdminLoggedIn={isAdminLoggedIn}
            onRequireLogin={() => setIsAdminLoginModalOpen(true)}
          />

          {/* ISP Revenue/Expense Stream Analysis & Quick Actions (NO TRANSACTION LIST!) */}
          <DashboardOverview
            transactions={transactions}
            salaries={salaries}
            staffList={staffList}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onOpenCardDetail={handleCardClick}
            onOpenNewTransaction={handleOpenNewTransaction}
            onNavigateToStaff={() => handleNavChange('staff')}
            onNavigateToLedger={() => handleNavChange('transactions')}
            config={config}
          />
        </div>
      )}

      {/* VIEW 2: STAFF & SALARY MANAGEMENT (পে-রোল ও স্টাফ বেতন হিসাব) */}
      {activeNav === 'staff' && (
        <StaffSalaryManager
          staffList={staffList}
          salaries={salaries}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onAddStaff={handleAddStaff}
          onUpdateStaff={handleUpdateStaff}
          onDeleteStaff={handleDeleteStaff}
          onDisburseSalary={handleDisburseSalary}
          onDeleteSalary={handleDeleteSalary}
          onViewSalarySlip={handleViewSalarySlip}
          config={config}
          onBackToDashboard={() => handleNavChange('dashboard')}
          isAdminLoggedIn={isAdminLoggedIn}
          onRequireLogin={() => setIsAdminLoginModalOpen(true)}
        />
      )}

      {/* VIEW 3: NEW TRANSACTION ENTRY */}
      {activeNav === 'new_entry' && (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-200">
          <TransactionForm
            onAddTransaction={handleAddTransaction}
            isSubmitting={isSubmitting}
            initialType={formInitialType}
            initialCategory={formInitialCategory}
            isOpenInitially={true}
            isAdminLoggedIn={isAdminLoggedIn}
            onRequireLogin={() => setIsAdminLoginModalOpen(true)}
          />
        </div>
      )}

      {/* VIEW 4: COMPLETE TRANSACTION LEDGER (পৃথক লেনদেন খতিয়ান) */}
      {activeNav === 'transactions' && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                কোম্পানির পূর্ণাঙ্গ লেনদেন খতিয়ান (Transaction Ledger)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                সর্বমোট {transactions.length} টি আয় ও ব্যয়ের বিস্তারিত রেকর্ড ও অনুসন্ধান
              </p>
            </div>
            <button
              onClick={() => handleOpenNewTransaction()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <span>+ নতুন এন্ট্রি</span>
            </button>
          </div>

          <TransactionList
            transactions={transactions}
            activeTypeFilter={activeTypeFilter}
            onTypeFilterChange={setActiveTypeFilter}
            onSelectTransaction={(txn) => {
              setSelectedTransaction(txn);
              setInitialEditInModal(false);
              setIsDetailModalOpen(true);
              pushHistoryStep('txn-detail');
            }}
            onEditTransaction={(txn) => {
              if (!isAdminLoggedIn) {
                setIsAdminLoginModalOpen(true);
                return;
              }
              setSelectedTransaction(txn);
              setInitialEditInModal(true);
              setIsDetailModalOpen(true);
              pushHistoryStep('txn-edit');
            }}
            onDeleteTransaction={handleDeleteTransaction}
            currencySymbol={config.currencySymbol}
            isAdminLoggedIn={isAdminLoggedIn}
          />
        </div>
      )}

      {/* VIEW 5: FULL PAGE CARD DETAIL */}
      {activeNav === 'card_detail' && (
        <CardDetailPage
          type={activeCardDetail}
          transactions={transactions}
          salaries={salaries}
          staffList={staffList}
          config={config}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onOpenNewTransaction={handleOpenNewTransaction}
          onNavigateToStaff={() => handleNavChange('staff')}
          onNavigateToLedger={(filterType) => {
            if (filterType) {
              setActiveTypeFilter(filterType);
            }
            handleNavChange('transactions');
          }}
          onSelectTransaction={(txn) => {
            setSelectedTransaction(txn);
            setInitialEditInModal(false);
            setIsDetailModalOpen(true);
            pushHistoryStep('txn-detail');
          }}
          onDeleteTransaction={handleDeleteTransaction}
          onViewSalarySlip={handleViewSalarySlip}
          isAdminLoggedIn={isAdminLoggedIn}
        />
      )}

      {/* VIEW 6: REPORT PAGE VIEW */}
      {activeNav === 'report' && (
        <div className="animate-in fade-in duration-200">
          <MonthlyReportModal
            isOpen={true}
            onClose={() => handleNavChange('dashboard')}
            transactions={transactions}
            config={config}
            currencySymbol={config.currencySymbol}
            isFullPage={true}
          />
        </div>
      )}

      {/* Bottom Information Tip */}
      <footer className="text-center py-6 text-xs text-slate-500 no-print">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-200/70 border border-slate-300/40 text-slate-600 font-medium">
          💡 ড্যাশবোর্ডের যেকোনো রঙিন কার্ডে ক্লিক করে নির্দিষ্ট তথ্য ও লেনদেন দেখুন | ডিভাইসের ব্যাক বাটন কাজ করবে
        </span>
      </footer>

      {/* Modern Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeNav={activeNav === 'card_detail' ? 'dashboard' : activeNav}
        onNavChange={handleNavChange}
        onOpenReportModal={handleOpenReportModal}
      />

      {/* MODAL 1: CARD DETAIL MODAL (Opens when clicking any Dashboard Card!) */}
      <CardDetailModal
        type={activeCardDetail}
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setActiveCardDetail(null);
        }}
        transactions={transactions}
        salaries={salaries}
        staffList={staffList}
        config={config}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenNewTransaction={handleOpenNewTransaction}
        onNavigateToStaff={() => handleNavChange('staff')}
        onNavigateToLedger={(filterType) => {
          if (filterType) {
            setActiveTypeFilter(filterType);
          }
          setIsCardModalOpen(false);
          setActiveCardDetail(null);
          handleNavChange('transactions');
        }}
        onSelectTransaction={(txn) => {
          setSelectedTransaction(txn);
          setInitialEditInModal(false);
          setIsDetailModalOpen(true);
          pushHistoryStep('txn-detail');
        }}
        onDeleteTransaction={handleDeleteTransaction}
        onViewSalarySlip={handleViewSalarySlip}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* MODAL 2: PRINTABLE SALARY SLIP / VOUCHER MODAL */}
      <SalarySlipModal
        salary={selectedSalarySlip}
        isOpen={isSalarySlipOpen}
        onClose={() => {
          setIsSalarySlipOpen(false);
          setSelectedSalarySlip(null);
        }}
        config={config}
      />

      {/* MODAL 3: TRANSACTION DETAIL & EDIT MODAL */}
      <DetailModal
        transaction={selectedTransaction}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        currencySymbol={config.currencySymbol}
        initialEditMode={initialEditInModal}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* MODAL 4: MONTHLY REPORT & PRINTABLE STATEMENT MODAL */}
      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transactions={transactions}
        config={config}
        currencySymbol={config.currencySymbol}
      />

      {/* MODAL 5: GOOGLE SHEETS SYNC MODAL */}
      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onForcePush={handleForcePush}
        onForcePull={handleForcePull}
        isSyncing={isSyncing}
      />
    </main>
  );
}
