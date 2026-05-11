import { isAuthenticated } from '../../../middlewares/isAuthenticated';
import { startStepV2, endStepV2, getOrdersV2 } from './controller/controller';

import express from 'express';

const router = express.Router();

router.get('/my', isAuthenticated, getOrdersV2);
router.post('/:orderNumber/start',isAuthenticated, startStepV2);
router.post('/:orderNumber/end', isAuthenticated, endStepV2);



export default router;

