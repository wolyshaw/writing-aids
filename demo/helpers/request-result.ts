import { NextApiResponse } from 'next'

export const sendError = (res: NextApiResponse, data = {}) => {
  res.status(500).json({
    status: 500,
    statusText: 'error',
    data,
  })
}

export const sendSuccess = (res: NextApiResponse, data = {}) => {
    res.status(200).json({
      status: 200,
      statusText: 'success',
      data,
    })
  }