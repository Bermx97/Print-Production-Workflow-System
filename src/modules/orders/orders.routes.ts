import express from 'express';
import { body } from 'express-validator';
import { authorizeRoles } from '../../middlewares/authorizeRole';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import validateRequest from '../../middlewares/validateRequest';
import { getAverageStepsSpeed } from './analytics.controller';
import { createOrderValidation } from './order.validation';
import { createOrder, endStepV2, getOrderByNumber, getOrderPartsV2, getOrders, getVisibleOrdersV2, pauseStepV2, resumeStepV2, startStepV2 } from './orders.controller';



const canCreateOrder = authorizeRoles('admin', 'technologist', 'seller');

const router = express.Router();

router.get('/', isAuthenticated, getOrders);
router.get('/my', isAuthenticated, getVisibleOrdersV2);
router.get('/:orderNumber/analytics', isAuthenticated, getAverageStepsSpeed)
router.get('/:orderNumber/parts', isAuthenticated, getOrderPartsV2)
router.get('/:orderNumber', isAuthenticated, getOrderByNumber);

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
    endStepV2);

router.post('/', isAuthenticated, canCreateOrder, createOrderValidation, validateRequest, createOrder);

export default router;
