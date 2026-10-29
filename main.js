/* Pixel Ledger 像素账本 1.0.0 | OFL: Press Start 2P font embedded in styles.css */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  BLOCK_TAG: () => BLOCK_TAG,
  LedgerView: () => LedgerView,
  MarkdownView: () => import_obsidian5.MarkdownView,
  VIEW_TYPE: () => VIEW_TYPE,
  default: () => PixelLedgerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// store.ts
var import_obsidian = require("obsidian");
var DEFAULT_PRESETS = {
  expenseCategories: ["\u9910\u996E", "\u4EA4\u901A", "\u8D2D\u7269", "\u5A31\u4E50", "\u5C45\u4F4F", "\u5B66\u4E60", "\u533B\u7597", "\u4EBA\u60C5", "\u5176\u4ED6"],
  incomeCategories: ["\u5DE5\u8D44", "\u517C\u804C", "\u7406\u8D22", "\u7EA2\u5305", "\u62A5\u9500", "\u751F\u6D3B\u8D39", "\u5176\u4ED6"],
  details: ["\u65E9\u9910", "\u5348\u9910", "\u665A\u9910", "\u5976\u8336", "\u5730\u94C1", "\u6253\u8F66", "\u7F51\u8D2D", "\u623F\u79DF", "\u6C34\u7535", "\u8BDD\u8D39", "\u6E38\u620F", "\u7535\u5F71"],
  amounts: ["5", "10", "20", "50", "100", "200", "500", "1000"]
};
var DEFAULT_DATA = {
  entries: [],
  presets: DEFAULT_PRESETS
};
function pad(n) {
  return n < 10 ? "0" + n : String(n);
}
function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayStr() {
  return fmtDate(new Date());
}
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m)
    return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    return null;
  }
  return d;
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function totalsOf(entries) {
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (e.type === "income")
      income += e.amount;
    else
      expense += e.amount;
  }
  return { income, expense, net: income - expense };
}
function byTimeAsc(a, b) {
  return (a.createdAt || 0) - (b.createdAt || 0);
}
var WEEKDAYS = ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u65E5"];
var CHANGE_EVENT = "pixel-ledger:changed";
function deepMergePresets(p) {
  return {
    expenseCategories: Array.isArray(p == null ? void 0 : p.expenseCategories) ? p.expenseCategories : [...DEFAULT_PRESETS.expenseCategories],
    incomeCategories: Array.isArray(p == null ? void 0 : p.incomeCategories) ? p.incomeCategories : [...DEFAULT_PRESETS.incomeCategories],
    details: Array.isArray(p == null ? void 0 : p.details) ? p.details : [...DEFAULT_PRESETS.details],
    amounts: Array.isArray(p == null ? void 0 : p.amounts) ? p.amounts : [...DEFAULT_PRESETS.amounts]
  };
}

// ledger-block.ts
var import_obsidian3 = require("obsidian");

// ledger-modal.ts
var import_obsidian2 = require("obsidian");

// combo.ts
var openPanels = [];
var docBound = false;
function bindDocListener() {
  if (docBound)
    return;
  docBound = true;
  document.addEventListener("mousedown", (e) => {
    for (const p of [...openPanels]) {
      if (!p.root.contains(e.target))
        p.close();
    }
  });
}
var ComboBox = class {
  constructor(container, o) {
    this.opened = false;
    var _a;
    bindDocListener();
    this.opts = o.options;
    this.onChange = (_a = o.onChange) != null ? _a : () => {
    };
    this.root = container.createDiv({ cls: "pl-cb" });
    this.input = this.root.createEl("input", {
      type: "text",
      cls: "pl-input",
      placeholder: o.placeholder
    });
    if (o.value)
      this.input.value = o.value;
    this.panel = this.root.createDiv({ cls: "pl-cb-panel" });
    this.input.addEventListener("click", () => this.open());
    this.input.addEventListener("focus", () => this.open());
    this.input.addEventListener("input", () => {
      this.onChange(this.input.value);
      this.refreshList();
      this.open();
    });
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Escape")
        this.close();
    });
    this.root.addEventListener("mousedown", (e) => e.stopPropagation());
    this.refreshList();
  }
  /** 切换可用选项（如支出分类 ↔ 收入分类） */
  setOptions(opts) {
    this.opts = opts;
    this.refreshList();
  }
  getValue() {
    return this.input.value;
  }
  setValue(v) {
    this.input.value = v;
    this.onChange(v);
  }
  open() {
    if (this.opened)
      return;
    this.opened = true;
    if (!openPanels.includes(this))
      openPanels.push(this);
    this.panel.addClass("is-open");
    this.refreshList();
  }
  close() {
    if (!this.opened)
      return;
    this.opened = false;
    const idx = openPanels.indexOf(this);
    if (idx >= 0)
      openPanels.splice(idx, 1);
    this.panel.removeClass("is-open");
  }
  destroy() {
    this.close();
    this.root.empty();
  }
  refreshList() {
    this.panel.empty();
    const q = this.input.value.trim().toLowerCase();
    let shown = 0;
    for (const o of this.opts) {
      if (q && !o.toLowerCase().includes(q))
        continue;
      const item = this.panel.createEl("button", {
        cls: "pl-cb-item",
        text: o,
        type: "button"
      });
      item.addEventListener("click", () => {
        this.input.value = o;
        this.onChange(o);
        this.close();
      });
      shown++;
    }
    if (!shown) {
      this.panel.createDiv({ cls: "pl-cb-empty", text: "\u6CA1\u6709\u5339\u914D\u9879\uFF0C\u53EF\u76F4\u63A5\u8F93\u5165\u65B0\u5185\u5BB9" });
    }
  }
};

