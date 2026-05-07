import express from 'express';
import authRoutes from './modules/auth/auth.routes';
import ordersRoutes from './modules/orders/orders.routes';
import errorHandler from './middlewares/errorHandler';
import cors from 'cors';
import path from "path";

const app = express();


app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend")));


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.use("/auth", authRoutes);
app.use('/orders', ordersRoutes);


app.use(errorHandler);

export default app;

