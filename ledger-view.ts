import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type PixelLedgerPlugin from "./main";
import { ConfirmDeleteModal } from "./ledger-modal";
import {
  CHANGE_EVENT,
  EntryType,
  LedgerEntry,
  WEEKDAYS,
  byTimeAsc,
  fmtDate,
  parseDate,
  todayStr,
  totalsOf,
  pad,
} from "./store";
import { fmtMoney, moneyClass, renderEntryList, renderGroupedEntryList, renderQuickForm, renderSummaryStrip, GroupExpandState } from "./shared";

export const VIEW_TYPE = "pixel-ledger-view";

export class LedgerView extends ItemView {
  plugin: PixelLedgerPlugin;
  /** 当前展示的月份（任意日期，取当月） */
  private cursor: Date = new Date();
  /** 选中的日期 YYYY-MM-DD */
  private selected: string = todayStr();
  /** 分组折叠状态（切换日期时重置，删除记录后保持） */
  private expandState: GroupExpandState = { expense: false, income: false };
  private lastSelected: string = "";
  private changeRef: () => void = () => {};

  constructor(leaf: WorkspaceLeaf, plugin: PixelLedgerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "像素账本";
  }

  getIcon(): string {
    return "calculator";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("pl-view");
    this.changeRef = () => this.render();
    this.registerEvent(this.app.workspace.on(CHANGE_EVENT as unknown as "quit", this.changeRef));
    this.render();
  }

  private monthOf(): { year: number; month: number } {
    return { year: this.cursor.getFullYear(), month: this.cursor.getMonth() };
  }

  private setMonth(year: number, month: number): void {
    this.cursor = new Date(year, month, 1);
    this.render();
  }

  private render(): void {
    const root = this.contentEl;
    root.empty();

    this.renderHeader(root);
    this.renderStrip(root);

    const calWrap = root.createDiv({ cls: "pl-cal-wrap" });
    this.renderCalendar(calWrap);

    const detailWrap = root.createDiv({ cls: "pl-detail-wrap" });
    this.renderDayDetail(detailWrap);

    const formWrap = root.createDiv({ cls: "pl-form-wrap" });
    formWrap.createDiv({ cls: "pl-form-caption" }).setText("快速记账");
    renderQuickForm(formWrap, {
      presets: this.plugin.data.presets,
      onSave: (r) => {
        this.plugin.addEntry({ ...r, date: this.selected });
      },
    });
  }

  private renderHeader(root: HTMLElement): void {
    const { year, month } = this.monthOf();
    const head = root.createDiv({ cls: "pl-header" });

    const title = head.createDiv({ cls: "pl-header-title" });
    title.createSpan({ cls: "pl-title-icon" }).setText("¥");
    title.createSpan({ cls: "pl-num" }).setText(`${year}.${pad(month + 1)}`);

    const nav = head.createDiv({ cls: "pl-header-nav" });
    const prev = nav.createEl("button", { cls: "pl-nav-btn" });
    setIcon(prev, "chevron-left");
    prev.addEventListener("click", () => {
      const m = month - 1;
      this.setMonth(m < 0 ? year - 1 : year, m < 0 ? 11 : m);
    });

    const today = nav.createEl("button", { cls: "pl-nav-today", text: "今天" });
    today.addEventListener("click", () => {
      const t = new Date();
      this.cursor = new Date(t.getFullYear(), t.getMonth(), 1);
      this.selected = todayStr();
      this.render();
    });

    const next = nav.createEl("button", { cls: "pl-nav-btn" });
    setIcon(next, "chevron-right");
    next.addEventListener("click", () => {
      const m = month + 1;
      this.setMonth(m > 11 ? year + 1 : year, m > 11 ? 0 : m);
    });
  }

