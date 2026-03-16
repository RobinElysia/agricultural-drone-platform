import { Router } from 'express';
import AIController from '../controllers/ai';
const router = Router();
// AI路由
router.post('/chat', AIController.chat);
router.get('/history', AIController.getHistory);
router.delete('/history', AIController.clearHistory);
router.get('/knowledge', AIController.getDomainKnowledge);
export default router;
