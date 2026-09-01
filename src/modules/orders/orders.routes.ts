import express from 'express';
import { body } from 'express-validator';
import { authorizeRoles } from '../../middlewares/authorizeRole';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import validateRequest from '../../middlewares/validateRequest';
import { getOrderStatsController } from './analytics.controller';
import { createOrderValidation } from './order.validation';
import { createOrder, endStepV2, getOrderByNumber, getOrderPartsV2, getOrders, getVisibleOrders, pauseStepV2, resumeStepV2, startStepV2, getMyActiveSteps } from './orders.controller';
import { getAverageStepsSpeed } from './analytics.controller';



const canCreateOrder = authorizeRoles('admin', 'technologist', 'seller');

const router = express.Router();

router.get('/', isAuthenticated, getOrders);
router.get('/my', isAuthenticated, getVisibleOrders);
router.get('/my/active', isAuthenticated, getMyActiveSteps);
router.get('/:orderNumber', isAuthenticated, getOrderByNumber);
router.get('/:orderNumber/analytics', isAuthenticated, getAverageStepsSpeed);
router.get('/:orderNumber/parts', isAuthenticated, getOrderPartsV2);
router.get('/:orderNumber/stats',isAuthenticated, getOrderStatsController);

router.post('/:orderNumber/start', isAuthenticated, startStepV2);
router.post('/:orderNumber/pause', isAuthenticated, pauseStepV2);
router.post('/:orderNumber/resume', isAuthenticated, resumeStepV2);
router.post('/:orderNumber/end', isAuthenticated,
    body('doneQuantity')
        .notEmpty()
        .withMessage('Step quantity is required')
        .isInt({ min: 1, max: 1000000 })
        .withMessage('Step quantity must be between 1 and 1000000')
        .toInt(),
    validateRequest,
    endStepV2);

router.post('/', isAuthenticated, canCreateOrder, createOrderValidation, validateRequest, createOrder);

export default router;
