import express from 'express';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import { createOrder, getOrders, getOrderByNumber, /*nextStep,*/ startStepV2, endStepV2, getVisibleOrdersV2 } from './orders.controller';

import validateRequest from '../../middlewares/validateRequest';
import { createOrderValidation } from './order.validation';
import { authorizeRoles } from '../../middlewares/authorizeRole';
import { body } from 'express-validator';


const canCreateOrder = authorizeRoles('admin', 'technologist', 'seller');

const router = express.Router();

router.get('/', isAuthenticated, getOrders);
router.get('/my', isAuthenticated, getVisibleOrdersV2);
router.get('/:orderNumber',isAuthenticated, getOrderByNumber);

router.post('/:orderNumber/start',isAuthenticated, startStepV2);
router.post('/:orderNumber/end', isAuthenticated,
    body('stepQuantity')
    .notEmpty()
    .withMessage('Step quantity is required')
    .isInt({ gt: 0 })
    .withMessage('Step quantity must be greater than 0')
    .toInt()
    .withMessage('Step quantity must be a number'),
    endStepV2);

router.post('/', isAuthenticated, canCreateOrder, createOrderValidation, validateRequest, createOrder);

export default router;