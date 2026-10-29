/**
 * ComboBox 组合框：点击/聚焦弹出下拉列表（含预设项），可点选，也可直接输入新内容。
 * 输入时会实时过滤列表；没有匹配项时提示可直接输入。
 */

const openPanels: ComboBox[] = [];

// 全局只注册一次：点击任意面板外部时关闭所有打开的列表
let docBound = false;
function bindDocListener(): void {
  if (docBound) return;
  docBound = true;
  document.addEventListener("mousedown", (e) => {
    for (const p of [...openPanels]) {
      if (!p.root.contains(e.target as Node)) p.close();
    }
  });
}

export interface ComboBoxOptions {
  placeholder: string;
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
}

export class ComboBox {
  root: HTMLElement;
  private input: HTMLInputElement;
  private panel: HTMLElement;
  private opts: string[];
  private onChange: (v: string) => void;
  private opened = false;

  constructor(container: HTMLElement, o: ComboBoxOptions) {
    bindDocListener();
    this.opts = o.options;
    this.onChange = o.onChange ?? (() => {});

    this.root = container.createDiv({ cls: "pl-cb" });
    this.input = this.root.createEl("input", {
      type: "text",
      cls: "pl-input",
      placeholder: o.placeholder,
    });
    if (o.value) this.input.value = o.value;

    this.panel = this.root.createDiv({ cls: "pl-cb-panel" });

    this.input.addEventListener("click", () => this.open());
    this.input.addEventListener("focus", () => this.open());
    this.input.addEventListener("input", () => {
      this.onChange(this.input.value);
      this.refreshList();
      this.open();
    });
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });

    // 面板内部的 mousedown 不触发全局关闭
    this.root.addEventListener("mousedown", (e) => e.stopPropagation());

    this.refreshList();
  }

  /** 切换可用选项（如支出分类 ↔ 收入分类） */
  setOptions(opts: string[]): void {
    this.opts = opts;
    this.refreshList();
  }

  getValue(): string {
    return this.input.value;
  }

  setValue(v: string): void {
    this.input.value = v;
    this.onChange(v);
  }

  open(): void {
    if (this.opened) return;
    this.opened = true;
    if (!openPanels.includes(this)) openPanels.push(this);
    this.panel.addClass("is-open");
    this.refreshList();
  }

  close(): void {
    if (!this.opened) return;
    this.opened = false;
    const idx = openPanels.indexOf(this);
    if (idx >= 0) openPanels.splice(idx, 1);
    this.panel.removeClass("is-open");
  }

  destroy(): void {
    this.close();
    this.root.empty();
  }

  private refreshList(): void {
    this.panel.empty();
    const q = this.input.value.trim().toLowerCase();
    let shown = 0;
    for (const o of this.opts) {
      if (q && !o.toLowerCase().includes(q)) continue;
      const item = this.panel.createEl("button", {
        cls: "pl-cb-item",
        text: o,
        type: "button",
      });
      item.addEventListener("click", () => {
        this.input.value = o;
        this.onChange(o);
        this.close();
      });
      shown++;
    }
    if (!shown) {
      this.panel.createDiv({ cls: "pl-cb-empty", text: "没有匹配项，可直接输入新内容" });
    }
  }
}
