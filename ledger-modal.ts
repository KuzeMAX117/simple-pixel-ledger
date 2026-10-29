import { Modal, Setting } from "obsidian";
import type PixelLedgerPlugin from "./main";
import { todayStr } from "./store";
import { renderQuickForm } from "./shared";

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
