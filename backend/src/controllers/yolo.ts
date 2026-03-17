import { Request, Response } from 'express'
import axios from 'axios'
import FormData from 'form-data'
import { config } from '../config'
import { ResponseUtil } from '../utils/response'

type YoloTask = 'pest' | 'fire'

interface YoloDetectBody {
  task?: YoloTask
  imageBase64?: string
  filename?: string
  conf?: number
  imgsz?: number
}

interface YoloVideoDetectBody {
  task?: YoloTask
  conf?: number | string
  imgsz?: number | string
  iou?: number | string
  augment?: string
}

const SUPPORTED_TASKS: YoloTask[] = ['pest', 'fire']

const normalizeTask = (task?: string): YoloTask | null => {
  if (!task) return null
  return SUPPORTED_TASKS.includes(task as YoloTask) ? (task as YoloTask) : null
}

const normalizeMediaPath = (input?: string | null) => {
  if (!input) return null

  try {
    const url = new URL(input, config.yolo.baseUrl)
    const mediaPath = `${url.pathname}${url.search}`
    return mediaPath.startsWith('/static/') ? mediaPath : null
  } catch {
    return null
  }
}

const toMediaProxyUrl = (input?: string | null) => {
  const mediaPath = normalizeMediaPath(input)
  if (!mediaPath) return input
  return `/api/yolo/media?path=${encodeURIComponent(mediaPath)}`
}

export class YoloController {
  static async detect(req: Request, res: Response) {
    try {
      const body = req.body as YoloDetectBody
      const task = normalizeTask(body.task)

      if (!task) {
        return res.status(400).json(ResponseUtil.badRequest('Invalid YOLO task type. Only pest and fire are supported.'))
      }

      if (!body.imageBase64 || typeof body.imageBase64 !== 'string') {
        return res.status(400).json(ResponseUtil.badRequest('Missing imageBase64 payload.'))
      }

      const detectUrl = new URL(`/api/detect/${task}`, config.yolo.baseUrl).toString()
      const response = await axios.post(
        detectUrl,
        {
          image_base64: body.imageBase64,
          filename: body.filename || 'upload.jpg',
          conf: body.conf,
          imgsz: body.imgsz
        },
        { timeout: config.yolo.timeout }
      )

      const data = response.data || {}
      if (typeof data.result_url === 'string') {
        data.result_url = toMediaProxyUrl(data.result_url)
      }

      return res.json(ResponseUtil.success(data, 'YOLO image detection completed successfully.'))
    } catch (error) {
      const upstreamMessage =
        axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : 'YOLO service request failed.'

      console.error('YOLO detection error:', error)
      return res.status(500).json(ResponseUtil.internalError(upstreamMessage))
    }
  }

  static async detectVideo(req: Request, res: Response) {
    const body = req.body as YoloVideoDetectBody
    const requestWithFile = req as Request & { file?: Express.Multer.File }
    const task = normalizeTask(typeof body.task === 'string' ? body.task : undefined)

    if (!task) {
      return res.status(400).json(ResponseUtil.badRequest('Invalid YOLO task type. Only pest and fire are supported.'))
    }

    if (!requestWithFile.file || !requestWithFile.file.buffer?.length) {
      return res.status(400).json(ResponseUtil.badRequest('Missing video file payload.'))
    }

    try {
      const formData = new FormData()
      const filename = requestWithFile.file.originalname || 'upload.mp4'
      formData.append('task', task)
      formData.append('video', requestWithFile.file.buffer, {
        filename,
        contentType: requestWithFile.file.mimetype || 'application/octet-stream'
      })
      if (body.conf !== undefined && body.conf !== '') formData.append('conf', String(body.conf))
      if (body.imgsz !== undefined && body.imgsz !== '') formData.append('imgsz', String(body.imgsz))
      if (body.iou !== undefined && body.iou !== '') formData.append('iou', String(body.iou))
      if (body.augment !== undefined && body.augment !== '') formData.append('augment', String(body.augment))

      const detectUrl = new URL('/detect_video', config.yolo.baseUrl).toString()
      const response = await axios.post(detectUrl, formData, {
        headers: formData.getHeaders(),
        timeout: Math.max(config.yolo.timeout, 600000),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      })

      const data = response.data || {}
      if (typeof data.result_url === 'string') {
        data.result_url = toMediaProxyUrl(data.result_url)
      }
      if (typeof data.upload_url === 'string') {
        data.upload_url = toMediaProxyUrl(data.upload_url)
      }

      return res.json(
        ResponseUtil.success(
          data,
          typeof data.message === 'string' ? data.message : 'YOLO video detection completed successfully.'
        )
      )
    } catch (error) {
      let upstreamMessage = 'YOLO 视频服务请求失败。'
      if (axios.isAxiosError(error)) {
        if (typeof error.response?.data?.message === 'string') {
          upstreamMessage = error.response.data.message
        } else if (typeof error.response?.data?.error === 'string') {
          upstreamMessage = error.response.data.error
        } else if (error.message) {
          upstreamMessage = error.message
        }

        if (error.code === 'ECONNREFUSED') {
          upstreamMessage = `无法连接 YOLO 服务 ${config.yolo.baseUrl}，请确认服务已启动。`
        }
      } else if (error instanceof Error) {
        upstreamMessage = error.message
      }

      const errorPayload = {
        success: false,
        message: upstreamMessage,
        task: task ?? 'unknown',
        filename: requestWithFile.file?.originalname ?? 'unknown'
      }

      console.error(
        'YOLO video detection error:',
        {
          ...errorPayload,
          responseData: axios.isAxiosError(error) ? error.response?.data : undefined
        },
        error
      )

      return res.status(500).json(errorPayload)
    }
  }

  static async streamMedia(req: Request, res: Response) {
    try {
      const path = typeof req.query.path === 'string' ? req.query.path : ''
      const mediaPath = normalizeMediaPath(path)

      if (!mediaPath) {
        return res.status(400).json(ResponseUtil.badRequest('Invalid YOLO media path.'))
      }

      const mediaUrl = new URL(mediaPath, config.yolo.baseUrl).toString()
      const upstreamHeaders: Record<string, string> = {}
      if (typeof req.headers.range === 'string' && req.headers.range.trim()) {
        upstreamHeaders.range = req.headers.range
      }

      const response = await axios.get(mediaUrl, {
        responseType: 'stream',
        headers: upstreamHeaders,
        timeout: Math.max(config.yolo.timeout, 600000),
        validateStatus: (status) => status < 500
      })

      if (response.status >= 400) {
        return res.status(response.status).json(ResponseUtil.notFound('YOLO media not found'))
      }

      res.status(response.status)

      const passthroughHeaders = [
        'content-type',
        'content-length',
        'accept-ranges',
        'content-range',
        'cache-control',
        'etag',
        'last-modified'
      ]
      passthroughHeaders.forEach((headerName) => {
        const headerValue = response.headers[headerName]
        if (headerValue) {
          res.setHeader(headerName, headerValue)
        }
      })

      response.data.on('error', (error: Error) => {
        console.error('YOLO media stream error:', error)
        if (!res.headersSent) {
          res.status(502).end()
        } else {
          res.end()
        }
      })

      response.data.pipe(res)
    } catch (error) {
      console.error('YOLO media proxy error:', error)
      return res.status(500).json(ResponseUtil.internalError('YOLO media proxy failed.'))
    }
  }
}

export default YoloController
