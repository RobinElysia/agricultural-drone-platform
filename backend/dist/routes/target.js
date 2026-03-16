import { Router } from 'express';
import TargetController from '../controllers/target';
const router = Router();
// 作业目标路由
router.get('/', TargetController.getTargets);
router.get('/:id', TargetController.getTarget);
router.post('/', TargetController.createTarget);
router.put('/:id', TargetController.updateTarget);
router.put('/:id/complete', TargetController.completeTarget);
router.delete('/:id', TargetController.deleteTarget);
export default router;
