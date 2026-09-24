import React, { useState, useEffect } from 'react';
import { TransactionType } from '../types';
import { 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  PAYMENT_METHODS, 
  QUICK_TEMPLATES 
} from '../data/categories';
import { 
  PlusCircle, 
  Check, 
  Tag, 
  Calendar, 
  CreditCard, 
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Edit2,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface TransactionFormProps {
  onAddTransaction: (data: {
    type: TransactionType;
    description: string;
    category: string;
    amount: number;
    date: string;
    paymentMethod: string;
    note?: string;
  }) => Promise<boolean>;
  isSubmitting: boolean;
  initialType?: TransactionType;
  initialCategory?: string;
  isOpenInitially?: boolean;
  onToggleOpen?: (isOpen: boolean) => void;
  isAdminLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

const ANIMATED_PROMPTS = [
  '✨ নতুন আয় বা ব্যয়ের হিসাব এন্ট্রি করতে এখানে চাপ দিন ✍️',
  '📶 ইন্টারনেট বিল, ডিস বিল বা বকেয়া কালেকশন যোগ করুন ⚡',
  '🌐 ব্যান্ডউইথ বিল, বিদ্যুৎ, কেবল ও বিজ্ঞাপন প্রচার খরচ লিখুন 📑',
  '💰 ক্লিক করলেই এন্ট্রি ফর্ম চলে আসবে — কোনো ডেটা হারাবে না 🔒'
];

const DRAFT_STORAGE_KEY = 'aay_byay_form_draft_v2';

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onAddTransaction,
  isSubmitting,
  initialType = 'income',
  initialCategory,
  isOpenInitially = false,
  onToggleOpen,
  isAdminLoggedIn = false,
  onRequireLogin
}) => {
  // Form visibility state: Default to false as requested ("নতুন লেনদেন এন্ট্রি ফরম দেখাবে না লেখা এনিমেশন হবে চাপ দিলে ফর্ম আসবে")
  const [isOpen, setIsOpen] = useState(isOpenInitially);

  // Animated text index & typewriter effect
  const [promptIndex, setPromptIndex] = useState(0);

  // Form Fields (load from draft if available to ensure "ডেটা হারাবে না")
  const [type, setType] = useState<TransactionType>(initialType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(
    initialCategory || (initialType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  );
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [note, setNote] = useState('');
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.amount) setAmount(parsed.amount);
        if (parsed.type) setType(parsed.type);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.customCategory) setCustomCategory(parsed.customCategory);
        if (parsed.date) setDate(parsed.date);
        if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
        if (parsed.note) setNote(parsed.note);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Save draft whenever user types so "ডেটা হারাবে না"
  useEffect(() => {
    try {
      const draft = {
        type,
        description,
        amount,
        category,
        customCategory,
        date,
        paymentMethod,
        note
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      // ignore
    }
  }, [type, description, amount, category, customCategory, date, paymentMethod, note]);

  // Rotate animated prompt every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % ANIMATED_PROMPTS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // React to external initialType / initialCategory updates
  useEffect(() => {
    if (initialType) {
      setType(initialType);
      if (initialCategory) {
        setCategory(initialCategory);
        setCustomCategory('');
        setIsOpen(true); // auto-open if specific category was requested
      } else {
        setCategory(initialType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
      }
    }
  }, [initialType, initialCategory]);

  const toggleFormOpen = () => {
    if (!isAdminLoggedIn && !isOpen) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (onToggleOpen) onToggleOpen(nextState);
  };

  // Handle Type Change
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setCustomCategory('');
  };

  // Quick Template apply
  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setType(tpl.type);
    setDescription(tpl.label);
    setCategory(tpl.category);
    setCustomCategory('');
    setAmount(String(tpl.amount));
    if (!isOpen) setIsOpen(true);
  };

  const isOtherCategory = 
    category === 'অন্যান্য আয়' || 
    category === 'অন্যান্য খরচ' || 
    category.startsWith('অন্যান্য');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdminLoggedIn) {
      if (onRequireLogin) onRequireLogin();
      return;
    }

    if (!description.trim()) {
      alert('❌ অনুগ্রহ করে লেনদেনের বিবরণ লিখুন');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('❌ সঠিক টাকার পরিমাণ দিন (০ এর বেশি)');
      return;
    }

    // Final category resolution: if "অন্যান্য", use the custom typed text!
    let finalCategory = category;
    if (isOtherCategory) {
      if (!customCategory.trim()) {
        alert(type === 'income' ? '❌ অনুগ্রহ করে অন্যান্য আয়ের খাতের নাম লিখুন' : '❌ অনুগ্রহ করে অন্যান্য খরচের খাতের নাম লিখুন');
        return;
      }
      finalCategory = customCategory.trim();
    }

    const success = await onAddTransaction({
      type,
      description: description.trim(),
      category: finalCategory,
      amount: numAmount,
      date: date || new Date().toISOString().split('T')[0],
      paymentMethod,
      note: note.trim()
    });

    if (success) {
      setDescription('');
      setAmount('');
      setCustomCategory('');
      setNote('');
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 2500);
    }
  };

  const activeCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="w-full mb-6 no-print">
      {/* 
        ANIMATED INTERACTIVE BANNER: 
        User requirement: "নতুন লেনদেন এন্ট্রি ফরম দেখাবে না লেখা এনিমেশন হবে চাপ দিলে ফর্ম আসবে , ডেটা হারাবে না"
      */}
      <div 
        onClick={toggleFormOpen}
        id="btn-toggle-entry-form"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFormOpen(); }}
        className={`group relative overflow-hidden rounded-3xl p-4 sm:p-5 cursor-pointer transition-all duration-300 shadow-sm border ${
          isOpen 
            ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-indigo-500/40 shadow-md' 
            : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 hover:from-emerald-100/90 hover:via-teal-100/90 hover:to-indigo-100 dark:hover:from-slate-800 text-slate-800 dark:text-slate-100 border-emerald-300/80 dark:border-emerald-800 shadow-xs hover:shadow-md'
        }`}
      >
        {/* Animated Background Shimmer Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            {/* Animated Pulsing Icon */}
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
              isOpen 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-none animate-pulse'
            }`}>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>

            {/* Dynamic Text with Entrance Animation */}
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isOpen ? 'bg-indigo-800 text-indigo-200' : 'bg-emerald-600 dark:bg-emerald-500 text-white'
                }`}>
                  {isOpen ? 'ফরম সক্রিয়' : 'ক্লিক করুন'}
                </span>
                <span className={`text-xs font-semibold ${isOpen ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                  (ডেটা স্বয়ংক্রিয় সংরক্ষিত)
                </span>
              </div>

              {/* Animated Text Switching */}
              <div className="mt-1 min-h-[28px] flex items-center">
                <p 
                  key={promptIndex} 
                  className={`text-xs sm:text-sm md:text-base font-bold transition-all duration-300 transform animate-in fade-in slide-in-from-bottom-1 leading-snug ${
                    isOpen ? 'text-indigo-100' : 'text-slate-900 dark:text-emerald-300 group-hover:text-emerald-950 dark:group-hover:text-emerald-200'
                  }`}
                >
                  {isOpen ? '✍️ নিচে আপনার আয় বা ব্যয়ের তথ্য প্রদান করুন' : ANIMATED_PROMPTS[promptIndex]}
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Trigger Pill */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
              isOpen 
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}>
              {isOpen ? (
                <>
                  <span>ফরম লুকান</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>+ এন্ট্রি ফরম খুলুন</span>
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 
        EXPANDABLE FORM CONTAINER: 
        Only rendered / shown when clicked (or if auto-triggered)
      */}
      {isOpen && (
        <div className="mt-3 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                <Edit2 className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                  নতুন লেনদেন সংযোজন
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  সঠিক খাত ও বিবরণ দিয়ে সেভ করুন, গুগল শিটেও অবিলম্বে সংরক্ষিত হবে
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMoreFields(!showMoreFields)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                {showMoreFields ? 'সংক্ষিপ্ত ভিউ' : '+ বাড়তি নোট'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="ফরম লুকান"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Category Templates */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-4 text-xs scrollbar-none">
            <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap text-[11px] font-bold">এক-ক্লিকে ফিল:</span>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-950/80 dark:text-slate-300 dark:hover:text-indigo-300 text-slate-700 whitespace-nowrap text-[11px] font-semibold transition border border-slate-200/80 dark:border-slate-700 active:scale-95 cursor-pointer"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Income vs Expense Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                id="btn-type-income"
                onClick={() => handleTypeChange('income')}
                className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📥 আয় (Income)</span>
              </button>
              <button
                type="button"
                id="btn-type-expense"
                onClick={() => handleTypeChange('expense')}
                className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📤 ব্যয় (Expense)</span>
              </button>
            </div>

            {/* Description & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                  লেনদেনের বিবরণ *
                </label>
                <input
                  type="text"
                  id="descInput"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === 'income' ? 'যেমন: সেপ্টেম্বর ইন্টারনেট বিল কালেকশন' : 'যেমন: আপস্ট্রিম ব্যান্ডউইথ সেপ্টেম্বর বিল'}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/20 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                  টাকার পরিমাণ (৳) *
                </label>
                <input
                  type="number"
                  id="amountInput"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="টাকার পরিমাণ (যেমন: ৫০০০)"
                  min="1"
                  step="any"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/20 transition"
                  required
                />
              </div>
            </div>

            {/* Category Dropdown & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>হিসাবের খাত / বিভাগ *</span>
                </label>
                <select
                  id="categorySelect"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/20 transition"
                >
                  {activeCategories.map((cat) => (
                    <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {cat}
                    </option>
                  ))}
                </select>

                {/* 
                  CUSTOM CATEGORY INPUT:
                  User requirement:
                  "অন্যান্য আয় সিলেক্ট করলে টাইপ করে লেথা যাবে"
                  "অন্যান্য খরচ সিলেক্ট করলে টাইপ করে লেথা যাবে"
                */}
                {isOtherCategory && (
                  <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1 ml-1 flex items-center gap-1">
                      <span>✍️ {type === 'income' ? 'অন্যান্য আয়ের নাম লিখুন' : 'অন্যান্য খরচের নাম লিখুন'} *</span>
                    </label>
                    <input
                      type="text"
                      id="customCategoryInput"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder={type === 'income' ? 'যেমন: পুরোনো ক্যাবল/রাউটার বিক্রয়, অন্যান্য সার্ভিস' : 'যেমন: অফিসের চা-নাস্তা, মেরামত ফি, অনুদান'}
                      className="w-full px-4 py-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-amber-800/60 dark:placeholder:text-amber-300/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>তারিখ</span>
                </label>
                <input
                  type="date"
                  id="dateInput"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/20 transition"
                />
              </div>
            </div>

            {/* Payment Method & Extended Note Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>পেমেন্ট মাধ্যম</span>
                </label>
                <select
                  id="paymentMethodSelect"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/20 transition"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>রেফারেন্স / নোট (ঐচ্ছিক)</span>
                </label>
                <input
                  type="text"
                  id="noteInput"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ইনভয়েস / রসিদ নং বা মন্তব্য"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/20 transition"
                />
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>অটো-ড্রাফট সক্রিয় — ভুলবশত পেজ রিলোড হলেও তথ্য হারাবে না</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/3 sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  id="btn-submit-transaction"
                  disabled={isSubmitting}
                  className={`w-2/3 sm:w-auto px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    type === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  } disabled:opacity-50 active:scale-95`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>সফলভাবে যুক্ত হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>{type === 'income' ? 'আয় সংরক্ষণ করুন' : 'ব্যয় সংরক্ষণ করুন'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
