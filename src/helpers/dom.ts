const loop = (...args: any[]) => {}

export const useDbclickFn = (clickFn = loop, dbClickFn = loop, ms = 200) => {
  let times = 0
  return (args: any) => {
    times++
    setTimeout(() => {
      if (times === 1) {
        clickFn(args)
      }
      times = 0
    }, ms)
    if (times === 2) {
      dbClickFn(args)
      times = 0
    }
  }
}

let num = 0

export const createBlock = () => {
  const block = document.createElement('div')
  block.classList.add('block')
  block.contentEditable = 'true'
  const text = document.createTextNode('block' + num)
  block.append(text)
  const span = document.createElement('span')
  span.textContent = 'span'
  block.append(span)
  const text2 = document.createTextNode('hahahah' + num)
  block.append(text2)
  block.spellcheck = false
  // block.textContent = 'block' + num
  num++
  return block
}

export const insertBlock = (
  node?: HTMLElement,
  pos: InsertPosition = 'afterend'
) => {
  const block = createBlock()
  node?.insertAdjacentElement(pos, block)
  setFocusPosition(block)
  return block
}

export const getFocusElement = (
  rootEl: HTMLElement,
  el?: HTMLElement | Node | null
): HTMLElement => {
  let focusElement: HTMLElement | null = null
  console.log(el, el?.nodeName, el?.parentElement)
  if (el?.nodeName === '#text' && el.parentElement) {
    focusElement = el.parentElement
  }
  if (
    el?.nodeName === 'SPAN' ||
    (el?.nodeName === 'DIV' &&
      (el as HTMLDivElement).contentEditable === 'true')
  ) {
    focusElement = el as HTMLElement
  }
  // if (focusElement && focusElement.nextElementSibling) {
  //   focusElement = focusElement.nextElementSibling as HTMLElement
  // }
  // if (focusElement?.parentElement === rootEl) {
  //   focusElement = rootEl
  // }
  return focusElement || rootEl
}

export type SetFocusPositionOptions = {
  needSelect?: boolean
}

export const setFocusPosition = (
  el: HTMLElement,
  options?: SetFocusPositionOptions
) => {
  const selection = document.getSelection()
  const range = new Range()
  range.setStart(el, 0)
  range.setEnd(el, 1)
  selection?.removeAllRanges()
  range.collapse(false)
  selection?.addRange(range)
}
