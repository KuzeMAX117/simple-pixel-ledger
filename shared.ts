import { LedgerEntry, Presets } from "./store";
import { ComboBox } from "./combo";

/** 金额格式化：¥1,234.50；负数带 - 号 */
export function fmtMoney(n: number): string {
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? "-" : "") + "¥" + s;
}

/** 带方向符号：收入 +¥xx，支出 -¥xx */
export function fmtSigned(e: LedgerEntry): string {
  return e.type === "income" ? "+" + fmtMoney(e.amount) : "-" + fmtMoney(e.amount);
}

export function moneyClass(n: number): string {
  if (n > 0) return "pl-pos";
  if (n < 0) return "pl-neg";
  return "pl-zero";
}

export interface QuickFormResult {
  type: "income" | "expense";
  category: string;
  detail: string;
  amount: number;
  note: string;
}

export interface QuickFormOptions {
  presets: Presets;
  defaultType?: "income" | "expense";
  onSave: (r: QuickFormResult) => void;
}

/**
 * 渲染「快速记账」表单：
 * 类型切换（支出/收入）+ 分类下拉 + 明细下拉 + 金额输入 + 常用金额快捷按钮 + 备注 + 保存。
 * 分类/明细是组合框：点击弹出下拉（预设项可点选），也可直接输入新内容；
 * 分类下拉会随「支出/收入」切换对应分类列表。
 */
export function renderQuickForm(root: HTMLElement, opts: QuickFormOptions): void {
  root.empty();
  root.addClass("pl-form");

  const { presets } = opts;
  let type: "income" | "expense" = opts.defaultType ?? "expense";

  const typeRow = root.createDiv({ cls: "pl-row" });
  const typeBtnWrap = typeRow.createDiv({ cls: "pl-seg" });
  const btnExpense = typeBtnWrap.createEl("button", { text: "支出", cls: "pl-seg-btn is-on" });
  const btnIncome = typeBtnWrap.createEl("button", { text: "收入", cls: "pl-seg-btn" });
  btnExpense.addEventListener("click", () => {
    type = "expense";
    btnExpense.addClass("is-on");
    btnIncome.removeClass("is-on");
    catCombo.setOptions(presets.expenseCategories);
  });
  btnIncome.addEventListener("click", () => {
    type = "income";
    btnIncome.addClass("is-on");
    btnExpense.removeClass("is-on");
    catCombo.setOptions(presets.incomeCategories);
  });

  const catCombo = new ComboBox(typeRow, {
    placeholder: "分类",
    options: type === "expense" ? presets.expenseCategories : presets.incomeCategories,
  });

  const detailRow = root.createDiv({ cls: "pl-row" });
  const detailCombo = new ComboBox(detailRow, {
    placeholder: "明细",
    options: presets.details,
  });

  const amountRow = root.createDiv({ cls: "pl-row" });
  const amountInput = amountRow.createEl("input", {
    type: "number",
    cls: "pl-input pl-amount",
    placeholder: "金额",
  });
  amountInput.min = "0";
  amountInput.step = "0.01";

  const chipWrap = amountRow.createDiv({ cls: "pl-chips" });
  for (const v of presets.amounts) {
    const chip = chipWrap.createEl("button", { text: v, cls: "pl-chip" });
    chip.addEventListener("click", () => {
      amountInput.value = v;
    });
  }

  const noteRow = root.createDiv({ cls: "pl-row" });
  const noteInput = noteRow.createEl("input", {
    type: "text",
    cls: "pl-input pl-note",
    placeholder: "描述（可选）",
  });

  const saveRow = root.createDiv({ cls: "pl-row pl-save-row" });
  const saveBtn = saveRow.createEl("button", { text: "记一笔", cls: "pl-btn pl-btn-primary" });
  saveBtn.addEventListener("click", () => {
    const amount = parseFloat(amountInput.value);
    if (!isFinite(amount) || amount <= 0) {
      amountInput.addClass("pl-input-err");
      setTimeout(() => amountInput.removeClass("pl-input-err"), 1200);
      return;
    }
    amountInput.removeClass("pl-input-err");
    const category = catCombo.getValue().trim() || "其他";
    const detail = detailCombo.getValue().trim();
    opts.onSave({ type, category, detail, amount, note: noteInput.value.trim() });
    amountInput.value = "";
    noteInput.value = "";
    catCombo.setValue("");
    detailCombo.setValue("");
  });
}

export interface EntryListOptions {
  showDate?: boolean;
  /** 回调传入完整条目，调用方自行决定是否二次确认 */
  onDelete?: (entry: LedgerEntry) => void;
}

/** 渲染条目列表：+/- 金额（红绿）+ 分类 · 明细 + 备注 + 删除按钮 */
export function renderEntryList(root: HTMLElement, entries: LedgerEntry[], opts: EntryListOptions = {}): void {
  root.empty();
  root.addClass("pl-entries");
  if (!entries.length) {
    root.createDiv({ cls: "pl-empty", text: "还没有记录，先记一笔吧～" });
    return;
  }
  for (const e of entries) {
    const row = root.createDiv({ cls: "pl-entry " + (e.type === "income" ? "pl-entry-income" : "pl-entry-expense") });

    const sign = row.createDiv({ cls: "pl-entry-sign " + (e.type === "income" ? "pl-pos" : "pl-neg") });
    sign.addClass("pl-num");
    sign.setText(fmtSigned(e));

    const main = row.createDiv({ cls: "pl-entry-main" });
    main.createDiv({ cls: "pl-entry-title" }).setText(
      [e.category, e.detail].filter(Boolean).join(" · ") || "未分类"
    );
    if (e.note) main.createDiv({ cls: "pl-entry-note" }).setText(e.note);
    if (opts.showDate) main.createDiv({ cls: "pl-entry-date" }).setText(e.date);

    if (opts.onDelete) {
      const del = row.createEl("button", { cls: "pl-del", attr: { "aria-label": "删除" } });
      del.setText("×");
      del.addEventListener("click", () => opts.onDelete!(e));
    }
  }
}

/** 渲染汇总条：支出（红）/ 收入（绿）/ 结余 */
export function renderSummaryStrip(root: HTMLElement, income: number, expense: number): void {
  root.empty();
  root.addClass("pl-strip");

  const block = (label: string, value: number, cls: string) => {
    const b = root.createDiv({ cls: "pl-stat " + cls });
    b.createDiv({ cls: "pl-stat-label" }).setText(label);
    b.createDiv({ cls: "pl-stat-value pl-num" }).setText(fmtMoney(value));
  };
  block("支出", -expense, "pl-neg");
  block("收入", income, "pl-pos");
  block("结余", income - expense, moneyClass(income - expense));
}

/** 渲染面板标题（含日期） */
export function renderPanelTitle(root: HTMLElement, text: string): void {
  root.empty();
  root.addClass("pl-title");
  root.setText(text);
}
