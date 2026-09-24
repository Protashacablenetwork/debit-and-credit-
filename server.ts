import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const STAFF_FILE = path.join(DATA_DIR, 'staff.json');
const SALARY_FILE = path.join(DATA_DIR, 'salaries.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DELETED_IDS_FILE = path.join(DATA_DIR, 'deleted_ids.json');

function readDeletedIds(): { transactions: string[]; staff: string[]; salaries: string[] } {
  try {
    if (fs.existsSync(DELETED_IDS_FILE)) {
      const raw = fs.readFileSync(DELETED_IDS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        staff: Array.isArray(parsed.staff) ? parsed.staff : [],
        salaries: Array.isArray(parsed.salaries) ? parsed.salaries : []
      };
    }
  } catch (err) {
    console.error('Error reading deleted_ids.json:', err);
  }
  return { transactions: [], staff: [], salaries: [] };
}

function addDeletedId(type: 'transactions' | 'staff' | 'salaries', id: string) {
  const data = readDeletedIds();
  if (!data[type].includes(id)) {
    data[type].push(id);
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DELETED_IDS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing deleted_ids.json:', err);
    }
  }
}

interface Staff {
  id: string;
  name: string;
  designation: string;
  phone: string;
  joinDate: string;
  baseSalary: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt?: string;
}

interface SalaryPayment {
  id: string;
  staffId: string;
  staffName: string;
  staffDesignation: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonusOrAllowance: number;
  deductionOrAdvance: number;
  netSalary: number;
  paymentStatus: 'paid' | 'pending';
  paymentDate?: string;
  paymentMethod?: string;
  voucherNumber?: string;
  note?: string;
  transactionId?: string;
  createdAt?: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  note?: string;
  syncedToSheet?: boolean;
  createdAt?: string;
}

interface SheetConfig {
  sheetUrl: string;
  sheetId?: string;
  autoSync: boolean;
  lastSyncTime: string | null;
  syncStatus: 'idle' | 'syncing' | 'connected' | 'error';
  syncMessage?: string;
  companyName: string;
  currencySymbol: string;
}

const defaultTransactions: Transaction[] = [];

// Embedded Google Sheet Apps Script Web App URL
export const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwuQephQg0jvzG67agxTpxnfz9eHsOhm0XGcD5abIPHK2LEwhkeDQX107angHKGASxuXw/exec';

const defaultSheetConfig: SheetConfig = {
  sheetUrl: DEFAULT_SHEET_URL,
  sheetId: '',
  autoSync: true,
  lastSyncTime: null,
  syncStatus: 'connected',
  syncMessage: 'গুগল শিট লাইভ সিঙ্ক সক্রিয় রয়েছে',
  companyName: 'আয়-ব্যয়',
  currencySymbol: '৳'
};

function readTransactions(): Transaction[] {
  try {
    const deletedSet = new Set(readDeletedIds().transactions);
    if (!fs.existsSync(TRANSACTIONS_FILE)) {
      const filteredDefaults = defaultTransactions.filter(t => !deletedSet.has(t.id));
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(filteredDefaults, null, 2), 'utf8');
      return filteredDefaults;
    }
    const raw = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
    const list: Transaction[] = JSON.parse(raw);
    return list.filter(t => t && t.id && !deletedSet.has(t.id));
  } catch (err) {
    console.error('Error reading transactions:', err);
    return defaultTransactions;
  }
}

function writeTransactions(data: Transaction[]): void {
  try {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing transactions:', err);
  }
}

function readConfig(): SheetConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultSheetConfig, null, 2), 'utf8');
      return defaultSheetConfig;
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const config = { ...defaultSheetConfig, ...parsed };
    if (!config.sheetUrl) {
      config.sheetUrl = DEFAULT_SHEET_URL;
      config.syncStatus = 'connected';
    }
    return config;
  } catch (err) {
    console.error('Error reading config:', err);
    return defaultSheetConfig;
  }
}

function writeConfig(cfg: SheetConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing config:', err);
  }
}

const defaultStaff: Staff[] = [];

const defaultSalaries: SalaryPayment[] = [];