// shared.ts
function fmtMoney(n) {
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? "-" : "") + "\xA5" + s;
}
function fmtSigned(e) {
  return e.type === "income" ? "+" + fmtMoney(e.amount) : "-" + fmtMoney(e.amount);
}
function moneyClass(n) {
  if (n > 0)
    return "pl-pos";
  if (n < 0)
    return "pl-neg";
  return "pl-zero";
}
function renderQuickForm(root, opts) {
  var _a;
  root.empty();
  root.addClass("pl-form");
  const { presets } = opts;
  let type = (_a = opts.defaultType) != null ? _a : "expense";
  const typeRow = root.createDiv({ cls: "pl-row" });
  const typeBtnWrap = typeRow.createDiv({ cls: "pl-seg" });
  const btnExpense = typeBtnWrap.createEl("button", { text: "\u652F\u51FA", cls: "pl-seg-btn is-on" });
  const btnIncome = typeBtnWrap.createEl("button", { text: "\u6536\u5165", cls: "pl-seg-btn" });
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
    placeholder: "\u5206\u7C7B",
    options: type === "expense" ? presets.expenseCategories : presets.incomeCategories
  });
  const detailRow = root.createDiv({ cls: "pl-row" });
  const detailCombo = new ComboBox(detailRow, {
    placeholder: "\u660E\u7EC6",
    options: presets.details
  });
  const amountRow = root.createDiv({ cls: "pl-row" });
  const amountInput = amountRow.createEl("input", {
    type: "number",
    cls: "pl-input pl-amount",
    placeholder: "\u91D1\u989D"
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
    placeholder: "\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09"
  });
  const saveRow = root.createDiv({ cls: "pl-row pl-save-row" });
  const saveBtn = saveRow.createEl("button", { text: "\u8BB0\u4E00\u7B14", cls: "pl-btn pl-btn-primary" });
  saveBtn.addEventListener("click", () => {
    const amount = parseFloat(amountInput.value);
    if (!isFinite(amount) || amount <= 0) {
      amountInput.addClass("pl-input-err");
      setTimeout(() => amountInput.removeClass("pl-input-err"), 1200);
      return;
    }
    amountInput.removeClass("pl-input-err");
    const category = catCombo.getValue().trim() || "\u5176\u4ED6";
    const detail = detailCombo.getValue().trim();
    opts.onSave({ type, category, detail, amount, note: noteInput.value.trim() });
    amountInput.value = "";
    noteInput.value = "";
    catCombo.setValue("");
    detailCombo.setValue("");
  });
}
function renderEntryList(root, entries, opts = {}) {
  root.empty();
  root.addClass("pl-entries");
  if (!entries.length) {
    root.createDiv({ cls: "pl-empty", text: "\u8FD8\u6CA1\u6709\u8BB0\u5F55\uFF0C\u5148\u8BB0\u4E00\u7B14\u5427\uFF5E" });
    return;
  }
  for (const e of entries) {
    const row = root.createDiv({ cls: "pl-entry " + (e.type === "income" ? "pl-entry-income" : "pl-entry-expense") });
    const sign = row.createDiv({ cls: "pl-entry-sign " + (e.type === "income" ? "pl-pos" : "pl-neg") });
    sign.addClass("pl-num");
    sign.setText(fmtSigned(e));
    const main = row.createDiv({ cls: "pl-entry-main" });
    main.createDiv({ cls: "pl-entry-title" }).setText(
      [e.category, e.detail].filter(Boolean).join(" \xB7 ") || "\u672A\u5206\u7C7B"
    );
    if (e.note)
      main.createDiv({ cls: "pl-entry-note" }).setText(e.note);
    if (opts.showDate)
      main.createDiv({ cls: "pl-entry-date" }).setText(e.date);
    if (opts.onDelete) {
      const del = row.createEl("button", { cls: "pl-del", attr: { "aria-label": "\u5220\u9664" } });
      del.setText("\xD7");
      del.addEventListener("click", () => opts.onDelete(e));
    }
  }
}
function renderGroupedEntryList(root, entries, opts = {}) {
  var _a;
  root.empty();
  root.addClass("pl-groups");
  const state = (_a = opts.expandState) != null ? _a : { expense: false, income: false };
  const expense = entries.filter((e) => e.type === "expense");
  const income = entries.filter((e) => e.type === "income");
  if (!entries.length) {
    root.createDiv({ cls: "pl-empty", text: "\u8FD8\u6CA1\u6709\u8BB0\u5F55\uFF0C\u5148\u8BB0\u4E00\u7B14\u5427\uFF5E" });
    return;
  }
  renderGroup(root, "\u652F\u51FA", expense, state, "expense", opts);
  renderGroup(root, "\u6536\u5165", income, state, "income", opts);
}
function renderGroup(root, label, items, state, key, opts) {
  const group = root.createDiv({ cls: "pl-group" + (state[key] ? " is-open" : "") });
  const header = group.createEl("button", { cls: "pl-group-head", type: "button" });
  header.createSpan({ cls: "pl-group-arrow", text: state[key] ? "\u25BC" : "\u25B6" });
  header.createSpan({ cls: "pl-group-label " + (key === "expense" ? "pl-neg" : "pl-pos"), text: label });
  const t = totalsOf(items);
  const meta = header.createSpan({ cls: "pl-group-meta pl-num" });
  meta.setText(
    `${items.length}\u7B14 \xB7 ${key === "expense" ? "-" : "+"}${fmtMoney(t.income + t.expense)}`
  );
  header.addEventListener("click", () => {
    const open = group.hasClass("is-open");
    group.toggleClass("is-open", !open);
    state[key] = !open;
  });
  const body = group.createDiv({ cls: "pl-group-body" });
  renderEntryList(body, items, opts);
}
function renderSummaryStrip(root, income, expense) {
  root.empty();
  root.addClass("pl-strip");
  const block = (label, value, cls) => {
    const b = root.createDiv({ cls: "pl-stat " + cls });
    b.createDiv({ cls: "pl-stat-label" }).setText(label);
    b.createDiv({ cls: "pl-stat-value pl-num" }).setText(fmtMoney(value));
  };
  block("\u652F\u51FA", -expense, "pl-neg");
  block("\u6536\u5165", income, "pl-pos");
  block("\u7ED3\u4F59", income - expense, moneyClass(income - expense));
}

