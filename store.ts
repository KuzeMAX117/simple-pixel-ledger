import { Plugin } from "obsidian";

/** 收支类型：income = 收入（正收入，绿），expense = 支出（负收入，红） */
export type EntryType = "income" | "expense";

export interface LedgerEntry {
  id: string;
  /** 日期 YYYY-MM-DD */
  date: string;
  type: EntryType;
  category: string;
  detail: string;
  /** 金额，正数；方向由 type 决定 */
  amount: number;
  note: string;
  createdAt: number;
}

export interface Presets {
  expenseCategories: string[];
  incomeCategories: string[];
  details: string[];
  /** 常用金额快捷按钮（字符串，允许输入如 "15.5"） */
  amounts: string[];
}

export interface LedgerData {
  entries: LedgerEntry[];
  presets: Presets;
}

export const DEFAULT_PRESETS: Presets = {
  expenseCategories: ["餐饮", "交通", "购物", "娱乐", "居住", "学习", "医疗", "人情", "其他"],
  incomeCategories: ["工资", "兼职", "理财", "红包", "报销", "生活费", "其他"],
  details: ["早餐", "午餐", "晚餐", "奶茶", "地铁", "打车", "网购", "房租", "水电", "话费", "游戏", "电影"],
  amounts: ["5", "10", "20", "50", "100", "200", "500", "1000"],
};

export const DEFAULT_DATA: LedgerData = {
  entries: [],
  presets: DEFAULT_PRESETS,
};

export function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return fmtDate(new Date());
}

/** 解析 YYYY-MM-DD，非法返回 null */
export function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    return null;
  }
  return d;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface DayTotals {
  income: number;
  expense: number;
  /** 结余 = 收入 - 支出 */
  net: number;
}

export function totalsOf(entries: LedgerEntry[]): DayTotals {
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
  }
  return { income, expense, net: income - expense };
}

export function byTimeAsc(a: LedgerEntry, b: LedgerEntry): number {
  return (a.createdAt || 0) - (b.createdAt || 0);
}

export function byTimeDesc(a: LedgerEntry, b: LedgerEntry): number {
  return (b.createdAt || 0) - (a.createdAt || 0);
}

/** 星期表头（周一开头） */
export const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

/** 触发全局刷新事件 */
export const CHANGE_EVENT = "pixel-ledger:changed";

export function deepMergePresets(p: Partial<Presets> | undefined): Presets {
  return {
    expenseCategories: Array.isArray(p?.expenseCategories) ? p!.expenseCategories : [...DEFAULT_PRESETS.expenseCategories],
    incomeCategories: Array.isArray(p?.incomeCategories) ? p!.incomeCategories : [...DEFAULT_PRESETS.incomeCategories],
    details: Array.isArray(p?.details) ? p!.details : [...DEFAULT_PRESETS.details],
    amounts: Array.isArray(p?.amounts) ? p!.amounts : [...DEFAULT_PRESETS.amounts],
  };
}

export { Plugin };