function readStaff(): Staff[] {
  try {
    const deletedSet = new Set(readDeletedIds().staff);
    if (!fs.existsSync(STAFF_FILE)) {
      const filtered = defaultStaff.filter(s => !deletedSet.has(s.id));
      fs.writeFileSync(STAFF_FILE, JSON.stringify(filtered, null, 2), 'utf8');
      return filtered;
    }
    const raw = fs.readFileSync(STAFF_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const filtered = defaultStaff.filter(s => !deletedSet.has(s.id));
      fs.writeFileSync(STAFF_FILE, JSON.stringify(filtered, null, 2), 'utf8');
      return filtered;
    }
    return parsed.filter((s: Staff) => s && s.id && !deletedSet.has(s.id));
  } catch (err) {
    console.error('Error reading staff:', err);
    return defaultStaff;
  }
}

function writeStaff(data: Staff[]): void {
  try {
    fs.writeFileSync(STAFF_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing staff:', err);
  }
}

function readSalaries(): SalaryPayment[] {
  try {
    const deletedSet = new Set(readDeletedIds().salaries);
    if (!fs.existsSync(SALARY_FILE)) {
      const filtered = defaultSalaries.filter(s => !deletedSet.has(s.id));
      fs.writeFileSync(SALARY_FILE, JSON.stringify(filtered, null, 2), 'utf8');
      return filtered;
    }
    const raw = fs.readFileSync(SALARY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s: SalaryPayment) => s && s.id && !deletedSet.has(s.id));
  } catch (err) {
    console.error('Error reading salaries:', err);
    return defaultSalaries;
  }
}

function writeSalaries(data: SalaryPayment[]): void {
  try {
    fs.writeFileSync(SALARY_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing salaries:', err);
  }
}

// Helper functions for parsing Bengali numbers and normalizing data from Google Sheets
function parseBengaliNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val)
    .replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString())
    .replace(/[,৳\s]/g, '')
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function normalizeDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  const str = String(val).trim();
  
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // If DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // If YYYY/MM/DD
  const ymd = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // General Date parsing
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

function normalizeType(val: any, category: string = ''): 'income' | 'expense' {
  if (!val) {
    const cat = String(category).toLowerCase();
    if (cat.includes('আয়') || cat.includes('বিল কালেকশন') || cat.includes('income')) return 'income';
    return 'expense';
  }
  const str = String(val).trim().toLowerCase();
  if (
    str === 'আয়' || 
    str === 'আয়' || 
    str === 'income' || 
    str.includes('income') || 
    str.includes('আয়') ||
    str.includes('আয়')
  ) {
    return 'income';
  }
  return 'expense';
}

