import { Router } from 'express'
import multer from 'multer'
import YoloController from '../controllers/yolo'

const publicRouter = Router()
const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

publicRouter.get('/media', YoloController.streamMedia)
router.post('/detect', YoloController.detect)
router.post('/detect-video', upload.single('video'), YoloController.detectVideo)

export { publicRouter as yoloPublicRoutes }
export default router
