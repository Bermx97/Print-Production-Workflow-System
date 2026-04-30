import express from 'express';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import { createOrder, getOrders, getOrderByNumber } from './orders.controller';

const router = express.Router();

router.post('/', isAuthenticated, createOrder);
router.get('/', isAuthenticated, getOrders);
router.get('/:orderNumber',isAuthenticated, getOrderByNumber)

export default router;