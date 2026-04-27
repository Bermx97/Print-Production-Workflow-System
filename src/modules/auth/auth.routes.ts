import express from 'express';
import { login } from './auth.controller'
import { body } from 'express-validator';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post('/login',
    body('login')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('username must be 3-20 characters long'),

    body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    validateRequest, login);

export default router;