  private renderStrip(root: HTMLElement): void {
    const { year, month } = this.monthOf();
    const prefix = `${year}-${pad(month + 1)}`;
    const monthEntries = this.plugin.data.entries.filter((e) => e.date.startsWith(prefix));
    const t = totalsOf(monthEntries);
    // 关键修复：先建独立容器再渲染，renderSummaryStrip 会 empty 掉传入节点，
    // 之前直接传视图根节点导致头部被清空、视图根被错误加上 pl-strip 类（列换行遮住下方板块）
    const strip = root.createDiv({ cls: "pl-strip" });
    renderSummaryStrip(strip, t.income, t.expense);
  }

  private renderCalendar(root: HTMLElement): void {
    const { year, month } = this.monthOf();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
    const offset = (firstDow + 6) % 7; // Monday start
    const today = todayStr();

    const byDate = new Map<string, LedgerEntry[]>();
    const prefix = `${year}-${pad(month + 1)}`;
    for (const e of this.plugin.data.entries) {
      if (!e.date.startsWith(prefix)) continue;
      if (!byDate.has(e.date)) byDate.set(e.date, []);
      byDate.get(e.date)!.push(e);
    }

    const grid = root.createDiv({ cls: "pl-cal" });
    for (const wd of WEEKDAYS) {
      grid.createDiv({ cls: "pl-wd" + (wd === "六" || wd === "日" ? " pl-wd-weekend" : ""), text: wd });
    }

    const cells: HTMLElement[] = [];
    for (let i = 0; i < offset; i++) {
      const empty = grid.createDiv({ cls: "pl-day pl-day-empty" });
      cells.push(empty);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
      const cell = grid.createDiv({ cls: "pl-day" });
      const entries = byDate.get(ds) ?? [];
      const t = totalsOf(entries);

      const num = cell.createDiv({ cls: "pl-day-num pl-num" });
      num.setText(String(d));

      if (entries.length) {
        const net = cell.createDiv({ cls: "pl-day-net pl-num " + moneyClass(t.net) });
        net.setText(t.net > 0 ? "+" + Math.round(t.net * 100) / 100 : String(Math.round(t.net * 100) / 100));
        const sub = cell.createDiv({ cls: "pl-day-sub " + moneyClass(t.net) });
        sub.setText(t.net > 0 ? "收" : t.net < 0 ? "支" : "平");
      }

      if (ds === today) cell.addClass("is-today");
      if (ds === this.selected) cell.addClass("is-selected");
      if (t.net > 0) cell.addClass("has-pos");
      else if (t.net < 0) cell.addClass("has-neg");
      cell.addEventListener("click", () => {
        this.selected = ds;
        this.render();
      });
      cells.push(cell);
    }
    // 补齐最后一行
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        grid.createDiv({ cls: "pl-day pl-day-empty" });
      }
    }
  }

  private renderDayDetail(root: HTMLElement): void {
    const parsed = parseDate(this.selected);
    const label = parsed ? `${parsed.getMonth() + 1}月${parsed.getDate()}日` : this.selected;
    const title = root.createDiv({ cls: "pl-detail-title" });
    title.createSpan({ text: label + " 收支明细" });
    const isToday = this.selected === todayStr();
    if (isToday) title.createSpan({ cls: "pl-badge", text: "今天" });

    const entries = this.plugin.data.entries
      .filter((e) => e.date === this.selected)
      .sort(byTimeAsc);
    const t = totalsOf(entries);

    const strip = root.createDiv({ cls: "pl-detail-total" });
    strip.createSpan({ cls: "pl-num " + moneyClass(t.income - t.expense), text: fmtMoney(t.income - t.expense) });
    strip.createSpan({ cls: "pl-detail-total-label", text: ` 支出${fmtMoney(-t.expense)} / 收入${fmtMoney(t.income)}` });

    // 切换日期时重置折叠状态；同一天内（含删除）保持展开状态
    if (this.lastSelected !== this.selected) {
      this.expandState = { expense: false, income: false };
      this.lastSelected = this.selected;
    }

    const list = root.createDiv({ cls: "pl-detail-list" });
    renderGroupedEntryList(list, entries, {
      expandState: this.expandState,
      onDelete: (entry) =>
        new ConfirmDeleteModal(this.plugin, entry, () => this.plugin.removeEntry(entry.id)).open(),
    });
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }
}
