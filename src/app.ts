import express from 'express';
import authRoutes from './modules/auth/auth.routes';

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

            app.get("/", (req, res) => {
            res.send("API is working");
            });


export default app;