function parseCsvRows(csvText: string): any[][] {
  const rows: any[][] = [];
  const lines = csvText.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let insideQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

// Global function to pull all fresh transactions directly from Google Sheets
export async function pullFromGoogleSheet(): Promise<{ success: boolean; count: number; message: string }> {
  const config = readConfig();
  const targetUrl = config.sheetUrl || DEFAULT_SHEET_URL;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return { success: false, count: 0, message: 'কোনো গুগল শিট লিংক কনফিগার করা নেই' };
  }

  try {
    let rawTransactions: any[] = [];
    let rawStaff: any[] = [];
    let rawSalaries: any[] = [];

    // CASE 1: Google Spreadsheet public / CSV URL
    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = match ? match[1] : '';
      if (!sheetId) {
        throw new Error('গুগল স্প্রেডশিট আইডি খুঁজে পাওয়া যায়নি');
      }

      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const resp = await fetch(csvUrl, { redirect: 'follow', signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`গুগল শিট থেকে ডাটা আনা যায়নি (${resp.status})`);
      }

      const csvText = await resp.text();
      const rows = parseCsvRows(csvText);

      // Parse CSV rows
      if (rows.length > 1) {
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 3) continue;

          // Check column mapping
          let id = r[0] || `TXN-SHEET-${i}-${Date.now().toString().slice(-4)}`;
          let date = normalizeDate(r[1]);
          let rawType = r[2];
          let description = r[3] || 'গুগল শিট লেনদেন';
          let category = r[4] || 'অন্যান্য';
          
          let incomeAmt = parseBengaliNumber(r[5]);
          let expenseAmt = parseBengaliNumber(r[6]);
          let type: 'income' | 'expense' = 'income';
          let amount = 0;
          let paymentMethod = 'নগদ';
          let note = '';

          if (r.length >= 10 && (incomeAmt > 0 || expenseAmt > 0)) {
            if (incomeAmt > 0) {
              type = 'income';
              amount = incomeAmt;
            } else {
              type = 'expense';
              amount = expenseAmt;
            }
            paymentMethod = r[7] || 'নগদ';
            note = r[8] || '';
          } else {
            type = normalizeType(rawType, category);
            amount = incomeAmt;
            paymentMethod = r[6] || 'নগদ';
            note = r[7] || '';
          }

          if (amount > 0 || description) {
            rawTransactions.push({
              id: String(id),
              date,
              type,
              description: String(description),
              category: String(category),
              amount,
              paymentMethod: String(paymentMethod),
              note: String(note),
              syncedToSheet: true,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    } 
    // CASE 2: Google Apps Script Web App URL
    else {
      const url = new URL(targetUrl);
      url.searchParams.set('action', 'get_all');
      url.searchParams.set('_t', Date.now().toString()); // prevent cache

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url.toString(), {
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Fallback to POST
        const postResp = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'get_all', timestamp: new Date().toISOString() }),
          redirect: 'follow'
        });
        if (postResp.ok) {
          const data: any = await postResp.json();
          if (Array.isArray(data)) rawTransactions = data;
          else if (data && Array.isArray(data.transactions)) rawTransactions = data.transactions;
          if (data && Array.isArray(data.staff)) rawStaff = data.staff;
          if (data && Array.isArray(data.salaries)) rawSalaries = data.salaries;
        } else {
          throw new Error(`সার্ভার রেসপন্স: ${response.statusText}`);
        }
      } else {
        const data: any = await response.json();
        if (Array.isArray(data)) {
          rawTransactions = data;
        } else if (data && Array.isArray(data.transactions)) {
          rawTransactions = data.transactions;
        }
        if (data && Array.isArray(data.staff)) {
          rawStaff = data.staff;
        }
        if (data && Array.isArray(data.salaries)) {
          rawSalaries = data.salaries;
        }
      }
    }

    const deletedIdsData = readDeletedIds();
    const deletedSet = new Set(deletedIdsData.transactions);

    if (rawStaff.length > 0) {
      const deletedStaffSet = new Set(deletedIdsData.staff);
      writeStaff(rawStaff.filter(s => s && s.id && !deletedStaffSet.has(s.id)));
    }
    if (rawSalaries.length > 0) {
      const deletedSalarySet = new Set(deletedIdsData.salaries);
      writeSalaries(rawSalaries.filter(s => s && s.id && !deletedSalarySet.has(s.id)));
    }

    if (Array.isArray(rawTransactions) && rawTransactions.length > 0) {
      const currentList = readTransactions().filter(t => !deletedSet.has(t.id));
      const currentMap = new Map<string, Transaction>();
      currentList.forEach(t => currentMap.set(t.id, t));

      // Standardize and merge transactions
      const normalizedIncoming: Transaction[] = rawTransactions
        .map((t, idx) => {
          const id = t.id ? String(t.id) : `TXN-SHEET-${idx}-${Date.now().toString().slice(-4)}`;
          return {
            id,
            date: normalizeDate(t.date),
            type: normalizeType(t.type, t.category),
            description: String(t.description || 'শিট লেনদেন').trim(),
            category: String(t.category || 'অন্যান্য').trim(),
            amount: (parseBengaliNumber(t.income) > 0) ? parseBengaliNumber(t.income) : parseBengaliNumber(t.expense),
            paymentMethod: String(t.paymentMethod || 'নগদ').trim(),
            note: String(t.note || '').trim(),
            syncedToSheet: true,
            createdAt: t.createdAt || new Date().toISOString()
          };
        })
        .filter(item => !deletedSet.has(item.id));

      // Merge: Map by ID or create merged list
      normalizedIncoming.forEach(item => {
        if (!deletedSet.has(item.id)) {
          currentMap.set(item.id, item);
        }
      });

      const mergedList = Array.from(currentMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      writeTransactions(mergedList);

      config.lastSyncTime = new Date().toISOString();
      config.syncStatus = 'connected';
      config.syncMessage = 'গুগল শিট থেকে ডাটা সফলভাবে সিঙ্ক হয়েছে';
      writeConfig(config);

      return {
        success: true,
        count: mergedList.length,
        message: `${mergedList.length} টি লেনদেন গুগল শিটের সাথে সফলভাবে সিঙ্ক হয়েছে`
      };
    } else {
      config.lastSyncTime = new Date().toISOString();
      config.syncStatus = 'connected';
      config.syncMessage = 'গুগল শিট সক্রিয় রয়েছে';
      writeConfig(config);
      return { success: true, count: 0, message: 'গুগল শিট সক্রিয় রয়েছে' };
    }
  } catch (err: any) {
    console.warn('Google Sheet pull notice:', err.message);
    config.syncStatus = 'error';
    config.syncMessage = `সিঙ্ক নোটিস: ${err.message}`;
    writeConfig(config);
    return { success: false, count: 0, message: err.message };
  }
}

