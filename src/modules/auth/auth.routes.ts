import express from "express";
const router = express.Router();
const authController = require('../auth/auth.controller');
const { body } = require('express-validator');
