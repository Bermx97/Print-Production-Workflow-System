import { body } from 'express-validator';
import { product_type } from '@prisma/client';

export const createOrderValidation = [
    body('orderNumber')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Invalid order number')
    .toInt(),
    
    body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date'),

    body('productType')
    .notEmpty()
    .withMessage('Product type is required')
    .isIn(Object.values(product_type))
    .withMessage('Invalid product type'),

    body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Quantity must be between 1 and 1000000')
    .toInt(),

    body('customer')
    .trim()
    .notEmpty()
    .withMessage('Customer is required'),

    body('numberOfPages')
    .notEmpty()
    .withMessage('Number of pages is required')
    .isInt({ min: 1, max: 2000 })
    .withMessage('Number of pages must be between 2 and 2000')
    .custom(value => value % 2 === 0)
    .withMessage('Number of pages must be even')
    .toInt()
];