// Background Auto-Sync every 8 seconds to ensure instant loading from Google Sheets
setInterval(() => {
  const cfg = readConfig();
  if (cfg.sheetUrl && cfg.autoSync !== false) {
    pullFromGoogleSheet().catch(() => {});
  }
}, 4000);

// Sync with Google Apps Script Web App / Webhook if configured
async function syncToGoogleSheet(action: 'add' | 'update' | 'delete' | 'bulk_sync' | 'sync_staff' | 'sync_salary', payload: any) {
  const config = readConfig();
  const targetUrl = config.sheetUrl || DEFAULT_SHEET_URL;

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return { synced: false, message: 'কোনো গুগল শিট ওয়েবহুক URL কনফিগার করা নেই' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        ...payload
      }),
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      config.lastSyncTime = new Date().toISOString();
      config.syncStatus = 'connected';
      config.syncMessage = 'গুগল শিটে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে';
      writeConfig(config);
      return { synced: true, message: 'গুগল শিটে সফলভাবে ডাটা সিঙ্ক হয়েছে' };
    } else {
      config.syncStatus = 'error';
      config.syncMessage = `গুগল শিট সার্ভার রেসপন্স কোড: ${response.status}`;
      writeConfig(config);
      return { synced: false, message: `সার্ভার ত্রুটি: ${response.statusText}` };
    }
  } catch (err: any) {
    console.warn('Google Sheets sync notice:', err.message);
    config.syncStatus = 'error';
    config.syncMessage = `সিঙ্ক ব্যর্থ: ${err.message}`;
    writeConfig(config);
    return { synced: false, message: err.message };
  }
}

// ======================== API ROUTES ========================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET all transactions
app.get('/api/transactions', (req, res) => {
  const list = readTransactions();
  res.json(list);
});

// POST new transaction
app.post('/api/transactions', async (req, res) => {
  const { type, description, category, amount, date, paymentMethod, note } = req.body;

  if (!description || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'সঠিক বিবরণ এবং টাকার পরিমাণ দিন' });
  }

  const newTxn: Transaction = {
    id: `TXN-${Date.now()}`,
    type: type === 'expense' ? 'expense' : 'income',
    description: String(description).trim(),
    category: category ? String(category).trim() : 'অন্যান্য',
    amount: Number(amount),
    date: date || new Date().toISOString().split('T')[0],
    paymentMethod: paymentMethod ? String(paymentMethod).trim() : 'নগদ',
    note: note ? String(note).trim() : '',
    syncedToSheet: false,
    createdAt: new Date().toISOString()
  };

  const list = readTransactions();
  list.unshift(newTxn);

  // Sync to Google Sheet if enabled
  const config = readConfig();
  let syncResult: any = { synced: false };
  if (config.autoSync && config.sheetUrl) {
    syncResult = await syncToGoogleSheet('add', { transaction: newTxn });
    if (syncResult.synced) {
      newTxn.syncedToSheet = true;
    }
  }

  writeTransactions(list);
  res.status(201).json({ transaction: newTxn, sync: syncResult });
});

