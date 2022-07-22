// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  name: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`https://c.api.weibo.com/2/search/statuses/limited.json?${new URLSearchParams(req.query as any)}`)
  const json = await fetch(`https://c.api.weibo.com/2/search/statuses/limited.json?${new URLSearchParams(req.query as any)}`)
  res.status(200).json(await json.json())
}
