import type * as CSS from "csstype";
import EventEmitter from "eventemitter3";
import {
  getFocusElement,
  insertBlock,
  createBlock,
  setFocusPosition,
} from "./helpers";

export enum EditorEvent {
  SelectionChange = "SelectionChange",
}

export type SelectStatus =
  | "strong"
  | "italic"
  | "through"
  | "color"
  | "background"
  | "code"
  | "underline";

export type Styles = {
  [key in SelectStatus]: CSS.Properties;
};

export type SpanElement = HTMLSpanElement | Node;

export const styles: Styles = {
  strong: {
    fontWeight: "bold",
  },
  italic: {
    fontStyle: "italic",
  },
  through: {
    textDecoration: "line-through",
  },
  color: {},
  background: {},
  underline: {
    textDecoration: "underline",
  },
  code: {},
};

export type Span = {
  index: number;
  ele: HTMLSpanElement | Node;
  selectStatus: Set<SelectStatus>;
};

export type BlockType = "General" | "H1" | "H2";

export type BlockMap = {
  spans: Span[];
  rootEl?: HTMLDivElement;
  type: BlockType;
};

export class Editor {
  static instance: Editor;
  static getInstance(el: HTMLElement): Editor {
    if (!Editor.instance) {
      Editor.instance = new Editor(el);
    }
    return Editor.instance;
  }

  static EditorEvent = EditorEvent;

  events = new EventEmitter();

  el: HTMLElement;

  blocks: Map<HTMLElement, BlockMap> = new Map();

  rangeToolBarElement = document.createElement("div");

  activeBlock: BlockMap | undefined;
  activeSpans: Span[] | undefined;

  activeSelection: Selection | undefined | null;
  activeRange: Range | undefined | null;
  activeCloneRange: Range | undefined | null;

  private rangeRect?: DOMRect;

  set RangeRect(val: DOMRect | undefined) {
    this.rangeRect = val;
    this.events.emit(EditorEvent.SelectionChange, val);
  }

  get RangeRect() {
    return this.rangeRect;
  }

  constructor(el: HTMLElement) {
    this.el = el;
    document.body.append(this.rangeToolBarElement);
  }

  useEvents() {
    this.el.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        const range = this.getRange();
        // if (range?.commonAncestorContainer.nodeType === 3) {
        //   console.log(range)
        //   return
        // }
        if (
          range?.startOffset === range?.endOffset &&
          range?.startOffset === 0
        ) {
          this.insertBlock(range?.endContainer, "beforebegin");
        } else {
          this.insertBlock(range?.endContainer);
        }
      }

