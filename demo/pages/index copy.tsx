import type { NextPage } from 'next'
import Head from 'next/head'
import { useState, createRef, FormEvent, useEffect } from 'react'
import classnames from 'classnames'
import { useKey } from 'react-use'
import { NLPTypes } from '../types'

const operation = {
  AutoSummarization: {
    color: '',
    title: '文本摘要',
    id: '',
  },
  KeywordsExtraction: {
    color: '',
    title: '关键词提取',
    id: '',
  },
  SentimentAnalysis: {
    color: '',
    title: '情感分析',
    id: '',
  },
  TextClassification: {
    color: '',
    title: '文本分类',
    id: '',
  },
  TextCorrectionPro: {
    color: '',
    title: '文本纠错',
    id: '',
  },
  TextSimilarityPro: {
    color: '',
    title: '文本相似度',
    id: '',
  },
  SimilarWords: {
    color: '',
    title: '文本相似度',
    id: '',
  },
}

const Home: NextPage = (props) => {
  const editor = createRef<HTMLDivElement>()
  const [textarea, setTextarea] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [keyword, setKeyword] = useState('')
  const [weibos, setWeibos] = useState<Text[]>([])
  const [type, setType] = useState<keyof typeof NLPTypes>('AutoSummarization')

  const formattedParagraph = async () => {
    if (editor.current) {
      const texts = Array.from(editor.current.childNodes).map(
        (el) => el.textContent
      )
      const res = await FetchSummar(texts.join(''), type)
      console.log(res)
    }
  }

  const FetchSummar = async (text: string, type: keyof typeof NLPTypes) => {
    try {
      const res = await fetch('/api/nlp', {
        method: 'POST',
        body: JSON.stringify({
          Type: NLPTypes[type as keyof typeof NLPTypes],
          Text: text,
        }),
      })
      return await res.json()
    } catch (error) {
      return {}
    }
  }

  const FetchWeibo = async (evt: FormEvent) => {
    evt.stopPropagation()
    evt.preventDefault()
    try {
      const res = await fetch(
        `/api/weibo?access_token=token&q=${keyword}&hasv=1&count=50&hasori=1`
      )
      const json = await res.json()
      const list: Text[] = []
      if (editor.current) {
        editor.current.innerHTML = ''
      }
      for (const item of json.statuses) {
        const span = document.createElement('span')
        const content =
          (item as any).longText?.longTextContent || (item as any).text
        const text = document.createTextNode(content)
        const br = document.createElement('br')
        list.push(text)
        span.append(text)
        editor.current?.append(span)
        editor.current?.append(br)
        // console.log(await FetchSummar(content, 'KeywordsExtraction'))
        span.addEventListener('mouseenter', async (evt) => {
          if (
            (evt.target as HTMLSpanElement).classList.contains('bg-sky-300')
          ) {
            return
          }
          const selection = document.getSelection()
          const range = new Range()
          range.setStart(evt.target as HTMLSpanElement, 0)
          range.setEnd(evt.target as HTMLSpanElement, 1)

          // selection?.removeAllRanges()
          // selection?.addRange(range)

          // setRect(range.getBoundingClientRect())
          // console.log(evt);
          // (evt.target as HTMLSpanElement).classList.add('bg-sky-300')
        })
        span.addEventListener('mouseleave', async (evt) => {
          // console.log(evt);
          // (evt.target as HTMLSpanElement).classList.remove('bg-sky-300')
        })
        span.addEventListener('click', async (evt) => {
          // (evt.target as HTMLSpanElement).classList.add('bg-sky-300')
          // console.log(await FetchSummar(content, type))
        })
      }
    } catch (error) {}
  }

  const selectionChange = async (evt: Event) => {
    // console.log(evt, window.getSelection())
    const selection = document.getSelection()
    const range = selection?.getRangeAt(0)
    setRect(range?.getBoundingClientRect() || null)
    // console.log(selection, range?.getBoundingClientRect())
  }

  useEffect(() => {
    // document.addEventListener('selectionchange', selectionChange)
    // return () => document.removeEventListener('selectionchange', selectionChange)
  })

  useKey(undefined, (evt) => console.log(evt))

  return (
    <div className="container mx-auto">
      <Head>
        <title>写作工具集</title>
        <meta name="description" content="创作小工具集" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <form onSubmit={FetchWeibo}>
        <input
          placeholder="微博热点"
          value={keyword}
          onInput={(evt) => setKeyword((evt.target as HTMLInputElement).value)}
        />
        <input type="submit" value="搜索" />
      </form>

      <ul
        className="menu-container"
        onChange={(evt) =>
          setType(
            (evt.target as HTMLInputElement).value as keyof typeof NLPTypes
          )
        }
      >
        {Object.keys(operation).map((key) => {
          const k = key as keyof typeof operation
          const id = operation[k].id || k
          return (
            <li className="menu-li" key={k}>
              <input
                className="sr-only peer"
                type="radio"
                checked={type === id}
                value={id}
                name="NLP"
                id={'NLP' + id}
              />
              <label className="menu-item" htmlFor={'NLP' + id}>
                {operation[k].title}
              </label>
            </li>
          )
        })}
      </ul>

      <main className="relative">
        <div
          ref={editor}
          contentEditable
          className="textarea text-justify"
          // onChange={(evt) => setTextarea(evt.target.value)}
          dangerouslySetInnerHTML={{ __html: textarea }}
        ></div>
        {rect && (
          <menu
            className={classnames('absolute', { hidden: !rect })}
            style={{ left: rect.x, top: rect.top }}
          >
            <button>相关热点</button>
          </menu>
        )}
        <button onClick={formattedParagraph}>立即提取</button>
      </main>
    </div>
  )
}

export default Home
