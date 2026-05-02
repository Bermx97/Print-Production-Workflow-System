import express from 'express';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import { createOrder, getOrders, getOrderByNumber } from './orders.controller';
import validateRequest from '../../middlewares/validateRequest';
import { body } from 'express-validator';
import { authorizeRoles } from '../../middlewares/authorizeRole';

const canCreateOrder = authorizeRoles('admin', 'technologist');

const router = express.Router();

router.post('/',
    body('orderNumber')
    .isInt()
    .toInt()
    .withMessage('orderNumber must be a number'),
    
    body('status')
    .isIn(['printing', 'cutting', 'gluing'])
    .withMessage('Invalid status'),

    body('dueDate')
    .isISO8601()
    .withMessage('dueDate must be a valid date'),
    validateRequest, isAuthenticated, canCreateOrder, createOrder);

router.get('/', isAuthenticated, getOrders);
router.get('/:orderNumber',isAuthenticated, getOrderByNumber);

export default router;