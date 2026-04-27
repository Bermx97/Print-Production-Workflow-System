import express from "express";
import app from './app'

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    });
};