// PUT update transaction
app.put('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { type, description, category, amount, date, paymentMethod, note } = req.body;

  const list = readTransactions();
  const index = list.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'লেনদেন পাওয়া যায়নি' });
  }

  const updated: Transaction = {
    ...list[index],
    type: type || list[index].type,
    description: description !== undefined ? String(description).trim() : list[index].description,
    category: category !== undefined ? String(category).trim() : list[index].category,
    amount: amount !== undefined ? Number(amount) : list[index].amount,
    date: date || list[index].date,
    paymentMethod: paymentMethod !== undefined ? String(paymentMethod).trim() : list[index].paymentMethod,
    note: note !== undefined ? String(note).trim() : list[index].note
  };

  list[index] = updated;

  const config = readConfig();
  let syncResult: any = { synced: false };
  if (config.autoSync && config.sheetUrl) {
    syncResult = await syncToGoogleSheet('update', { transaction: updated });
    if (syncResult.synced) {
      updated.syncedToSheet = true;
    }
  }

  writeTransactions(list);
  res.json({ transaction: updated, sync: syncResult });
});

// DELETE transaction
app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  addDeletedId('transactions', id);
  let list = readTransactions();
  const target = list.find(t => t.id === id);

  if (!target) {
    return res.status(404).json({ error: 'লেনদেন পাওয়া যায়নি' });
  }

  list = list.filter(t => t.id !== id);
  writeTransactions(list);

  const config = readConfig();
  if (config.autoSync && config.sheetUrl) {
    await syncToGoogleSheet('delete', { id });
  }

  res.json({ success: true, message: 'লেনদেন মুছে ফেলা হয়েছে' });
});

// ==================== STAFF ROUTES ====================
app.get('/api/staff', (req, res) => {
  const staff = readStaff();
  res.json(staff);
});

app.post('/api/staff', async (req, res) => {
  const { name, designation, phone, joinDate, baseSalary, status, notes } = req.body;
  if (!name || !designation || !phone) {
    return res.status(400).json({ error: 'নাম, পদবি ও মোবাইল নম্বর আবশ্যক' });
  }

  const staffList = readStaff();
  const newStaff: Staff = {
    id: `STF-${Date.now().toString().slice(-4)}`,
    name: String(name).trim(),
    designation: String(designation).trim(),
    phone: String(phone).trim(),
    joinDate: joinDate || new Date().toISOString().split('T')[0],
    baseSalary: Number(baseSalary) || 0,
    status: status === 'inactive' ? 'inactive' : 'active',
    notes: notes ? String(notes).trim() : '',
    createdAt: new Date().toISOString()
  };

  staffList.push(newStaff);
  writeStaff(staffList);

  // Sync with Google Sheet if configured
  const config = readConfig();
  if (config.autoSync && config.sheetUrl) {
    syncToGoogleSheet('sync_staff', { staff: staffList }).catch(() => {});
  }

  res.status(201).json(newStaff);
});

app.put('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  const staffList = readStaff();
  const index = staffList.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'স্টাফ পাওয়া যায়নি' });
  }

  const updated: Staff = {
    ...staffList[index],
    name: req.body.name !== undefined ? String(req.body.name).trim() : staffList[index].name,
    designation: req.body.designation !== undefined ? String(req.body.designation).trim() : staffList[index].designation,
    phone: req.body.phone !== undefined ? String(req.body.phone).trim() : staffList[index].phone,
    joinDate: req.body.joinDate || staffList[index].joinDate,
    baseSalary: req.body.baseSalary !== undefined ? Number(req.body.baseSalary) : staffList[index].baseSalary,
    status: req.body.status || staffList[index].status,
    notes: req.body.notes !== undefined ? String(req.body.notes).trim() : staffList[index].notes
  };

  staffList[index] = updated;
  writeStaff(staffList);

  const config = readConfig();
  if (config.autoSync && config.sheetUrl) {
    syncToGoogleSheet('sync_staff', { staff: staffList }).catch(() => {});
  }

  res.json(updated);
});

app.delete('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  addDeletedId('staff', id);
  let staffList = readStaff();
  const target = staffList.find(s => s.id === id);
  if (!target) {
    return res.status(404).json({ error: 'স্টাফ পাওয়া যায়নি' });
  }

  staffList = staffList.filter(s => s.id !== id);
  writeStaff(staffList);

  const config = readConfig();
  if (config.autoSync && config.sheetUrl) {
    syncToGoogleSheet('sync_staff', { staff: staffList }).catch(() => {});
  }

  res.json({ success: true, message: 'স্টাফ মুছে ফেলা হয়েছে' });
});

