import axios from 'axios';
import { config } from '../config';
import { ResponseUtil } from '../utils/response';
const SUPPORTED_TASKS = ['pest', 'fire'];
const normalizeTask = (task) => {
    if (!task)
        return null;
    return SUPPORTED_TASKS.includes(task) ? task : null;
};
const normalizeMediaPath = (input) => {
    if (!input)
        return null;
    try {
        const url = new URL(input, config.yolo.baseUrl);
        const mediaPath = `${url.pathname}${url.search}`;
        return mediaPath.startsWith('/static/') ? mediaPath : null;
    }
    catch {
        return null;
    }
};
const toMediaProxyUrl = (input) => {
    const mediaPath = normalizeMediaPath(input);
    if (!mediaPath)
        return input;
    return `/api/yolo/media?path=${encodeURIComponent(mediaPath)}`;
};
export class YoloController {
    static async detect(req, res) {
        try {
            const body = req.body;
            const task = normalizeTask(body.task);
            if (!task) {
                return res.status(400).json(ResponseUtil.badRequest('Invalid YOLO task type. Only pest and fire are supported.'));
            }
            if (!body.imageBase64 || typeof body.imageBase64 !== 'string') {
                return res.status(400).json(ResponseUtil.badRequest('Missing imageBase64 payload.'));
            }
            const detectUrl = new URL(`/api/detect/${task}`, config.yolo.baseUrl).toString();
            const response = await axios.post(detectUrl, {
                image_base64: body.imageBase64,
                filename: body.filename || 'upload.jpg',
                conf: body.conf,
                imgsz: body.imgsz
            }, { timeout: config.yolo.timeout });
            const data = response.data || {};
            if (typeof data.result_url === 'string') {
                data.result_url = toMediaProxyUrl(data.result_url);
            }
            return res.json(ResponseUtil.success(data, 'YOLO image detection completed successfully.'));
        }
        catch (error) {
            const upstreamMessage = axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
                ? error.response.data.error
                : 'YOLO service request failed.';
            console.error('YOLO detection error:', error);
            return res.status(500).json(ResponseUtil.internalError(upstreamMessage));
        }
    }
    static async detectVideo(req, res) {
        try {
            const body = req.body;
            const requestWithFile = req;
            const task = normalizeTask(typeof body.task === 'string' ? body.task : undefined);
            if (!task) {
                return res.status(400).json(ResponseUtil.badRequest('Invalid YOLO task type. Only pest and fire are supported.'));
            }
            if (!requestWithFile.file || !requestWithFile.file.buffer?.length) {
                return res.status(400).json(ResponseUtil.badRequest('Missing video file payload.'));
            }
            const formData = new FormData();
            const videoBlob = new Blob([requestWithFile.file.buffer], {
                type: requestWithFile.file.mimetype || 'application/octet-stream'
            });
            formData.append('task', task);
            formData.append('video', videoBlob, requestWithFile.file.originalname || 'upload.mp4');
            if (body.conf !== undefined && body.conf !== '')
                formData.append('conf', String(body.conf));
            if (body.imgsz !== undefined && body.imgsz !== '')
                formData.append('imgsz', String(body.imgsz));
            if (body.iou !== undefined && body.iou !== '')
                formData.append('iou', String(body.iou));
            if (body.augment !== undefined && body.augment !== '')
                formData.append('augment', String(body.augment));
            const detectUrl = new URL('/detect_video', config.yolo.baseUrl).toString();
            const response = await axios.post(detectUrl, formData, {
                timeout: Math.max(config.yolo.timeout, 600000)
            });
            const data = response.data || {};
            if (typeof data.result_url === 'string') {
                data.result_url = toMediaProxyUrl(data.result_url);
            }
            if (typeof data.upload_url === 'string') {
                data.upload_url = toMediaProxyUrl(data.upload_url);
            }
            return res.json(ResponseUtil.success(data, typeof data.message === 'string' ? data.message : 'YOLO video detection completed successfully.'));
        }
        catch (error) {
            let upstreamMessage = 'YOLO video service request failed.';
            if (axios.isAxiosError(error)) {
                if (typeof error.response?.data?.message === 'string') {
                    upstreamMessage = error.response.data.message;
                }
                else if (typeof error.response?.data?.error === 'string') {
                    upstreamMessage = error.response.data.error;
                }
                else if (error.message) {
                    upstreamMessage = error.message;
                }
            }
            console.error('YOLO video detection error:', error);
            return res.status(500).json(ResponseUtil.internalError(upstreamMessage));
        }
    }
    static async streamMedia(req, res) {
        try {
            const path = typeof req.query.path === 'string' ? req.query.path : '';
            const mediaPath = normalizeMediaPath(path);
            if (!mediaPath) {
                return res.status(400).json(ResponseUtil.badRequest('Invalid YOLO media path.'));
            }
            const mediaUrl = new URL(mediaPath, config.yolo.baseUrl).toString();
            const response = await axios.get(mediaUrl, {
                responseType: 'stream',
                timeout: Math.max(config.yolo.timeout, 600000),
                validateStatus: (status) => status < 500
            });
            if (response.status >= 400) {
                return res.status(response.status).json(ResponseUtil.notFound('YOLO media not found'));
            }
            const passthroughHeaders = ['content-type', 'content-length', 'accept-ranges', 'content-range', 'cache-control'];
            passthroughHeaders.forEach((headerName) => {
                const headerValue = response.headers[headerName];
                if (headerValue) {
                    res.setHeader(headerName, headerValue);
                }
            });
            response.data.on('error', (error) => {
                console.error('YOLO media stream error:', error);
                if (!res.headersSent) {
                    res.status(502).end();
                }
                else {
                    res.end();
                }
            });
            response.data.pipe(res);
        }
        catch (error) {
            console.error('YOLO media proxy error:', error);
            return res.status(500).json(ResponseUtil.internalError('YOLO media proxy failed.'));
        }
    }
}
export default YoloController;
