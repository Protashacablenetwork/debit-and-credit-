import React, { useState } from 'react';
import { SheetConfig } from '../types';
import { 
  X, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
  Code
} from 'lucide-react';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetConfig;
  onSaveConfig: (updated: Partial<SheetConfig>) => Promise<boolean>;
  onForcePush: () => Promise<{ success: boolean; message: string }>;
  onForcePull: () => Promise<{ success: boolean; message: string }>;
  isSyncing: boolean;
}

export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhLi852BMiQb5S4Vf6vx_T0K8DMuGkHTLT-acWh8IvpnUmAe3fGYrGoR0V3rQdVcpw/exec';

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onForcePush,
  onForcePull,
  isSyncing,
}) => {
  const [sheetUrl, setSheetUrl] = useState(config.sheetUrl || DEFAULT_SCRIPT_URL);
  const [companyName, setCompanyName] = useState(config.companyName || 'স্মার্ট বিজনেস সল্যুশনস');
  const [autoSync, setAutoSync] = useState(config.autoSync ?? true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: ''
  });

  React.useEffect(() => {
    if (config.sheetUrl) {
      setSheetUrl(config.sheetUrl);
    } else {
      setSheetUrl(DEFAULT_SCRIPT_URL);
    }
    if (config.companyName) {
      setCompanyName(config.companyName);
    }
    if (config.autoSync !== undefined) {
      setAutoSync(config.autoSync);
    }
  }, [config]);

  if (!isOpen) return null;

  // Apps Script template code
  const googleAppsScriptCode = `/**
 * আয়-ব্যয় হিসাব (Income-Expense Tracker) - Google Apps Script Backend Web App
 * Instructions:
 * 1. Open your Google Sheet
 * 2. Extensions > Apps Script
 * 3. Paste this code and click Deploy > New Deployment > Web App (Who has access: Anyone)
 */

function ensureCorrectHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["আইডি", "তারিখ", "ধরন", "বিবরণ", "বিভাগ", "আয়", "ব্যয়", "পেমেন্ট মাধ্যম", "নোট", "সিঙ্ক সময়"]);
    sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.getRange(1, 6).setBackground("#d1fae5").setFontColor("#065f46"); // Green for Income
    sheet.getRange(1, 7).setBackground("#ffe4e6").setFontColor("#9f1239"); // Red for Expense
    return;
  }

  // Check existing row 1 header
  var headerRow = sheet.getRange(1, 1, 1, Math.max(10, sheet.getLastColumn())).getValues()[0];
  var colFHeader = String(headerRow[5] || '').trim();

  // If header is "পরিমাণ" (old 9-column format), migrate automatically!
  if (colFHeader === "পরিমাণ" || headerRow.length < 10) {
    var lastRow = sheet.getLastRow();
    var allData = sheet.getRange(1, 1, lastRow, Math.max(9, sheet.getLastColumn())).getValues();
    
    sheet.clearContents();
    sheet.appendRow(["আইডি", "তারিখ", "ধরন", "বিবরণ", "বিভাগ", "আয়", "ব্যয়", "পেমেন্ট মাধ্যম", "নোট", "সিঙ্ক সময়"]);
    sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.getRange(1, 6).setBackground("#d1fae5").setFontColor("#065f46");
    sheet.getRange(1, 7).setBackground("#ffe4e6").setFontColor("#9f1239");

    for (var i = 1; i < allData.length; i++) {
      var r = allData[i];
      if (!r || r.length < 3) continue;
      var rawType = String(r[2] || '').trim().toLowerCase();
      var isInc = (rawType === 'আয়' || rawType === 'আয়' || rawType === 'income');
      var amt = parseFloat(String(r[5] || '0').replace(/[,৳\s]/g, '')) || 0;
      
      sheet.appendRow([
        r[0] || '',
        r[1] || '',
        isInc ? 'আয়' : 'ব্যয়',
        r[3] || '',
        r[4] || '',
        isInc ? amt : 0,
        !isInc ? amt : 0,
        r[6] || 'নগদ',
        r[7] || '',
        r[8] || new Date().toLocaleString()
      ]);
    }
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    ensureCorrectHeaders(sheet);
    
    var data = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    var action = data.action || 'add';

    if (action === 'get_all') {
      return doGet(e);
    }

    if (action === 'delete' && (data.id || data.transaction)) {
      var targetId = data.id ? String(data.id) : '';
      var targetDesc = data.transaction ? String(data.transaction.description || '') : '';
      var rows = sheet.getDataRange().getValues();
      var deleted = false;
      for (var i = rows.length - 1; i >= 1; i--) {
        var rowId = String(rows[i][0] || '');
        var rowDesc = String(rows[i][3] || '');
        if ((targetId && rowId === targetId) || (targetDesc && rowDesc === targetDesc)) {
          sheet.deleteRow(i + 1);
          deleted = true;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "এন্ট্রি ডিলিট হয়েছে", deleted: deleted }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'update' && data.transaction) {
      var t = data.transaction;
      var targetId = String(t.id || '');
      var rows = sheet.getDataRange().getValues();
      var updated = false;
      var isInc = (t.type === 'income');
      var incAmt = isInc ? (Number(t.amount) || 0) : 0;
      var expAmt = !isInc ? (Number(t.amount) || 0) : 0;

      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][0]) === targetId) {
          sheet.getRange(i + 1, 1, 1, 10).setValues([[
            t.id || 'TXN-' + new Date().getTime(),
            t.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
            isInc ? 'আয়' : 'ব্যয়',
            t.description || '',
            t.category || 'অন্যান্য',
            incAmt,
            expAmt,
            t.paymentMethod || 'নগদ',
            t.note || '',
            new Date().toLocaleString()
          ]]);
          updated = true;
          break;
        }
      }
      if (!updated) {
        sheet.appendRow([
          t.id || 'TXN-' + new Date().getTime(),
          t.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
          isInc ? 'আয়' : 'ব্যয়',
          t.description || '',
          t.category || 'অন্যান্য',
          incAmt,
          expAmt,
          t.paymentMethod || 'নগদ',
          t.note || '',
          new Date().toLocaleString()
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "এন্ট্রি আপডেট হয়েছে" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'add' && data.transaction) {
      var t = data.transaction;
      var isInc = (t.type === 'income');
      var incAmt = isInc ? (Number(t.amount) || 0) : 0;
      var expAmt = !isInc ? (Number(t.amount) || 0) : 0;

      sheet.appendRow([
        t.id || 'TXN-' + new Date().getTime(),
        t.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
        isInc ? 'আয়' : 'ব্যয়',
        t.description || '',
        t.category || 'অন্যান্য',
        incAmt,
        expAmt,
        t.paymentMethod || 'নগদ',
        t.note || '',
        new Date().toLocaleString()
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "এন্ট্রি যোগ হয়েছে" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'bulk_sync') {
      var list = data.transactions || [];
      sheet.clearContents();
      sheet.appendRow(["আইডি", "তারিখ", "ধরন", "বিবরণ", "বিভাগ", "আয়", "ব্যয়", "পেমেন্ট মাধ্যম", "নোট", "সিঙ্ক সময়"]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#f1f5f9");
      sheet.getRange(1, 6).setBackground("#d1fae5").setFontColor("#065f46"); // Green for Income
      sheet.getRange(1, 7).setBackground("#ffe4e6").setFontColor("#9f1239"); // Red for Expense
      
      list.forEach(function(t) {
        var isInc = (t.type === 'income');
        sheet.appendRow([
          t.id || 'TXN-' + new Date().getTime(),
          t.date || '',
          isInc ? 'আয়' : 'ব্যয়',
          t.description || '',
          t.category || 'অন্যান্য',
          isInc ? (Number(t.amount) || 0) : 0,
          !isInc ? (Number(t.amount) || 0) : 0,
          t.paymentMethod || 'নগদ',
          t.note || '',
          new Date().toLocaleString()
        ]);
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: list.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  ensureCorrectHeaders(sheet);
  var rows = sheet.getDataRange().getValues();
  var transactions = [];
  
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r || r.length < 3) continue;

    // Check if row has some content
    var hasContent = false;
    for (var c = 0; c < r.length; c++) {
      if (r[c] !== "" && r[c] !== null && r[c] !== undefined) {
        hasContent = true;
        break;
      }
    }
    if (!hasContent) continue;

    var id = r[0] ? String(r[0]) : ('TXN-ROW-' + i + '-' + new Date().getTime());
    var rawDate = r[1];
    var dateStr = '';
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (rawDate) {
      dateStr = String(rawDate);
    } else {
      dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    }

    var rawType = String(r[2] || '').trim().toLowerCase();
    var desc = String(r[3] || 'শিট লেনদেন').trim();
    var cat = String(r[4] || 'অন্যান্য').trim();
    
    var incAmt = parseFloat(String(r[5] || '0').replace(/[,৳\\s]/g, '')) || 0;
    var expAmt = parseFloat(String(r[6] || '0').replace(/[,৳\\s]/g, '')) || 0;
    
    var type = 'income';
    var amount = 0;
    var pMethod = 'নগদ';
    var note = '';

    if (r.length >= 10 && (incAmt > 0 || expAmt > 0)) {
      if (incAmt > 0) {
        type = 'income';
        amount = incAmt;
      } else {
        type = 'expense';
        amount = expAmt;
      }
      pMethod = String(r[7] || 'নগদ').trim();
      note = String(r[8] || '').trim();
    } else {
      type = (rawType === 'আয়' || rawType === 'আয়' || rawType === 'income') ? 'income' : 'expense';
      amount = incAmt;
      pMethod = String(r[6] || 'নগদ').trim();
      note = String(r[7] || '').trim();
    }

    if (amount > 0 || desc) {
      transactions.push({
        id: id,
        date: dateStr,
        type: type,
        description: desc,
        category: cat,
        amount: amount,
        paymentMethod: pMethod,
        note: note,
        syncedToSheet: true
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ 
    status: "success", 
    count: transactions.length, 
    transactions: transactions 
  })).setMimeType(ContentService.MimeType.JSON);
}`;

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSaveConfig({
      sheetUrl: sheetUrl.trim(),
      companyName: companyName.trim(),
      autoSync
    });

    if (ok) {
      setSyncStatusMsg({ type: 'success', text: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে' });
      setTimeout(() => setSyncStatusMsg({ type: '', text: '' }), 3000);
    }
  };

  const handleTriggerPush = async () => {
    setSyncStatusMsg({ type: '', text: '' });
    const res = await onForcePush();
    setSyncStatusMsg({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
  };

  const handleTriggerPull = async () => {
    setSyncStatusMsg({ type: '', text: '' });
    const res = await onForcePull();
    setSyncStatusMsg({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
  };

  return (
    <div
      id="sheetSyncModalOverlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="sheetSyncModalContent"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                গুগল শিট লাইভ সিঙ্ক সেন্টার
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ডাটাবেসের বিকল্প হিসেবে সরাসরি গুগল শিটে রিয়েল-টাইম ডাটা সিঙ্কিং
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        {syncStatusMsg.text && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 ${
              syncStatusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {syncStatusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{syncStatusMsg.text}</span>
          </div>
        )}

        {/* Form Settings */}
        <form onSubmit={handleSaveSettings} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                গুগল শিট লাইভ সিঙ্ক সেন্টার লিংক (কোডে কনফিগার করা):
              </label>
              {sheetUrl === DEFAULT_SCRIPT_URL ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                  <Check className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                  কোড লিঙ্ক সক্রিয়
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setSheetUrl(DEFAULT_SCRIPT_URL)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold underline"
                >
                  কোডের আসল লিঙ্কটি ব্যবহার করুন
                </button>
              )}
            </div>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              গুগল অ্যাপস স্ক্রিপ্ট লাইভ সিঙ্ক URL কোডের ভেতরে স্থায়ীভাবে যুক্ত করা হয়েছে।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                প্রতিষ্ঠানের নাম:
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="স্মার্ট বিজনেস সল্যুশনস"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  স্বয়ংক্রিয় লাইভ সিঙ্ক
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  প্রতিটি এন্ট্রির সাথে সাথে শিটে যোগ
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs sm:text-sm transition shadow-sm"
            >
              সেটিংস সংরক্ষণ করুন
            </button>

            {sheetUrl && (
              <>
                <button
                  type="button"
                  onClick={handleTriggerPush}
                  disabled={isSyncing}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                  title="বর্তমান সব লেনদেন শিটে পাঠান"
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5" />
                  <span>শিটে পাঠান (Push)</span>
                </button>
                <button
                  type="button"
                  onClick={handleTriggerPull}
                  disabled={isSyncing}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-full font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                  title="শিটের ডাটা অ্যাপে আনুন"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>শিট থেকে আনুন (Pull)</span>
                </button>
              </>
            )}
          </div>
        </form>

        {/* 1-Minute Google Apps Script Guide */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>১ মিনিটে গুগল শিট কানেক্ট করার কোড ও গাইড:</span>
            </h4>
            <button
              onClick={copyScriptToClipboard}
              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold transition cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>কোড কপি করুন</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 mb-3 leading-relaxed">
            <p><strong>ধাপ ১:</strong> আপনার জিমেইলে গুগল ড্রাইভে একটি নতুন <strong>Google Sheet</strong> খুলুন।</p>
            <p><strong>ধাপ ২:</strong> শিটের ওপরের মেনু থেকে <strong>Extensions &gt; Apps Script</strong> এ ক্লিক করুন।</p>
            <p><strong>ধাপ ৩:</strong> সেখানে আগের কোড মুছে দিয়ে উপরের <strong>"কোড কপি করুন"</strong> বাটনের কোডটি পেস্ট করুন।</p>
            <p><strong>ধাপ ৪:</strong> নীল <strong>Deploy &gt; New deployment</strong> এ ক্লিক করে <em>Select type &gt; Web app</em> সিলেক্ট করুন। <em>Who has access: <strong>Anyone</strong></em> দিয়ে <strong>Deploy</strong> এ চাপুন।</p>
            <p><strong>ধাপ ৫:</strong> পাওয়া Web app URL টি উপরের বক্সে বসিয়ে <strong>"সেটিংস সংরক্ষণ"</strong> করুন। এরপর প্রতিটি এন্ট্রি রিয়েল-টাইমে অনলাইনে স্বয়ংক্রিয়ভাবে শিটে জমা হবে!</p>
          </div>

          {/* Script preview snippet */}
          <div className="relative">
            <pre className="p-3 bg-slate-900 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-36">
              {googleAppsScriptCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
