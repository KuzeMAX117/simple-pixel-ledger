import { Modal, Setting } from "obsidian";
import type PixelLedgerPlugin from "./main";
import { LedgerEntry, todayStr } from "./store";
import { fmtMoney, renderQuickForm } from "./shared";

/** 快速记账弹窗：可在任意位置弹出，支持指定日期（补录历史） */
export class QuickAddModal extends Modal {
  private plugin: PixelLedgerPlugin;
  private date: string;

  constructor(plugin: PixelLedgerPlugin, date?: string) {
    super(plugin.app);
    this.plugin = plugin;
    this.date = date ?? todayStr();
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("pl-modal");
    contentEl.createDiv({ cls: "pl-modal-title" }).setText("快速记一笔");

    new Setting(contentEl)
      .setName("日期")
      .setDesc("默认今天，可改成过去的日期用于补录")
      .addText((t) => {
        t.setValue(this.date);
        t.inputEl.type = "date";
        t.onChange((v) => {
          if (v) this.date = v;
        });
      });

    const form = contentEl.createDiv({ cls: "pl-modal-form" });
    renderQuickForm(form, {
      presets: this.plugin.data.presets,
      onSave: (r) => {
        this.plugin.addEntry({ ...r, date: this.date });
        this.close();
      },
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/** 删除二次确认弹窗：显示待删条目信息，确认后才真正删除 */
export class ConfirmDeleteModal extends Modal {
  private plugin: PixelLedgerPlugin;
  private entry: LedgerEntry;
  private onConfirm: () => void;

  constructor(plugin: PixelLedgerPlugin, entry: LedgerEntry, onConfirm: () => void) {
    super(plugin.app);
    this.plugin = plugin;
    this.entry = entry;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("pl-modal");
    contentEl.createDiv({ cls: "pl-modal-title" }).setText("删除这条记录？");

    const e = this.entry;
    const preview = contentEl.createDiv({ cls: "pl-del-preview" });
    const sign = preview.createDiv({
      cls: "pl-del-sign pl-num " + (e.type === "income" ? "pl-pos" : "pl-neg"),
    });
    sign.setText(e.type === "income" ? "+" + fmtMoney(e.amount) : "-" + fmtMoney(e.amount));
    const info = preview.createDiv({ cls: "pl-del-info" });
    info.createDiv({ cls: "pl-del-title" }).setText(
      [e.category, e.detail].filter(Boolean).join(" · ") || "未分类"
    );
    if (e.note) info.createDiv({ cls: "pl-del-note" }).setText(e.note);
    info.createDiv({ cls: "pl-del-date" }).setText("日期：" + e.date);

    contentEl.createDiv({ cls: "pl-del-tip" }).setText("删除后不可恢复。");

    const btnRow = contentEl.createDiv({ cls: "pl-del-btns" });
    const cancel = btnRow.createEl("button", { cls: "pl-btn", text: "取消" });
    cancel.addEventListener("click", () => this.close());

    const confirm = btnRow.createEl("button", { cls: "pl-btn pl-btn-danger", text: "确认删除" });
    confirm.addEventListener("click", () => {
      this.onConfirm();
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
