import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import express, { NextFunction, Request, Response } from "express";
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
import { RequestError } from "./utils/validation";
import { configureMongoDns, getMongoDnsServers } from "./config/mongoDns";

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

function getMongoErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const details: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };
    const code = (error as { code?: unknown }).code;
    if (code !== undefined) details.code = code;
    const reason = (error as { reason?: unknown }).reason;
    if (reason !== undefined) details.reason = String(reason);
    return details;
  }
  return { message: String(error) };
}

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

    console.log("Connecting to MongoDB...");
    await configureMongoDns(MONGO_URI);
    console.log("[mongo] DNS servers:", getMongoDnsServers().join(", "));

    mongoose.connection.on("connected", () => {
      console.log("[mongo] Connection established");
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("[mongo] Disconnected");
    });
    mongoose.connection.on("error", (err) => {
      console.error("[mongo] Connection error:", getMongoErrorDetails(err));
    });

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB connected successfully");
    console.log("Database:", mongoose.connection.name);

    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Redis connected");
    }

    app.use("/api", router);

    app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });

    app.use(
      (
        error: unknown,
        _req: Request,
        res: Response,
        _next: NextFunction
      ) => {
        if (error instanceof RequestError) {
          res.status(error.status).json({
            success: false,
            message: error.message,
          });
          return;
        }

        console.error("Unhandled request error:", error);

        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    );

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Socket.IO running");
    });
  } catch (error) {
    console.error("Server startup error:", getMongoErrorDetails(error));

    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      if (redisClient.isOpen) {
        await redisClient.quit();
      }
    } catch (cleanupError) {
      console.error("Cleanup error:", getMongoErrorDetails(cleanupError));
    }

    process.exit(1);
  }
}

startServer();
