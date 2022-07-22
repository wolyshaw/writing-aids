import { CSSProperties } from 'react'
import EventEmitter from 'eventemitter3'
import {
  getFocusElement,
  insertBlock,
  createBlock,
  setFocusPosition,
} from '../helpers'

export enum EditorEvent {
  SelectionChange = 'SelectionChange',
}

export type SelectStatus =
  | 'strong'
  | 'italic'
  | 'through'
  | 'color'
  | 'background'
  | 'code'
  | 'underline'

export type Styles = {
  [key in SelectStatus]: CSSProperties
}

export const styles: Styles = {
  strong: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  through: {
    textDecoration: 'line-through',
  },
  color: {},
  background: {},
  underline: {
    textDecoration: 'underline',
  },
  code: {},
}

export type Span = {
  index: number
  ele: HTMLSpanElement | Node
  selectStatus: Set<SelectStatus>
}

export type BlockMap = {
  spans: Span[]
}

export class Editor {
  static instance: Editor
  static getInstance(el: HTMLElement): Editor {
    if (!Editor.instance) {
      Editor.instance = new Editor(el)
    }
    return Editor.instance
  }

  static EditorEvent = EditorEvent

  events = new EventEmitter()

  el: HTMLElement

  blocks: Map<HTMLElement, BlockMap> = new Map()

  rangeToolBarElement = document.createElement('div')

  private rangeRect?: DOMRect

  set RangeRect(val: DOMRect | undefined) {
    this.rangeRect = val
    this.events.emit(EditorEvent.SelectionChange, val)
  }

  get RangeRect() {
    return this.rangeRect
  }

  constructor(el: HTMLElement) {
    this.el = el
    document.body.append(this.rangeToolBarElement)
  }

  useEvents() {
    this.el.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') {
        evt.preventDefault()
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        // if (range?.commonAncestorContainer.nodeType === 3) {
        //   console.log(range)
        //   return
        // }
        if (
          range?.startOffset === range?.endOffset &&
          range?.startOffset === 0
        ) {
          this.insertBlock(selection?.focusNode, 'beforebegin')
        } else {
          this.insertBlock(selection?.focusNode)
        }
      }

