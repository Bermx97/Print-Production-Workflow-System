import express from 'express';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import { createOrder, getOrders, getOrderByNumber, getMyOrders, nextStep, createStepLog } from './orders.controller';

import validateRequest from '../../middlewares/validateRequest';
import { createOrderValidation } from './order.validation';
import { authorizeRoles } from '../../middlewares/authorizeRole';
import { body } from 'express-validator';


const canCreateOrder = authorizeRoles('admin', 'technologist', 'seller');

const router = express.Router();

router.get('/', isAuthenticated, getOrders);
router.get('/my',isAuthenticated, getMyOrders );
router.get('/:orderNumber',isAuthenticated, getOrderByNumber);
//router.get('/:orderNumber/state', isAuthenticated, getOrderStateFromLogsService);

router.post('/', isAuthenticated, canCreateOrder, createOrderValidation, validateRequest, createOrder);
router.post('/:orderNumber/nextStep', isAuthenticated,
    body('stepQuantities')
    .notEmpty()
    .withMessage('Step quantity is required')
    .isInt({ gt: 0 })
    .withMessage('Step quantity must be greater than 0')
    .toInt()
    .withMessage('Step quantity must be a number'),
    validateRequest, nextStep);

router.post('/:orderNumber/logs', isAuthenticated, createStepLog)


export default router;