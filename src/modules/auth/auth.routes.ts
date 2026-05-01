import express from 'express';
import { login, registerEmployee } from './auth.controller'
import { body } from 'express-validator';
import validateRequest from '../../middlewares/validateRequest';
import { employee_role } from "@prisma/client";


const router = express.Router();

router.post('/login',
    body('login')
    .notEmpty()
    .withMessage('Login is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Login must be 3-20 characters long'),

    body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    validateRequest, login);

router.post('/register',
    body('login')
    .notEmpty()
    .withMessage('Login is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Login must be 3-20 characters long'),

    body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

    body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(Object.values(employee_role))
    .withMessage('Invalid role'),
    validateRequest, registerEmployee);

export default router;