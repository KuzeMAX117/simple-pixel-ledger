import { MarkdownRenderChild } from "obsidian";
import type PixelLedgerPlugin from "./main";
import { ConfirmDeleteModal } from "./ledger-modal";
import { CHANGE_EVENT, byTimeAsc, parseDate, todayStr, totalsOf } from "./store";
import { renderEntryList, renderQuickForm, renderSummaryStrip } from "./shared";

export const BLOCK_TAG = "pixel-ledger";

/** 代码块处理器：在日记/任意笔记中渲染当日收支面板 */
export function registerLedgerBlock(plugin: PixelLedgerPlugin): void {
  plugin.registerMarkdownCodeBlockProcessor(BLOCK_TAG, (source, el, ctx) => {
    // 1. 确定面板日期：优先块内参数 date: YYYY-MM-DD
    //    其次尝试从笔记文件名解析（日记模板通常命名如 2026-10-29.md）
    //    最后回退到今天
    let date = todayStr();
    const param = /date\s*:\s*(\d{4}-\d{2}-\d{2})/.exec(source);
    if (param && parseDate(param[1])) {
      date = param[1];
    } else {
      const filename = (ctx.sourcePath.split("/").pop() ?? "").replace(/\.md$/i, "");
      const fm = /(\d{4})-(\d{2})-(\d{2})/.exec(filename);
      if (fm && parseDate(fm[0])) date = fm[0];
    }

    const renderer = new LedgerBlockRenderer(el, plugin, date);
    ctx.addChild(renderer);
  });
}

class LedgerBlockRenderer extends MarkdownRenderChild {
  private plugin: PixelLedgerPlugin;
  private date: string;
  private changeRef: () => void = () => {};

  constructor(containerEl: HTMLElement, plugin: PixelLedgerPlugin, date: string) {
    super(containerEl);
    this.plugin = plugin;
    this.date = date;
  }

  onload(): void {
    this.changeRef = () => this.render();
    this.registerEvent(this.plugin.app.workspace.on(CHANGE_EVENT as unknown as "quit", this.changeRef));
    this.render();
  }

  private render(): void {
    const root = this.containerEl;
    root.empty();
    root.addClass("pl-block");

    const d = parseDate(this.date);
    const title = root.createDiv({ cls: "pl-title pl-block-title" });
    const label = d
      ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 收支`
      : `${this.date} 收支`;
    title.createSpan({ text: label });

    const entries = this.plugin.data.entries
      .filter((e) => e.date === this.date)
      .sort(byTimeAsc);
    const t = totalsOf(entries);

    const strip = root.createDiv({});
    renderSummaryStrip(strip, t.income, t.expense);

    const listWrap = root.createDiv({ cls: "pl-block-list" });
    renderEntryList(listWrap, entries, {
      onDelete: (entry) =>
        new ConfirmDeleteModal(this.plugin, entry, () => this.plugin.removeEntry(entry.id)).open(),
    });

    const formWrap = root.createDiv({ cls: "pl-form-wrap" });
    formWrap.createDiv({ cls: "pl-form-caption" }).setText("记一笔");
    renderQuickForm(formWrap, {
      presets: this.plugin.data.presets,
      onSave: (r) => {
        this.plugin.addEntry({ ...r, date: this.date });
      },
    });
  }
}
