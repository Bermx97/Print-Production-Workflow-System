import { body } from 'express-validator';
import { product_type, Variant } from '@prisma/client';

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
    .toInt(),

    body('parts').isArray({ min: 1 })
    .isArray({ min: 1, max: 6 })
    .withMessage('You can add between 1 and 6 parts per order'),

    body('parts.*.variant'),
    //.isIn([Object.values(Variant)])
    //.withMessage('variant must be one of: V4, V8, V16, V32, V64'),

    body('parts.*.runs')
    .isInt({ min: 1, max: 100 })
    .withMessage('Signatures must be between 1 and 200')
    .toInt(),


    body('parts.*.part_quantity')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('part quantity must be between 1 and 1000000')
    .toInt(),

];