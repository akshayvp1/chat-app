import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import "./config/container";
import router from "./routes/router";
import redisClient from "./config/redis";

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    // Validate Env
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    // ------------------------
    // 🔐 GLOBAL MIDDLEWARES
    // ------------------------
    app.use(
      cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
      })
    );

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(morgan("dev"));

    // ------------------------
    // DB CONNECTIONS
    // ------------------------
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("✅ Redis Connected");
    }

    // ------------------------
    // ROUTES
    // ------------------------
    app.use("/api", router);

    // ------------------------
    // START SERVER
    // ------------------------
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Server Startup Error:", error);
    process.exit(1);
  }
}

startServer();