      if (evt.key === "Backspace") {
        const mostRecentElement = evt
          .composedPath()
          .find((el) => (el as HTMLElement).contentEditable) as HTMLElement;
        if (!mostRecentElement.textContent) {
          if (this.blocks.size === 1) {
            // 最后一个不允许删除，清除所有html元素
            mostRecentElement.innerHTML = "";
            return;
          }
          const prevElement = mostRecentElement.previousElementSibling;
          this.removeBlock(mostRecentElement);
          this.focusBlock(prevElement);
          evt.preventDefault();
        }
      }
    });

    document.addEventListener("selectionchange", (evt) => {
      const selection = window.getSelection();
      if (selection?.rangeCount) {
        const range = selection?.getRangeAt(0);
        if (range) {
          this.activeSelection = selection;
          this.activeRange = range;
          this.activeCloneRange = range.cloneRange();
        }
        // range?.commonAncestorContainer.nodeType === 3
        const rect = range?.getBoundingClientRect();
        this.RangeRect = rect;
        // console.log(rect)
        return;
      }
      this.activeSelection = null;
      this.activeRange = null;
      this.activeCloneRange = null;

      this.RangeRect = undefined;
    });
  }

  splitBlock() {}

  removeBlock(el: HTMLElement) {
    this.blocks.delete(el);
    el.remove();
  }

  focusBlock(el: Element | null) {
    const element = (el as HTMLElement) || Array.from(this.blocks.keys()).pop();
    setFocusPosition(element!);
  }

  getFocusElement(el?: SpanElement | null) {
    return getFocusElement(this.el, el);
  }

  createBlock() {
    return createBlock();
  }

  insertBlock(el?: SpanElement | null, pos?: InsertPosition) {
    const focusElement = this.getFocusElement(el);
    let block;
    if (focusElement === this.el) {
      block = insertBlock(focusElement, "beforeend");
    } else {
      block = insertBlock(focusElement, pos);
    }
    this.blocks.set(block, {
      spans: [],
      rootEl: block,
      type: "General",
    });
    return block;
  }

  public getRange() {
    return this.activeRange;
  }

  public getBlock() {
    const range = this.activeRange;
    let el: HTMLDivElement;
    const ele: HTMLElement | null | undefined =
      range?.commonAncestorContainer.nodeName === "#text"
        ? range?.commonAncestorContainer.parentElement
        : (range?.commonAncestorContainer as HTMLElement);
    if (!ele?.contentEditable || ele?.contentEditable !== "true") {
      el =
        ele?.closest('div[contentEditable="true"]') || (ele as HTMLDivElement);
    } else {
      el = ele as HTMLDivElement;
    }
    return this.blocks.get(el);
  }

  public getSpansIndexOf() {
    const cloneContent = this.getRange()?.cloneContents();
    const block = this.getBlock();
    let spanEl: HTMLSpanElement;
    for (const child of Array.from(cloneContent?.childNodes || [])) {
      if (child.nodeName === "#text") {
        spanEl = child.parentElement as HTMLSpanElement;
      } else if (child.nodeName === "SPAN") {
        spanEl = child as HTMLSpanElement;
      }
      const indexOf =
        block?.spans.findIndex(
          (item) =>
            (item.ele as HTMLSpanElement).dataset.index ===
            spanEl?.dataset.index
        ) ?? -1;
      if (indexOf > -1) {
        return indexOf;
      }
    }
    return -1;
  }

  /**
   * 通过循环的方式获取当前选中的SpanELement状态
   */
  public getSpanStatus() {
    const selectStatus = new Set<SelectStatus>([]);
    const indexOf = this.getSpansIndexOf();
    const block = this.getBlock();
    if (indexOf > -1 && block?.spans[indexOf].ele.textContent) {
      return block?.spans[indexOf].selectStatus || selectStatus;
    }
    return selectStatus;
  }

  public clearStyle(el: HTMLElement, name?: SelectStatus | SelectStatus[]) {
    // styles
    const clearNames =
      typeof name === "object"
        ? name
        : name
        ? [name]
        : (Object.keys(styles) as SelectStatus[]);
    for (const n of clearNames) {
      for (const sn of Object.keys(styles[n])) {
        el.style[sn as any] = "";
      }
    }
  }

  getLeftElement(
    childs: never[] | NodeListOf<ChildNode>,
    el?: HTMLSpanElement | Node
  ): ChildNode[] {
    if (!el) return [];
    let spanElement: HTMLSpanElement;
    if (el.nodeName === "#text") {
      spanElement = el.parentElement as HTMLSpanElement;
    }
    spanElement = el as HTMLSpanElement;
    const eles: ChildNode[] = [];
    const prev = spanElement.previousSibling;
    for (const child of childs) {
      if (child.textContent) {
        eles.push(child as ChildNode);
      }
      if (prev === child) {
        break;
      }
    }
    return eles;
  }

  eqStatus(a: Set<SelectStatus>, b: Set<SelectStatus>) {
    return Array.from(a).join(",") === Array.from(b).join(",");
  }

  getSpanOrRootNode(el: SpanElement) {
    if (el.nodeName === "SPAN") {
      return el;
    }
    if (el.nodeName === "#text" && el.parentElement?.nodeName === "SPAN") {
      return el.parentElement;
    }
    return el;
  }

  /**
   * 根据光标信息，拆分当前块的元素
   * @returns [leftElement, rightElement]
   */
  getAssociationElement() {
    const range = this.getRange();
    const block = this.getBlock();
    /** clone DOM 避免被修改 */
    const cloneStart = range?.startContainer.cloneNode(true) as SpanElement;
    const cloneStartParentElement =
      range?.startContainer.parentElement?.cloneNode(true) as SpanElement;
    const cloneEnd = range?.endContainer.cloneNode(true) as SpanElement;
    const cloneEndParentElement = range?.endContainer.parentElement?.cloneNode(
      true
    ) as SpanElement;

    let startElement: SpanElement;
    if (
      cloneStart.nodeName === "SPAN" ||
      cloneStartParentElement.nodeName === "SPAN"
    ) {
      startElement =
        cloneStart.nodeName === "SPAN"
          ? (cloneStart! as HTMLSpanElement)
          : (cloneStartParentElement! as HTMLSpanElement);
      startElement.textContent =
        cloneStart.textContent?.substring(0, range!.startOffset) || "";
    } else {
      startElement = document.createTextNode(
        cloneStart.textContent?.substring(0, range!.startOffset) || ""
      );
    }
    let endElement: SpanElement;
    if (
      cloneEnd.nodeName === "SPAN" ||
      cloneEndParentElement?.nodeName === "SPAN"
    ) {
      endElement =
        cloneEnd.nodeName === "SPAN"
          ? (cloneEnd! as HTMLSpanElement)
          : (cloneEndParentElement! as HTMLSpanElement);
      endElement.textContent =
        cloneEnd.textContent?.substring(range!.endOffset) || "";
    } else {
      endElement = document.createTextNode(
        cloneEnd.textContent?.substring(range!.endOffset) || ""
      );
    }
    const leftEle: Array<SpanElement> = [];
    const activeEle: Array<SpanElement> = [];
    const rightEle: Array<SpanElement> = [];
    let currentPos: "left" | "active" | "right" = "left";
    for (const child of block?.rootEl?.childNodes || []) {
      const isInRange = range?.intersectsNode(child);
      if (currentPos === "active" && !isInRange) {
        currentPos = "right";
      }
      if (currentPos === "left" && isInRange) {
        currentPos = "active";
      }
      if (currentPos === "left") {
        leftEle.push(child);
      }
      if (currentPos === "active") {
        activeEle.push(child);
      }
      if (currentPos === "right") {
        rightEle.push(child);
      }
    }
    range?.deleteContents();
    leftEle.push(startElement);
    rightEle.unshift(endElement);
    return [leftEle, rightEle];
  }

  setSpanElement(eles: (Node | HTMLElement)[], spans: Span[]) {
    for (let i = 0; i < eles.length; i++) {
      let ele: SpanElement = eles[i] as HTMLSpanElement;
      const prevEle = eles[i - 1] as HTMLSpanElement;
      if (!ele || !ele.textContent) {
        continue;
      }

      ele = this.getSpanOrRootNode(ele);
      const findSpan = this.getSelectStattus(ele as HTMLSpanElement);
      let selectStatus: Set<SelectStatus> = new Set([]);
      if (findSpan) {
        selectStatus = findSpan.selectStatus;
      }

      if (prevEle && prevEle.nodeName === "#text" && ele.nodeName === "#text") {
        prevEle.textContent = (prevEle?.textContent || "") + ele?.textContent;
        continue;
      }
      spans.push({
        ele: ele,
        index: 0,
        selectStatus,
      });
    }
  }

  getSelectStattus(el: SpanElement) {
    const spans = this.activeSpans || [];

    for (const span of spans) {
      if (
        (span.ele as HTMLSpanElement).dataset?.index ===
        (el as HTMLSpanElement).dataset?.index
      ) {
        return span;
      }
    }
  }

  public spickBlock(option: { type: SelectStatus }) {
    const range = this.getRange();
    const block = this.getBlock();
    const cloneContent =
      range?.commonAncestorContainer.nodeName === "SPAN"
        ? range?.commonAncestorContainer
        : range?.cloneContents();
    const [leftEle, rightEle] = this.getAssociationElement();
    console.log(
      cloneContent,
      leftEle,
      rightEle,
      range === this.activeRange,
      range?.commonAncestorContainer.cloneNode(true)
    );
    if (block?.rootEl) {
      block.rootEl.innerHTML = "";
      this.activeSpans = [...block.spans];
      block.spans = [];
    }
    this.setSpanElement(leftEle, block?.spans || []);
    let prevSelectStatus: Set<SelectStatus> | undefined;
    let prevElement: HTMLSpanElement | undefined;
    let selectedElements: Array<HTMLSpanElement | Node> = [];
    for (let i = 0; i < (cloneContent?.childNodes || []).length; i++) {
      let selectStatus: Set<SelectStatus> = new Set([option.type]);
      let ele: SpanElement = cloneContent?.childNodes[i] as HTMLSpanElement;
      if (!ele) {
        continue;
      }
      ele = this.getSpanOrRootNode(ele);
      const findSpan = this.getSelectStattus(ele as HTMLSpanElement);
      if (findSpan) {
        selectStatus = new Set([...findSpan.selectStatus, ...selectStatus]);
      }
      if (ele.nodeName === "#text") {
        const span = document.createElement("span");
        span.textContent = ele.textContent;
        ele = span;
      }
      if (
        prevElement &&
        prevSelectStatus &&
        this.eqStatus(selectStatus, prevSelectStatus)
      ) {
        prevElement.textContent =
          (prevElement.textContent || "") + ele.textContent;
        continue;
      }

      prevSelectStatus = selectStatus;
      prevElement = ele as HTMLSpanElement;
      console.log(ele);
      selectedElements.push(ele);
      block?.spans.push({
        ele,
        index: 0,
        selectStatus,
      });
    }
    this.setSpanElement(rightEle, block?.spans || []);
    let spanIndex = 0;
    for (const span of block?.spans || []) {
      let spanEl: HTMLSpanElement | Node;
      if (span.ele.nodeName === "#text") {
        spanEl = span.ele;
      } else {
        spanEl = span.ele as HTMLSpanElement;
        (spanEl as HTMLSpanElement).dataset.index = "" + spanIndex;
        spanIndex++;
        for (const status of span.selectStatus.values()) {
          for (const [k, v] of Object.entries(styles[status])) {
            (spanEl as HTMLSpanElement).style[k as any] = v as any;
          }
        }
      }

      this.activeSpans = undefined;
      block?.rootEl?.append(spanEl);
    }
    this.activeSelection?.removeAllRanges();
    if (selectedElements.length) {
      const selectedElementsLength = selectedElements.length;
      const firstChild =
        selectedElements[0].nodeName === "#text"
          ? selectedElements[0]
          : selectedElements[0].firstChild!;
      const lastChild =
        selectedElements[selectedElementsLength - 1].nodeName === "#text"
          ? selectedElements[selectedElementsLength - 1]
          : selectedElements[selectedElementsLength - 1].lastChild!;
      this.activeSelection?.setBaseAndExtent(
        firstChild,
        0,
        lastChild,
        lastChild.textContent?.length || 1
      );
    }
    // this.activeSelection?.selectAllChildren(selectedElements[0])
    // if (this.activeSelection?.rangeCount) {
    //   this.activeRange = this.activeSelection.getRangeAt(0)
    //   this.activeCloneRange = this.activeRange.cloneRange()
    // }
    // block?.spans.push()
  }

  /**
   * 操作block所有操作均在当前block中，避免大范围修改
   */
  public spickBlock2(option: { type: SelectStatus }) {
    const hasType = this.getSpanStatus().has(option.type);
    const block = this.getBlock();
    const range = this.getRange();
    const cloneContent = range?.cloneContents();
    range?.deleteContents();
    const fragment = document.createDocumentFragment();
    /**
     * 将选中的所有Node与Element循环，进行拆分，并且将拆分后的child转化成SpanElement放入一个片段中，后续一次性插入到选中前并删除选中内容
     */
    for (const child of Array.from(cloneContent?.childNodes || [])) {
      const spanels = block?.spans.map((item) => item.ele) || [];
      let s: Span | undefined;
      /**
       * 有内容的Node替换为SpanElement，并且添加需要的操作
       */
      if (!child.textContent) {
        child.remove();
        continue;
      }
      if (child.nodeName === "#text" && child?.textContent) {
        const span = document.createElement("span");
        console.log(block?.spans.length);
        const index = block?.spans.length || 0;
        span.dataset.index = "" + index;
        span.textContent = child.textContent || "";
        s = {
          index,
          ele: span,
          selectStatus: new Set([option.type]),
        };
        block?.spans.push(s);
        fragment.append(span);
      }
      /**
       * 有内容的SpanElement 添加或者删除多余的选择操作
       */
      if (child.nodeName === "SPAN" && child.textContent) {
        const indexOf = spanels.findIndex(
          (item) =>
            (item as HTMLSpanElement).dataset.index ===
            (child as HTMLSpanElement).dataset.index
        );
        if (indexOf > -1) {
          s = block?.spans[indexOf];
          if (hasType) {
            s?.selectStatus.delete(option.type);
          } else {
            s?.selectStatus.add(option.type);
          }
          if (s) {
            s.ele = child as HTMLSpanElement;
          }
        } else {
          console.log(block?.spans.length);
          const index = block?.spans.length || 0;
          s = {
            index,
            ele: child,
            selectStatus: new Set([option.type]),
          };
          block?.spans.push(s);
          (child as HTMLSpanElement).dataset.index = "" + index;
        }
        fragment.append(child);
      }
    }
    /**
     * 更新样式，通过先删除后添加的方式更新
     */
    for (const el of block?.spans || []) {
      if (el.ele.nodeName === "SPAN") {
        this.clearStyle(el.ele as HTMLElement);
        for (const status of el.selectStatus.values()) {
          for (const [k, v] of Object.entries(styles[status])) {
            (el.ele as HTMLSpanElement).style[k as any] = v as any;
          }
        }
      }
    }
    /**
     * 选择插入节点的位置
     */
    if (range?.startContainer.parentElement?.nodeName === "SPAN") {
      for (const child of Array.from(fragment.childNodes || [])) {
        if (child.nodeName === "#text") {
          range?.startContainer.parentElement.insertAdjacentText(
            "afterend",
            child.textContent!
          );
        } else {
          range?.startContainer.parentElement.insertAdjacentElement(
            "afterend",
            child as Element
          );
        }
      }
      // range?.startContainer.parentElement.remove()
    } else {
      range?.insertNode(fragment);
    }
  }

  changeBlockType(type: BlockType) {
    const block = this.getBlock();
    if (block) {
      block.type = type;
    }
    if (type === "H1" && block?.rootEl) {
      block.rootEl.style.fontSize = "3em";
      block.rootEl.style.fontWeight = "bold";
    }
  }

  public toolHeader() {
    this.changeBlockType("H1");
  }

  public toolThrough() {
    this.spickBlock({
      type: "through",
    });
  }

  public toolUnderline() {
    this.spickBlock({
      type: "underline",
    });
  }

  public toolItalic() {
    this.spickBlock({
      type: "italic",
    });
  }

  public toolThickening() {
    this.spickBlock({
      type: "strong",
    });
    // if (range?.commonAncestorContainer === contentEditableElement || range?.commonAncestorContainer.nodeType === 3) {
    //   const span = document.createElement('span')
    //   span.textContent = cloneContent?.textContent || ''
    //   range?.insertNode(span)
    // } else {
    //   range?.collapse()
    // }
    // range?.deleteContents()
    // range?.surroundContents(span)
    // console.log()
  }
}