// ledger-modal.ts
var QuickAddModal = class extends import_obsidian2.Modal {
  constructor(plugin, date) {
    super(plugin.app);
    this.plugin = plugin;
    this.date = date != null ? date : todayStr();
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("pl-modal");
    contentEl.createDiv({ cls: "pl-modal-title" }).setText("\u5FEB\u901F\u8BB0\u4E00\u7B14");
    new import_obsidian2.Setting(contentEl).setName("\u65E5\u671F").setDesc("\u9ED8\u8BA4\u4ECA\u5929\uFF0C\u53EF\u6539\u6210\u8FC7\u53BB\u7684\u65E5\u671F\u7528\u4E8E\u8865\u5F55").addText((t) => {
      t.setValue(this.date);
      t.inputEl.type = "date";
      t.onChange((v) => {
        if (v)
          this.date = v;
      });
    });
    const form = contentEl.createDiv({ cls: "pl-modal-form" });
    renderQuickForm(form, {
      presets: this.plugin.data.presets,
      onSave: (r) => {
        this.plugin.addEntry({ ...r, date: this.date });
        this.close();
      }
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
var ConfirmDeleteModal = class extends import_obsidian2.Modal {
  constructor(plugin, entry, onConfirm) {
    super(plugin.app);
    this.plugin = plugin;
    this.entry = entry;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("pl-modal");
    contentEl.createDiv({ cls: "pl-modal-title" }).setText("\u5220\u9664\u8FD9\u6761\u8BB0\u5F55\uFF1F");
    const e = this.entry;
    const preview = contentEl.createDiv({ cls: "pl-del-preview" });
    const sign = preview.createDiv({
      cls: "pl-del-sign pl-num " + (e.type === "income" ? "pl-pos" : "pl-neg")
    });
    sign.setText(e.type === "income" ? "+" + fmtMoney(e.amount) : "-" + fmtMoney(e.amount));
    const info = preview.createDiv({ cls: "pl-del-info" });
    info.createDiv({ cls: "pl-del-title" }).setText(
      [e.category, e.detail].filter(Boolean).join(" \xB7 ") || "\u672A\u5206\u7C7B"
    );
    if (e.note)
      info.createDiv({ cls: "pl-del-note" }).setText(e.note);
    info.createDiv({ cls: "pl-del-date" }).setText("\u65E5\u671F\uFF1A" + e.date);
    contentEl.createDiv({ cls: "pl-del-tip" }).setText("\u5220\u9664\u540E\u4E0D\u53EF\u6062\u590D\u3002");
    const btnRow = contentEl.createDiv({ cls: "pl-del-btns" });
    const cancel = btnRow.createEl("button", { cls: "pl-btn", text: "\u53D6\u6D88" });
    cancel.addEventListener("click", () => this.close());
    const confirm = btnRow.createEl("button", { cls: "pl-btn pl-btn-danger", text: "\u786E\u8BA4\u5220\u9664" });
    confirm.addEventListener("click", () => {
      this.onConfirm();
      this.close();
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// ledger-block.ts
var BLOCK_TAG = "pixel-ledger";
function registerLedgerBlock(plugin) {
  plugin.registerMarkdownCodeBlockProcessor(BLOCK_TAG, (source, el, ctx) => {
    var _a;
    let date = todayStr();
    const param = /date\s*:\s*(\d{4}-\d{2}-\d{2})/.exec(source);
    if (param && parseDate(param[1])) {
      date = param[1];
    } else {
      const filename = ((_a = ctx.sourcePath.split("/").pop()) != null ? _a : "").replace(/\.md$/i, "");
      const fm = /(\d{4})-(\d{2})-(\d{2})/.exec(filename);
      if (fm && parseDate(fm[0]))
        date = fm[0];
    }
    const renderer = new LedgerBlockRenderer(el, plugin, date);
    ctx.addChild(renderer);
  });
}
var LedgerBlockRenderer = class extends import_obsidian3.MarkdownRenderChild {
  constructor(containerEl, plugin, date) {
    super(containerEl);
    this.expandState = { expense: false, income: false };
    this.changeRef = () => {
    };
    this.plugin = plugin;
    this.date = date;
  }
  onload() {
    this.changeRef = () => this.render();
    this.registerEvent(this.plugin.app.workspace.on(CHANGE_EVENT, this.changeRef));
    this.render();
  }
  render() {
    const root = this.containerEl;
    root.empty();
    root.addClass("pl-block");
    const d = parseDate(this.date);
    const title = root.createDiv({ cls: "pl-title pl-block-title" });
    const label = d ? `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5 \u6536\u652F` : `${this.date} \u6536\u652F`;
    title.createSpan({ text: label });
    const entries = this.plugin.data.entries.filter((e) => e.date === this.date).sort(byTimeAsc);
    const t = totalsOf(entries);
    const strip = root.createDiv({});
    renderSummaryStrip(strip, t.income, t.expense);
    const listWrap = root.createDiv({ cls: "pl-block-list" });
    renderGroupedEntryList(listWrap, entries, {
      expandState: this.expandState,
      onDelete: (entry) => new ConfirmDeleteModal(this.plugin, entry, () => this.plugin.removeEntry(entry.id)).open()
    });
    const formWrap = root.createDiv({ cls: "pl-form-wrap" });
    formWrap.createDiv({ cls: "pl-form-caption" }).setText("\u8BB0\u4E00\u7B14");
    renderQuickForm(formWrap, {
      presets: this.plugin.data.presets,
      onSave: (r) => {
        this.plugin.addEntry({ ...r, date: this.date });
      }
    });
  }
};

// ledger-view.ts
var import_obsidian4 = require("obsidian");
var VIEW_TYPE = "pixel-ledger-view";
var LedgerView = class extends import_obsidian4.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    /** 当前展示的月份（任意日期，取当月） */
    this.cursor = new Date();
    /** 选中的日期 YYYY-MM-DD */
    this.selected = todayStr();
    /** 分组折叠状态（切换日期时重置，删除记录后保持） */
    this.expandState = { expense: false, income: false };
    this.lastSelected = "";
    this.changeRef = () => {
    };
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "\u50CF\u7D20\u8D26\u672C";
  }
  getIcon() {
    return "calculator";
  }
  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("pl-view");
    this.changeRef = () => this.render();
    this.registerEvent(this.app.workspace.on(CHANGE_EVENT, this.changeRef));
    this.render();
  }
  monthOf() {
    return { year: this.cursor.getFullYear(), month: this.cursor.getMonth() };
  }
  setMonth(year, month) {
    this.cursor = new Date(year, month, 1);
    this.render();
  }
  render() {
    const root = this.contentEl;
    root.empty();
    this.renderHeader(root);
    this.renderStrip(root);
    const calWrap = root.createDiv({ cls: "pl-cal-wrap" });
    this.renderCalendar(calWrap);
    const detailWrap = root.createDiv({ cls: "pl-detail-wrap" });
    this.renderDayDetail(detailWrap);
    const formWrap = root.createDiv({ cls: "pl-form-wrap" });
    formWrap.createDiv({ cls: "pl-form-caption" }).setText("\u5FEB\u901F\u8BB0\u8D26");
    renderQuickForm(formWrap, {
      presets: this.plugin.data.presets,
      onSave: (r) => {
        this.plugin.addEntry({ ...r, date: this.selected });
      }
    });
  }
  renderHeader(root) {
    const { year, month } = this.monthOf();
    const head = root.createDiv({ cls: "pl-header" });
    const title = head.createDiv({ cls: "pl-header-title" });
    title.createSpan({ cls: "pl-title-icon" }).setText("\xA5");
    title.createSpan({ cls: "pl-num" }).setText(`${year}.${pad(month + 1)}`);
    const nav = head.createDiv({ cls: "pl-header-nav" });
    const prev = nav.createEl("button", { cls: "pl-nav-btn" });
    (0, import_obsidian4.setIcon)(prev, "chevron-left");
    prev.addEventListener("click", () => {
      const m = month - 1;
      this.setMonth(m < 0 ? year - 1 : year, m < 0 ? 11 : m);
    });
    const today = nav.createEl("button", { cls: "pl-nav-today", text: "\u4ECA\u5929" });
    today.addEventListener("click", () => {
      const t = new Date();
      this.cursor = new Date(t.getFullYear(), t.getMonth(), 1);
      this.selected = todayStr();
      this.render();
    });
    const next = nav.createEl("button", { cls: "pl-nav-btn" });
    (0, import_obsidian4.setIcon)(next, "chevron-right");
    next.addEventListener("click", () => {
      const m = month + 1;
      this.setMonth(m > 11 ? year + 1 : year, m > 11 ? 0 : m);
    });
  }
  renderStrip(root) {
    const { year, month } = this.monthOf();
    const prefix = `${year}-${pad(month + 1)}`;
    const monthEntries = this.plugin.data.entries.filter((e) => e.date.startsWith(prefix));
    const t = totalsOf(monthEntries);
    renderSummaryStrip(root, t.income, t.expense);
  }
  renderCalendar(root) {
    var _a;
    const { year, month } = this.monthOf();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const offset = (firstDow + 6) % 7;
    const today = todayStr();
    const byDate = /* @__PURE__ */ new Map();
    const prefix = `${year}-${pad(month + 1)}`;
    for (const e of this.plugin.data.entries) {
      if (!e.date.startsWith(prefix))
        continue;
      if (!byDate.has(e.date))
        byDate.set(e.date, []);
      byDate.get(e.date).push(e);
    }
    const grid = root.createDiv({ cls: "pl-cal" });
    for (const wd of WEEKDAYS) {
      grid.createDiv({ cls: "pl-wd" + (wd === "\u516D" || wd === "\u65E5" ? " pl-wd-weekend" : ""), text: wd });
    }
    const cells = [];
    for (let i = 0; i < offset; i++) {
      const empty = grid.createDiv({ cls: "pl-day pl-day-empty" });
      cells.push(empty);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
      const cell = grid.createDiv({ cls: "pl-day" });
      const entries = (_a = byDate.get(ds)) != null ? _a : [];
      const t = totalsOf(entries);
      const num = cell.createDiv({ cls: "pl-day-num pl-num" });
      num.setText(String(d));
      if (entries.length) {
        const net = cell.createDiv({ cls: "pl-day-net pl-num " + moneyClass(t.net) });
        net.setText(t.net > 0 ? "+" + Math.round(t.net * 100) / 100 : String(Math.round(t.net * 100) / 100));
        const sub = cell.createDiv({ cls: "pl-day-sub " + moneyClass(t.net) });
        sub.setText(t.net > 0 ? "\u6536" : t.net < 0 ? "\u652F" : "\u5E73");
      }
      if (ds === today)
        cell.addClass("is-today");
      if (ds === this.selected)
        cell.addClass("is-selected");
      if (t.net > 0)
        cell.addClass("has-pos");
      else if (t.net < 0)
        cell.addClass("has-neg");
      cell.addEventListener("click", () => {
        this.selected = ds;
        this.render();
      });
      cells.push(cell);
    }
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        grid.createDiv({ cls: "pl-day pl-day-empty" });
      }
    }
  }
  renderDayDetail(root) {
    const parsed = parseDate(this.selected);
    const label = parsed ? `${parsed.getMonth() + 1}\u6708${parsed.getDate()}\u65E5` : this.selected;
    const title = root.createDiv({ cls: "pl-detail-title" });
    title.createSpan({ text: label + " \u6536\u652F\u660E\u7EC6" });
    const isToday = this.selected === todayStr();
    if (isToday)
      title.createSpan({ cls: "pl-badge", text: "\u4ECA\u5929" });
    const entries = this.plugin.data.entries.filter((e) => e.date === this.selected).sort(byTimeAsc);
    const t = totalsOf(entries);
    const strip = root.createDiv({ cls: "pl-detail-total" });
    strip.createSpan({ cls: "pl-num " + moneyClass(t.income - t.expense), text: fmtMoney(t.income - t.expense) });
    strip.createSpan({ cls: "pl-detail-total-label", text: ` \u652F\u51FA${fmtMoney(-t.expense)} / \u6536\u5165${fmtMoney(t.income)}` });
    if (this.lastSelected !== this.selected) {
      this.expandState = { expense: false, income: false };
      this.lastSelected = this.selected;
    }
    const list = root.createDiv({ cls: "pl-detail-list" });
    renderGroupedEntryList(list, entries, {
      expandState: this.expandState,
      onDelete: (entry) => new ConfirmDeleteModal(this.plugin, entry, () => this.plugin.removeEntry(entry.id)).open()
    });
  }
  async onClose() {
    this.contentEl.empty();
  }
};

// main.ts
var PixelLedgerPlugin = class extends import_obsidian5.Plugin {
  async onload() {
    await this.loadData();
    this.registerView(VIEW_TYPE, (leaf) => new LedgerView(leaf, this));
    this.addRibbonIcon("calculator", "\u6253\u5F00\u50CF\u7D20\u8D26\u672C", () => {
      void this.activateView();
    });
    this.addCommand({
      id: "open-view",
      name: "\u6253\u5F00\u50CF\u7D20\u8D26\u672C\uFF08\u6708\u5386\u8D22\u52A1\u7EDF\u8BA1\u89C6\u56FE\uFF09",
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "insert-block",
      name: "\u5728\u7B14\u8BB0\u4E2D\u63D2\u5165\u4ECA\u65E5\u6536\u652F\u9762\u677F",
      editorCallback: (editor, view) => {
        const block = "```" + BLOCK_TAG + "\n```\n";
        editor.replaceRange(block, editor.getCursor());
        if (view)
          editor.setCursor(editor.getCursor().line + 2);
      }
    });
    this.addCommand({
      id: "quick-add",
      name: "\u5FEB\u901F\u8BB0\u4E00\u7B14\u6536\u652F\uFF08\u5F39\u7A97\uFF09",
      callback: () => new QuickAddModal(this).open()
    });
    this.addSettingTab(new LedgerSettingsTab(this.app, this));
    registerLedgerBlock(this);
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
  async loadData() {
    const raw = await super.loadData();
    this.data = {
      entries: Array.isArray(raw == null ? void 0 : raw.entries) ? raw.entries : [...DEFAULT_DATA.entries],
      presets: deepMergePresets(raw == null ? void 0 : raw.presets)
    };
  }
  /** 保存并触发全局刷新（视图 / 日记面板同步更新） */
  async save() {
    await this.saveData(this.data);
    this.app.workspace.trigger(CHANGE_EVENT);
  }
  addEntry(input) {
    const entry = {
      id: uid(),
      date: input.date,
      type: input.type,
      category: input.category.trim() || "\u5176\u4ED6",
      detail: input.detail.trim(),
      amount: Math.round(input.amount * 100) / 100,
      note: input.note.trim(),
      createdAt: Date.now()
    };
    this.data.entries.push(entry);
    void this.save();
    new import_obsidian5.Notice(
      `\u5DF2\u8BB0\u5F55\uFF1A${entry.type === "income" ? "\u6536\u5165" : "\u652F\u51FA"} \xA5${entry.amount.toFixed(2)}\uFF08${entry.category}\uFF09`
    );
    return entry;
  }
  removeEntry(id) {
    const before = this.data.entries.length;
    this.data.entries = this.data.entries.filter((e) => e.id !== id);
    if (this.data.entries.length !== before)
      void this.save();
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = null;
    const existing = workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length) {
      leaf = existing[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (!leaf)
        leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await workspace.revealLeaf(leaf);
  }
};
var LedgerSettingsTab = class extends import_obsidian5.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "\u50CF\u7D20\u8D26\u672C \xB7 \u5E38\u7528\u9884\u8BBE" });
    containerEl.createEl("p", {
      text: "\u70B9\u300C\uFF0B\u300D\u6DFB\u52A0\u3001\u70B9\u300C\xD7\u300D\u5220\u9664\uFF0C\u6539\u52A8\u7ACB\u5373\u751F\u6548\u5E76\u540C\u6B65\u5237\u65B0\u6240\u6709\u754C\u9762\u3002\u8BB0\u8D26\u65F6\u70B9\u51FB\u5206\u7C7B/\u660E\u7EC6\u4F1A\u5F39\u51FA\u4E0B\u62C9\u6846\uFF0C\u53EF\u76F4\u63A5\u70B9\u9009\uFF0C\u4E5F\u53EF\u8F93\u5165\u65B0\u5185\u5BB9\u3002",
      cls: "setting-item-description"
    });
    this.renderPresetEditor("\u5E38\u7528\u652F\u51FA\u5206\u7C7B", "\u5982\uFF1A\u9910\u996E / \u4EA4\u901A / \u8D2D\u7269 / \u5A31\u4E50", "expenseCategories");
    this.renderPresetEditor("\u5E38\u7528\u6536\u5165\u5206\u7C7B", "\u5982\uFF1A\u5DE5\u8D44 / \u517C\u804C / \u7406\u8D22 / \u7EA2\u5305", "incomeCategories");
    this.renderPresetEditor("\u5E38\u7528\u660E\u7EC6", "\u5982\uFF1A\u65E9\u9910 / \u5730\u94C1 / \u7F51\u8D2D / \u623F\u79DF", "details");
    this.renderPresetEditor(
      "\u5E38\u7528\u91D1\u989D\u5FEB\u6377\u6309\u94AE",
      "\u8BB0\u8D26\u65F6\u4E00\u952E\u586B\u5165\u91D1\u989D\uFF0C\u6BCF\u884C\u4E00\u4E2A\u6570\u5B57",
      "amounts"
    );
    new import_obsidian5.Setting(containerEl).setHeading().setName("\u6570\u636E\u7BA1\u7406");
    new import_obsidian5.Setting(containerEl).setName("\u6062\u590D\u9ED8\u8BA4\u9884\u8BBE").setDesc("\u628A\u4E0A\u9762\u7684\u5206\u7C7B/\u660E\u7EC6/\u91D1\u989D\u6062\u590D\u4E3A\u63D2\u4EF6\u51FA\u5382\u9ED8\u8BA4\u503C").addButton(
      (b) => b.setButtonText("\u6062\u590D\u9ED8\u8BA4").onClick(async () => {
        this.plugin.data.presets = {
          expenseCategories: [...DEFAULT_PRESETS.expenseCategories],
          incomeCategories: [...DEFAULT_PRESETS.incomeCategories],
          details: [...DEFAULT_PRESETS.details],
          amounts: [...DEFAULT_PRESETS.amounts]
        };
        await this.plugin.save();
        new import_obsidian5.Notice("\u5DF2\u6062\u590D\u9ED8\u8BA4\u9884\u8BBE");
        this.display();
      })
    );
    new import_obsidian5.Setting(containerEl).setName("\u6E05\u7A7A\u5168\u90E8\u8BB0\u5F55").setDesc("\u5220\u9664\u6240\u6709\u6536\u652F\u6761\u76EE\uFF08\u4FDD\u7559\u9884\u8BBE\uFF09\uFF0C\u4E0D\u53EF\u6062\u590D").addButton(
      (b) => b.setButtonText("\u6E05\u7A7A").setWarning().onClick(async () => {
        if (window.confirm("\u786E\u5B9A\u6E05\u7A7A\u5168\u90E8\u6536\u652F\u8BB0\u5F55\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002")) {
          this.plugin.data.entries = [];
          await this.plugin.save();
          new import_obsidian5.Notice("\u5DF2\u6E05\u7A7A\u5168\u90E8\u8BB0\u5F55");
        }
      })
    );
  }
  /** 交互式预设编辑器：列表 + 单删 + 添加 + 分组恢复默认 */
  renderPresetEditor(name, desc, key) {
    const { containerEl } = this;
    const group = containerEl.createDiv({ cls: "pl-preset-group" });
    const listEl = group.createDiv({ cls: "pl-preset-list" });
    const renderItems = () => {
      var _a;
      listEl.empty();
      const items = (_a = this.plugin.data.presets[key]) != null ? _a : [];
      if (!items.length) {
        listEl.createDiv({ cls: "pl-preset-empty", text: "\uFF08\u7A7A\uFF09\u70B9\u51FB\u4E0B\u65B9\uFF0B\u6DFB\u52A0" });
      }
      items.forEach((item, idx) => {
        const row = listEl.createDiv({ cls: "pl-preset-item" });
        row.createSpan({ cls: "pl-preset-text", text: String(item) });
        const del = row.createEl("button", {
          cls: "pl-preset-del",
          attr: { "aria-label": "\u5220\u9664 " + item }
        });
        del.setText("\xD7");
        del.addEventListener("click", async () => {
          const arr = [...this.plugin.data.presets[key]];
          arr.splice(idx, 1);
          this.plugin.data.presets[key] = arr;
          await this.plugin.save();
          renderItems();
        });
      });
    };
    new import_obsidian5.Setting(containerEl).setName(name).setDesc(desc);
    const addRow = group.createDiv({ cls: "pl-preset-add" });
    const input = addRow.createEl("input", {
      type: "text",
      cls: "pl-preset-input",
      placeholder: key === "amounts" ? "\u5982\uFF1A15 / 300" : "\u8F93\u5165\u65B0\u9879"
    });
    const addBtn = addRow.createEl("button", { cls: "pl-preset-addbtn", text: "\uFF0B \u6DFB\u52A0" });
    const doAdd = async () => {
      const v = input.value.trim();
      if (!v)
        return;
      const arr = [...this.plugin.data.presets[key]];
      if (!arr.includes(v)) {
        arr.push(v);
        this.plugin.data.presets[key] = arr;
        await this.plugin.save();
      }
      input.value = "";
      renderItems();
    };
    addBtn.addEventListener("click", () => void doAdd());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void doAdd();
      }
    });
    new import_obsidian5.Setting(containerEl).addButton(
      (b) => b.setButtonText("\u6062\u590D\u6B64\u9879\u9ED8\u8BA4").onClick(async () => {
        this.plugin.data.presets[key] = [...DEFAULT_PRESETS[key]];
        await this.plugin.save();
        new import_obsidian5.Notice(`\u5DF2\u6062\u590D\u300C${name}\u300D\u9ED8\u8BA4`);
        renderItems();
      })
    );
    renderItems();
  }
};
