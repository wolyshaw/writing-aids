import type { NextComponentType, NextPage } from 'next'
import Head from 'next/head'
import { useState, createRef, FormEvent, useEffect, createFactory } from 'react'
import { useKey, useEffectOnce, useEvent } from 'react-use'
import { Editor } from '../editor'

const Home: NextPage = (props) => {
  const editor = createRef<HTMLDivElement>()
  const [rect, setRect] = useState<DOMRect | undefined>()
  const [meditor, setMeditor] = useState<Editor>()

  useEffectOnce(() => {
    const meditor = Editor.getInstance(editor.current!)
    setMeditor(meditor)
    meditor.useEvents()
    console.log(meditor.insertBlock())
    meditor.events.on(Editor.EditorEvent.SelectionChange, () => {
      setRect(meditor.RangeRect)
    })
  })

  return (
    <div className="container mx-auto">
      <Head>
        <title>写作工具集</title>
        <meta name="description" content="创作小工具集" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="relative">
        <div
          ref={editor}
          contentEditable={false}
          className="textarea text-justify"
        ></div>
      </main>
      {rect && (
        <div
          id="toobar"
          className="absolute bg-white rounded shadow"
          style={{
            top: rect.y - rect.height - 40,
            left: rect.x,
          }}
        >
          <button
            className="menu-button"
            onClick={() => meditor?.toolThickening()}
          >
            加粗
          </button>
          <button className="menu-button" onClick={() => meditor?.toolItalic()}>
            斜体
          </button>
          <button
            className="menu-button"
            onClick={() => meditor?.toolUnderline()}
          >
            下划线
          </button>
          <button
            className="menu-button"
            onClick={() => meditor?.toolThrough()}
          >
            删除线
          </button>
        </div>
      )}
    </div>
  )
}

export default Home
