"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const auth_service_1 = require("./auth.service");
const login = async (req, res) => {
    const { login, password } = req.body;
    console.log(login);
    const employee = await (0, auth_service_1.findEmployee)(login);
    return res.json(employee);
};
exports.login = login;
