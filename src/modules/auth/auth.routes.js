"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const auth_controller_1 = require("./auth.controller");
const express_validator_1 = require("express-validator");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
router.post('/login', (0, express_validator_1.body)('login')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('username must be 3-20 characters long'), (0, express_validator_1.body)('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'), validateRequest_1.default, auth_controller_1.login);
exports.default = router;
