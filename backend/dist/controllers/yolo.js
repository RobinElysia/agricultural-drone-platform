import axios from 'axios';
import { config } from '../config';
import { ResponseUtil } from '../utils/response';
const SUPPORTED_TASKS = ['pest', 'fire'];
const normalizeTask = (task) => {
    if (!task)
        return null;
    return SUPPORTED_TASKS.includes(task) ? task : null;
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
                data.result_url = new URL(data.result_url, config.yolo.baseUrl).toString();
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
}
export default YoloController;
