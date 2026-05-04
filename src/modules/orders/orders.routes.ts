import express from 'express';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import { createOrder, getOrders, getOrderByNumber, getMyOrders, updateOrderStatus } from './orders.controller';
import validateRequest from '../../middlewares/validateRequest';
import { body } from 'express-validator';
import { authorizeRoles } from '../../middlewares/authorizeRole';

const canCreateOrder = authorizeRoles('admin', 'technologist', 'seller');

const router = express.Router();

router.get('/', isAuthenticated, getOrders);
router.get('/my', isAuthenticated, getMyOrders );
router.get('/:orderNumber',isAuthenticated, getOrderByNumber);

router.post('/',
    body('orderNumber')
    .isInt()
    .toInt()
    .withMessage('orderNumber must be a number'),
    
    body('dueDate')
    .isISO8601()
    .withMessage('dueDate must be a valid date'),
    validateRequest, isAuthenticated, canCreateOrder, createOrder);

router.post('/:orderNumber/nextStatus', isAuthenticated, updateOrderStatus);

export default router;