// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher
const tencentcloud = require('tencentcloud-sdk-nodejs')
import { sendError, sendSuccess } from '../../helpers'

const NlpClient = tencentcloud.nlp.v20190408.Client

// 实例化一个认证对象，入参需要传入腾讯云账户secretId，secretKey,此处还需注意密钥对的保密
// 密钥可前往https://console.cloud.tencent.com/cam/capi网站进行获取
const clientConfig = {
  credential: {
    secretId: 'secretId',
    secretKey: 'secretKey',
  },
  region: 'ap-guangzhou',
  profile: {
    httpProfile: {
      endpoint: 'nlp.tencentcloudapi.com',
    },
  },
}

type Params = {
  Text: string
  Length?: string
}

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  status: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // 实例化要请求产品的client对象,clientProfile是可选的
  const client = new NlpClient(clientConfig)
  const params: Params = JSON.parse(req.body)
  try {
    const data = await client.AutoSummarization(params)
    console.log(data)
    sendSuccess(res, data)
  } catch (error) {
    console.log(error)
    sendError(res)
  }
}
