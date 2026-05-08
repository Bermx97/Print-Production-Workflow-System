import express from 'express';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import { createOrder, getOrders, getOrderByNumber, getMyOrders, nextStep } from './orders.controller';
import validateRequest from '../../middlewares/validateRequest';
import { createOrderValidation } from './order.validation';
import { authorizeRoles } from '../../middlewares/authorizeRole';


const canCreateOrder = authorizeRoles('admin', 'technologist', 'seller');

const router = express.Router();

router.get('/', isAuthenticated, getOrders);
router.get('/my', isAuthenticated, getMyOrders );
router.get('/:orderNumber',isAuthenticated, getOrderByNumber);

router.post('/', isAuthenticated, canCreateOrder, createOrderValidation, validateRequest, createOrder);

router.post('/:orderNumber/nextStep', isAuthenticated, nextStep);

export default router;