// ==================== SALARY ROUTES ====================
app.get('/api/salaries', (req, res) => {
  const { month } = req.query;
  let salaries = readSalaries();
  if (month && typeof month === 'string') {
    salaries = salaries.filter(s => s.month === month);
  }
  res.json(salaries);
});

app.post('/api/salaries', async (req, res) => {
  const {
    staffId,
    month,
    baseSalary,
    bonusOrAllowance,
    deductionOrAdvance,
    paymentStatus,
    paymentDate,
    paymentMethod,
    voucherNumber,
    note
  } = req.body;

  if (!staffId || !month) {
    return res.status(400).json({ error: 'স্টাফ ও মাস নির্বাচন আবশ্যক' });
  }

  const staffList = readStaff();
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) {
    return res.status(404).json({ error: 'নির্বাচিত স্টাফ পাওয়া যায়নি' });
  }

  const base = Number(baseSalary) >= 0 ? Number(baseSalary) : staff.baseSalary;
  const bonus = Number(bonusOrAllowance) || 0;
  const deduction = Number(deductionOrAdvance) || 0;
  const net = Math.max(0, base + bonus - deduction);

  const salaries = readSalaries();
  const existingIndex = salaries.findIndex(s => s.staffId === staffId && s.month === month);

  const isPaid = paymentStatus === 'paid';
  const payDate = paymentDate || new Date().toISOString().split('T')[0];
  const payMethod = paymentMethod || 'নগদ';
  const voucher = voucherNumber || `VCH-SAL-${Date.now().toString().slice(-4)}`;

  let linkedTxnId = existingIndex !== -1 ? salaries[existingIndex].transactionId : undefined;

  // If marked paid, create or sync expense transaction
  if (isPaid) {
    const transactions = readTransactions();
    const txnDescription = `স্টাফ বেতন: ${staff.name} (${staff.designation})`;
    const txnNote = `${month} মাসের বেতন। মূল: ৳${base}, ভাতা/বোনাস: ৳${bonus}, কর্তন: ৳${deduction}। ভাউচার: ${voucher}`;

    if (linkedTxnId) {
      const txnIdx = transactions.findIndex(t => t.id === linkedTxnId);
      if (txnIdx !== -1) {
        transactions[txnIdx].amount = net;
        transactions[txnIdx].date = payDate;
        transactions[txnIdx].paymentMethod = payMethod;
        transactions[txnIdx].note = txnNote;
        writeTransactions(transactions);
      }
    } else {
      const newTxnId = `TXN-SAL-${Date.now()}`;
      const newTxn: Transaction = {
        id: newTxnId,
        type: 'expense',
        description: txnDescription,
        category: 'স্টাফ বেতন ও টেকনিশিয়ান ভাতা',
        amount: net,
        date: payDate,
        paymentMethod: payMethod,
        note: txnNote,
        syncedToSheet: false,
        createdAt: new Date().toISOString()
      };
      transactions.unshift(newTxn);
      writeTransactions(transactions);
      linkedTxnId = newTxnId;

      const config = readConfig();
      if (config.autoSync && config.sheetUrl) {
        syncToGoogleSheet('add', { transaction: newTxn }).catch(() => {});
      }
    }
  }

  const newSalary: SalaryPayment = {
    id: existingIndex !== -1 ? salaries[existingIndex].id : `SAL-${month.replace('-', '')}-${Date.now().toString().slice(-4)}`,
    staffId: staff.id,
    staffName: staff.name,
    staffDesignation: staff.designation,
    month,
    baseSalary: base,
    bonusOrAllowance: bonus,
    deductionOrAdvance: deduction,
    netSalary: net,
    paymentStatus: isPaid ? 'paid' : 'pending',
    paymentDate: isPaid ? payDate : undefined,
    paymentMethod: isPaid ? payMethod : undefined,
    voucherNumber: isPaid ? voucher : undefined,
    note: note ? String(note).trim() : '',
    transactionId: linkedTxnId,
    createdAt: existingIndex !== -1 ? salaries[existingIndex].createdAt : new Date().toISOString()
  };

  if (existingIndex !== -1) {
    salaries[existingIndex] = newSalary;
  } else {
    salaries.unshift(newSalary);
  }

  writeSalaries(salaries);
  res.status(201).json(newSalary);
});

