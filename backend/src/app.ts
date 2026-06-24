import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

import "./config/container";
import router from "./routes/router";
import redisClient from "./config/redis";
import { initializeSocket } from "./socket/socket";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

initializeSocket(io);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

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

    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("✅ Redis Connected");
    }

    app.use("/api", router);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO running`);
    });
  } catch (error) {
    console.error("❌ Server Startup Error:", error);
    process.exit(1);
  }
}

startServer();