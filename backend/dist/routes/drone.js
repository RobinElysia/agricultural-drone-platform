import { Router } from 'express';
import DroneController from '../controllers/drone';
const router = Router();
// 无人机路由
router.get('/', DroneController.getDrones);
router.get('/:id', DroneController.getDrone);
router.post('/', DroneController.createDrone);
router.put('/:id', DroneController.updateDrone);
router.delete('/:id', DroneController.deleteDrone);
router.post('/:id/control', DroneController.controlDrone);
router.get('/operations/history', DroneController.getOperations);
export default router;
