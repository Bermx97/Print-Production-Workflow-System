import app from "./app";
import express from "express";
const PORT = process.env.PORT || 3000;

app.use(express.json());


if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    });
};
