"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
console.log("DATABASE_URL:", process.env.DATABASE_URL);
app.use("/auth", auth_routes_1.default);
app.get("/", (req, res) => {
    res.send("API is working");
});
console.log("ROUTES LOADED");
exports.default = app;