      if (evt.key === 'Backspace') {
        const mostRecentElement = evt
          .composedPath()
          .find((el) => (el as HTMLElement).contentEditable) as HTMLElement
        if (!mostRecentElement.textContent) {
          const prevElement = mostRecentElement.previousElementSibling
          this.removeBlock(mostRecentElement)
          this.focusBlock(prevElement)
          evt.preventDefault()
        }
      }
    })

    document.addEventListener('selectionchange', (evt) => {
      const selection = window.getSelection()
      if (selection?.rangeCount) {
        const range = selection?.getRangeAt(0)
        // range?.commonAncestorContainer.nodeType === 3
        const rect = range?.getBoundingClientRect()
        this.RangeRect = rect
        // console.log(rect)
      }
    })
  }

  splitBlock() {}

  removeBlock(el: HTMLElement) {
    this.blocks.delete(el)
    el.remove()
  }

  focusBlock(el: Element | null) {
    const element = (el as HTMLElement) || Array.from(this.blocks.keys()).pop()
    setFocusPosition(element!)
  }

  getFocusElement(el?: HTMLElement | Node | null) {
    return getFocusElement(this.el, el)
  }

  createBlock() {
    return createBlock()
  }

  insertBlock(el?: HTMLElement | Node | null, pos?: InsertPosition) {
    const focusElement = this.getFocusElement(el)
    let block
    if (focusElement === this.el) {
      block = insertBlock(focusElement, 'beforeend')
    } else {
      block = insertBlock(focusElement, pos)
    }
    this.blocks.set(block, {
      spans: [],
    })
    return block
  }

  public getRange() {
    const selection = window.getSelection()
    const range = selection?.getRangeAt(0)
    return range
  }

  public getBlock() {
    const range = this.getRange()
    const contentEditableElement = this.getFocusElement(
      range?.commonAncestorContainer
    )
    return this.blocks.get(contentEditableElement)
  }

  public getSpansIndexOf() {
    const cloneContent = this.getRange()?.cloneContents()
    const block = this.getBlock()
    let spanEl: HTMLSpanElement
    for (const child of Array.from(cloneContent?.childNodes || [])) {
      if (child.nodeName === '#text') {
        spanEl = child.parentElement as HTMLSpanElement
      } else if (child.nodeName === 'SPAN') {
        spanEl = child as HTMLSpanElement
      }
      const indexOf =
        block?.spans.findIndex(
          (item) =>
            (item.ele as HTMLSpanElement).dataset.index ===
            spanEl?.dataset.index
        ) ?? -1
      if (indexOf > -1) {
        return indexOf
      }
    }
    return -1
  }

  public getSpanStatus() {
    const selectStatus = new Set<SelectStatus>([])
    const indexOf = this.getSpansIndexOf()
    const block = this.getBlock()
    if (indexOf > -1 && block?.spans[indexOf].ele.textContent) {
      return block?.spans[indexOf].selectStatus || selectStatus
    }
    return selectStatus
  }

  public clearStyle(el: HTMLElement, name?: SelectStatus | SelectStatus[]) {
    // styles
    const clearNames =
      typeof name === 'object'
        ? name
        : name
        ? [name]
        : (Object.keys(styles) as SelectStatus[])
    for (const n of clearNames) {
      for (const sn of Object.keys(styles[n])) {
        el.style[sn as any] = ''
      }
    }
  }

  public spickBlock(option: { type: SelectStatus }) {
    const hasType = this.getSpanStatus().has(option.type)
    const block = this.getBlock()
    const range = this.getRange()
    const cloneContent = range?.cloneContents()
    range?.deleteContents()
    const fragment = document.createDocumentFragment()
    for (const child of Array.from(cloneContent?.childNodes || [])) {
      const spanels = block?.spans.map((item) => item.ele) || []
      let s: Span | undefined
      if (child.nodeName === '#text' && child?.textContent) {
        const span = document.createElement('span')
        const index = block?.spans.length || 0
        span.dataset.index = '' + index
        span.textContent = child.textContent || ''
        s = {
          index,
          ele: span,
          selectStatus: new Set([option.type]),
        }
        block?.spans.push(s)
        fragment.append(span)
      }
      if (child.nodeName === 'SPAN' && child.textContent) {
        const indexOf = spanels.findIndex(
          (item) =>
            (item as HTMLSpanElement).dataset.index ===
            (child as HTMLSpanElement).dataset.index
        )
        if (indexOf > -1) {
          s = block?.spans[indexOf]
          if (hasType) {
            s?.selectStatus.delete(option.type)
          } else {
            s?.selectStatus.add(option.type)
          }
          if (s) {
            s.ele = child as HTMLSpanElement
          }
        } else {
          const index = block?.spans.length || 0
          s = {
            index,
            ele: child,
            selectStatus: new Set([option.type]),
          }
          block?.spans.push(s)
          ;(child as HTMLSpanElement).dataset.index = '' + index
        }
        fragment.append(child)
      }
    }
    for (const el of block?.spans || []) {
      if (el.ele.nodeName === 'SPAN') {
        this.clearStyle(el.ele as HTMLElement)
        for (const status of el.selectStatus.values()) {
          for (const [k, v] of Object.entries(styles[status])) {
            ;(el.ele as HTMLSpanElement).style[k as any] = v as any
          }
        }
      }
    }
    if (range?.startContainer.parentElement?.nodeName === 'SPAN') {
      for (const child of Array.from(fragment.childNodes || [])) {
        if (child.nodeName === '#text') {
          range?.startContainer.parentElement.insertAdjacentText(
            'afterend',
            child.textContent!
          )
        } else {
          range?.startContainer.parentElement.insertAdjacentElement(
            'afterend',
            child as Element
          )
        }
      }
      range?.startContainer.parentElement.remove()
    } else {
      range?.insertNode(fragment)
    }
  }

  public toolThrough() {
    this.spickBlock({
      type: 'through',
    })
  }

  public toolUnderline() {
    this.spickBlock({
      type: 'underline',
    })
  }

  public toolItalic() {
    this.spickBlock({
      type: 'italic',
    })
  }

  public toolThickening() {
    this.spickBlock({
      type: 'strong',
    })
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
