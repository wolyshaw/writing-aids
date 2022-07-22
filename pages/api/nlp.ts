const tencentcloud = require('tencentcloud-sdk-nodejs')
import type { NextApiRequest, NextApiResponse } from 'next'
import { sendError, sendSuccess } from '../../helpers'
import { NLPTypes } from '../../types'

const NlpClient = tencentcloud.nlp.v20190408.Client

const clientConfig = {
  credential: {
    secretId: 'AKIDzoSs31nOlwud6KJ5dw0oNhrmSt40kGXa',
    secretKey: 'rWyCAtNegU3NSHrBF4e192f3C5kALHyQ',
  },
  region: 'ap-guangzhou',
  profile: {
    httpProfile: {
      endpoint: 'nlp.tencentcloudapi.com',
    },
  },
}

type Params = {
  Type: NLPTypes
  Text: string
  Length?: string
}

type Data = {
  status: string
}

const getNLPResult = async (params: Params) => {
  const client = new NlpClient(clientConfig)
  const { Type, ...Rest } = params
  switch (params.Type) {
    case NLPTypes.AutoSummarization:
      return client.AutoSummarization(Rest)
    case NLPTypes.KeywordsExtraction:
      return client.KeywordsExtraction(Rest)
    case NLPTypes.SentimentAnalysis:
      return client.SentimentAnalysis(Rest)
    case NLPTypes.SimilarWords:
      return client.SimilarWords(Rest)
    case NLPTypes.TextClassification:
      return client.TextClassification(Rest)
    case NLPTypes.TextCorrectionPro:
      return client.TextCorrectionPro(Rest)
    case NLPTypes.TextSimilarityPro:
      return client.TextSimilarityPro(Rest)
    default:
      throw '请填写正确的类型'
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const params: Params = JSON.parse(req.body)
  try {
    const data = await getNLPResult(params)
    console.log(data)
    sendSuccess(res, data)
  } catch (error) {
    console.log(error)
    sendError(res, { message: error })
  }
}
