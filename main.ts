import {
  App,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
} from "obsidian";
import {
  CHANGE_EVENT,
  DEFAULT_DATA,
  DEFAULT_PRESETS,
  EntryType,
  LedgerData,
  LedgerEntry,
  Presets,
  deepMergePresets,
  uid,
} from "./store";
import { registerLedgerBlock, BLOCK_TAG } from "./ledger-block";
import { LedgerView, VIEW_TYPE } from "./ledger-view";
import { QuickAddModal } from "./ledger-modal";

export default class PixelLedgerPlugin extends Plugin {
  data: LedgerData;

  async onload(): Promise<void> {
    await this.loadData();

    // 独立财务统计视图（类似 TODO 侧边栏，可固定到右侧）
    this.registerView(VIEW_TYPE, (leaf) => new LedgerView(leaf, this));

    this.addRibbonIcon("calculator", "打开像素账本", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-view",
      name: "打开像素账本（月历财务统计视图）",
      callback: () => void this.activateView(),
    });

    this.addCommand({
      id: "insert-block",
      name: "在笔记中插入今日收支面板",
      editorCallback: (editor, view) => {
        const block = "```" + BLOCK_TAG + "\n```\n";
        editor.replaceRange(block, editor.getCursor());
        if (view) editor.setCursor(editor.getCursor().line + 2);
      },
    });

    this.addCommand({
      id: "quick-add",
      name: "快速记一笔收支（弹窗）",
      callback: () => new QuickAddModal(this).open(),
    });

    this.addSettingTab(new LedgerSettingsTab(this.app, this));

    // 日记代码块渲染
    registerLedgerBlock(this);
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async loadData(): Promise<void> {
    const raw = (await super.loadData()) as Partial<LedgerData> | null;
    this.data = {
      entries: Array.isArray(raw?.entries) ? raw!.entries : [...DEFAULT_DATA.entries],
      presets: deepMergePresets(raw?.presets),
    };
  }

  /** 保存并触发全局刷新（视图 / 日记面板同步更新） */
  async save(): Promise<void> {
    await this.saveData(this.data);
    this.app.workspace.trigger(CHANGE_EVENT);
  }

  addEntry(input: {
    date: string;
    type: EntryType;
    category: string;
    detail: string;
    amount: number;
    note: string;
  }): LedgerEntry {
    const entry: LedgerEntry = {
      id: uid(),
      date: input.date,
      type: input.type,
      category: input.category.trim() || "其他",
      detail: input.detail.trim(),
      amount: Math.round(input.amount * 100) / 100,
      note: input.note.trim(),
      createdAt: Date.now(),
    };
    this.data.entries.push(entry);
    void this.save();
    new Notice(
      `已记录：${entry.type === "income" ? "收入" : "支出"} ¥${entry.amount.toFixed(2)}（${entry.category}）`
    );
    return entry;
  }

  removeEntry(id: string): void {
    const before = this.data.entries.length;
    this.data.entries = this.data.entries.filter((e) => e.id !== id);
    if (this.data.entries.length !== before) void this.save();
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const existing = workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length) {
      leaf = existing[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await workspace.revealLeaf(leaf);
  }
}

class LedgerSettingsTab extends PluginSettingTab {
  private plugin: PixelLedgerPlugin;

  constructor(app: App, plugin: PixelLedgerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "像素账本 · 常用预设" });
    containerEl.createEl("p", {
      text: "点「＋」添加、点「×」删除，改动立即生效并同步刷新所有界面。记账时点击分类/明细会弹出下拉框，可直接点选，也可输入新内容。",
      cls: "setting-item-description",
    });

    this.renderPresetEditor("常用支出分类", "如：餐饮 / 交通 / 购物 / 娱乐", "expenseCategories");
    this.renderPresetEditor("常用收入分类", "如：工资 / 兼职 / 理财 / 红包", "incomeCategories");
    this.renderPresetEditor("常用明细", "如：早餐 / 地铁 / 网购 / 房租", "details");
    this.renderPresetEditor(
      "常用金额快捷按钮",
      "记账时一键填入金额，每行一个数字",
      "amounts"
    );

    new Setting(containerEl).setHeading().setName("数据管理");
    new Setting(containerEl)
      .setName("恢复默认预设")
      .setDesc("把上面的分类/明细/金额恢复为插件出厂默认值")
      .addButton((b) =>
        b.setButtonText("恢复默认").onClick(async () => {
          this.plugin.data.presets = {
            expenseCategories: [...DEFAULT_PRESETS.expenseCategories],
            incomeCategories: [...DEFAULT_PRESETS.incomeCategories],
            details: [...DEFAULT_PRESETS.details],
            amounts: [...DEFAULT_PRESETS.amounts],
          };
          await this.plugin.save();
          new Notice("已恢复默认预设");
          this.display();
        })
      );
    new Setting(containerEl)
      .setName("清空全部记录")
      .setDesc("删除所有收支条目（保留预设），不可恢复")
      .addButton((b) =>
        b.setButtonText("清空").setWarning().onClick(async () => {
          if (window.confirm("确定清空全部收支记录？此操作不可恢复。")) {
            this.plugin.data.entries = [];
            await this.plugin.save();
            new Notice("已清空全部记录");
          }
        })
      );
  }

  /** 交互式预设编辑器：列表 + 单删 + 添加 + 分组恢复默认 */
  private renderPresetEditor(name: string, desc: string, key: keyof Presets): void {
    const { containerEl } = this;
    const group = containerEl.createDiv({ cls: "pl-preset-group" });

    const listEl = group.createDiv({ cls: "pl-preset-list" });
    const renderItems = () => {
      listEl.empty();
      const items = this.plugin.data.presets[key] ?? [];
      if (!items.length) {
        listEl.createDiv({ cls: "pl-preset-empty", text: "（空）点击下方＋添加" });
      }
      items.forEach((item, idx) => {
        const row = listEl.createDiv({ cls: "pl-preset-item" });
        row.createSpan({ cls: "pl-preset-text", text: String(item) });
        const del = row.createEl("button", {
          cls: "pl-preset-del",
          attr: { "aria-label": "删除 " + item },
        });
        del.setText("×");
        del.addEventListener("click", async () => {
          const arr = [...this.plugin.data.presets[key]!];
          arr.splice(idx, 1);
          this.plugin.data.presets[key] = arr;
          await this.plugin.save();
          renderItems();
        });
      });
    };

    new Setting(containerEl).setName(name).setDesc(desc);

    const addRow = group.createDiv({ cls: "pl-preset-add" });
    const input = addRow.createEl("input", {
      type: "text",
      cls: "pl-preset-input",
      placeholder: key === "amounts" ? "如：15 / 300" : "输入新项",
    });
    const addBtn = addRow.createEl("button", { cls: "pl-preset-addbtn", text: "＋ 添加" });
    const doAdd = async () => {
      const v = input.value.trim();
      if (!v) return;
      const arr = [...this.plugin.data.presets[key]!];
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

    new Setting(containerEl).addButton((b) =>
      b.setButtonText("恢复此项默认").onClick(async () => {
        this.plugin.data.presets[key] = [...(DEFAULT_PRESETS[key] as string[])];
        await this.plugin.save();
        new Notice(`已恢复「${name}」默认`);
        renderItems();
      })
    );

    renderItems();
  }
}

export { MarkdownView, LedgerView, VIEW_TYPE, BLOCK_TAG };
