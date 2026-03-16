import { Router } from 'express'
import YoloController from '../controllers/yolo'

const router = Router()

router.post('/detect', YoloController.detect)

export default router
