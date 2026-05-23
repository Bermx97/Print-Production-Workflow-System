import express from 'express';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import { createOrder, getOrders, getOrderByNumber, startStepV2, endStepV2, pauseStepV2, resumeStepV2, getVisibleOrdersV2, getOrderPartsV2 } from './orders.controller';
import { getAverageStepsSpeed } from './analytics.controller';

import validateRequest from '../../middlewares/validateRequest';
import { createOrderValidation } from './order.validation';
import { authorizeRoles } from '../../middlewares/authorizeRole';
import { body } from 'express-validator';



const canCreateOrder = authorizeRoles('admin', 'technologist', 'seller');

const router = express.Router();

router.get('/', isAuthenticated, getOrders);
router.get('/my', isAuthenticated, getVisibleOrdersV2);
router.get('/:orderNumber/analytics', isAuthenticated, getAverageStepsSpeed)
router.get('/:orderNumber/parts', isAuthenticated, getOrderPartsV2)
router.get('/:orderNumber', isAuthenticated, getOrderByNumber);

router.post('/:orderNumber/start',isAuthenticated, startStepV2);
router.post('/:orderNumber/pause', isAuthenticated, pauseStepV2);
router.post('/:orderNumber/resume', isAuthenticated, resumeStepV2);
router.post('/:orderNumber/end', isAuthenticated,
    body('stepQuantity')
    .notEmpty()
    .withMessage('Step quantity is required')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Step quantity must be between 1 and 1000000')
    .toInt(),
    endStepV2);

router.post('/', isAuthenticated, canCreateOrder, createOrderValidation, validateRequest, createOrder);

export default router;
