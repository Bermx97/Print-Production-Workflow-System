import { body } from 'express-validator';
import { product_type } from '@prisma/client';

export const createOrderValidation = [
    body('orderNumber')
    .isInt()
    .toInt()
    .withMessage('Order number must be a number'),
    
    body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date'),

    body('productType')
    .notEmpty()
    .withMessage('Order type is required')
    .isIn(Object.values(product_type))
    .withMessage('Invalid product type'),

    body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ gt: 0 })
    .withMessage('Quantity must be greater than 0')
    .toInt()
    .withMessage('Quantity must be a number'),

    body('customer')
    .notEmpty()
    .withMessage('Customer is required'),

    body('numberOfPages')
    .notEmpty()
    .withMessage('Number of pages are required')
    .isInt({ gt: 0 })
    .withMessage('Number of pages must be greater than 0')
    .toInt()
    .withMessage('Number of pages must be a number'),
];