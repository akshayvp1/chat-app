import { Server, Socket } from "socket.io";
import { container } from "tsyringe";
import redisClient from "../config/redis";
import ChatService from "../services/chatService";
import { User } from "../models/userModels";

export const initializeSocket = (io: Server) => {
  io.on("connection", async (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;

    if (!userId) {
      socket.disconnect();
      return;
    }

    const chatService = container.resolve(ChatService);

    console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);

    await redisClient.set(`socket:${userId}`, socket.id);
    await redisClient.set(`online:${userId}`, "1");

    socket.join(userId);
    io.emit("user_status", { userId, online: true, lastSeen: null });

    // ─── Get Online Users ─────────────────────────────────────────────
    socket.on("get_online_users", async () => {
      const keys = await redisClient.keys("online:*");
      const onlineUserIds = keys.map((k) => k.replace("online:", ""));
      socket.emit("online_users", onlineUserIds);
    });

    // ─── Send Message ─────────────────────────────────────────────────
    socket.on("send_message", async (data) => {
      console.log("📨 send_message received:", data);
      try {
        const saved = await chatService.saveMessage(
          userId,
          data.receiverId,
          data.text,
        );
        console.log("✅ Message saved:", saved._id);

        const payload = {
          _id: saved._id.toString(),
          tempId: data.tempId,
          senderId: userId,
          receiverId: data.receiverId,
          text: saved.text,
          seen: false,
          createdAt: saved.createdAt,
        };

        io.to(data.receiverId).emit("receive_message", payload);
        socket.emit("message_sent", payload);
      } catch (error) {
        console.error("send_message error:", error);
        socket.emit("message_error", { tempId: data.tempId });
      }
    });

    // ─── Mark Seen ────────────────────────────────────────────────────
    socket.on(
      "mark_seen",
      async (data: { messageIds: string[]; senderId: string }) => {
        try {
          await chatService.markSeen(data.messageIds);
          io.to(data.senderId).emit("messages_seen", {
            messageIds: data.messageIds,
          });
        } catch (error) {
          console.error("mark_seen error:", error);
        }
      },
    );

    // ─── Typing ───────────────────────────────────────────────────────
    socket.on("typing", (data: { to: string; from: string }) => {
      io.to(data.to).emit("typing", { from: data.from });
    });

    socket.on("stop_typing", (data: { to: string; from: string }) => {
      io.to(data.to).emit("stop_typing", { from: data.from });
    });

    // ─── Disconnect ───────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`❌ User disconnected: ${userId}`);
      await redisClient.del(`socket:${userId}`);
      await redisClient.del(`online:${userId}`);

      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { lastSeen });

      io.emit("user_status", { userId, online: false, lastSeen });
    });
  });
};