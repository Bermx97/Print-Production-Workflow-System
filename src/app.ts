import express from 'express';
import authRoutes from './modules/auth/auth.routes';
import ordersRoutes from './modules/orders/orders.routes';
import errorHandler from './middlewares/errorHandler';

const app = express();

app.use(express.json());


app.use("/auth", authRoutes);
app.use('/orders', ordersRoutes);


app.use(errorHandler);

export default app;