app.delete('/api/salaries/:id', (req, res) => {
  const { id } = req.params;
  addDeletedId('salaries', id);
  let salaries = readSalaries();
  const target = salaries.find(s => s.id === id);
  if (!target) {
    return res.status(404).json({ error: 'বেতন রেকর্ড পাওয়া যায়নি' });
  }

  if (target.transactionId) {
    addDeletedId('transactions', target.transactionId);
    let transactions = readTransactions();
    transactions = transactions.filter(t => t.id !== target.transactionId);
    writeTransactions(transactions);
  }

  salaries = salaries.filter(s => s.id !== id);
  writeSalaries(salaries);
  res.json({ success: true, message: 'বেতন রেকর্ড মুছে ফেলা হয়েছে' });
});

// GET configuration
app.get('/api/config', (req, res) => {
  const config = readConfig();
  res.json(config);
});

// POST update configuration
app.post('/api/config', async (req, res) => {
  const current = readConfig();
  const updated: SheetConfig = {
    ...current,
    sheetUrl: req.body.sheetUrl !== undefined ? String(req.body.sheetUrl).trim() : current.sheetUrl,
    sheetId: req.body.sheetId !== undefined ? String(req.body.sheetId).trim() : current.sheetId,
    autoSync: req.body.autoSync !== undefined ? Boolean(req.body.autoSync) : current.autoSync,
    companyName: req.body.companyName ? String(req.body.companyName).trim() : current.companyName,
    currencySymbol: req.body.currencySymbol ? String(req.body.currencySymbol).trim() : current.currencySymbol
  };

  writeConfig(updated);
  res.json(updated);
});

// POST force push all data to Google Sheet
app.post('/api/sync/push', async (req, res) => {
  const list = readTransactions();
  const staff = readStaff();
  const salaries = readSalaries();
  const config = readConfig();
  const targetUrl = config.sheetUrl || DEFAULT_SHEET_URL;

  if (!targetUrl) {
    return res.status(400).json({ error: 'গুগল শিট Webhook URL যোগ করা নেই। সেটিংস থেকে URL সেট করুন।' });
  }

  config.syncStatus = 'syncing';
  writeConfig(config);

  const syncResult = await syncToGoogleSheet('bulk_sync', {
    transactions: list,
    staff: staff,
    salaries: salaries,
    companyName: config.companyName
  });

  if (syncResult.synced) {
    // mark all as synced
    list.forEach(t => { t.syncedToSheet = true; });
    writeTransactions(list);
  }

  res.json({
    success: syncResult.synced,
    message: syncResult.message,
    totalRecords: list.length,
    staffRecords: staff.length,
    lastSyncTime: config.lastSyncTime
  });
});

// POST pull data from Google Sheet Webhook / public sheet export
app.post('/api/sync/pull', async (req, res) => {
  try {
    const result = await pullFromGoogleSheet();
    const list = readTransactions();
    const staff = readStaff();
    res.json({
      success: result.success,
      message: result.message,
      count: list.length,
      transactions: list,
      staff
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook for instant notification from Google Apps Script onEdit
app.post('/api/webhook/sheet-update', async (req, res) => {
  try {
    const result = await pullFromGoogleSheet();
    res.json({ success: true, message: 'রিয়েল-টাইম আপডেট সফল হয়েছে', result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CSV Export route
app.get('/api/export/csv', (req, res) => {
  const list = readTransactions();
  const config = readConfig();

  // UTF-8 BOM so Excel opens Bengali text without mojibake
  let csv = '\uFEFF';
  csv += 'আইডি,তারিখ,ধরন,বিবরণ,বিভাগ,টাকার পরিমাণ,পেমেন্ট মাধ্যম,নোট\r\n';

  list.forEach(t => {
    const typeLabel = t.type === 'income' ? 'আয়' : 'ব্যয়';
    const row = [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${typeLabel}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\r\n';
  });

  const filename = `hishab-report-${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// ======================== SERVER & VITE ========================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
