import { Server, Socket } from "socket.io";
import { container } from "tsyringe";
import redisClient from "../config/redis";
import ChatService from "../services/chatService";
import GroupService from "../services/groupService";
import { User } from "../models/userModels";

export const initializeSocket = (io: Server) => {
  io.on("connection", async (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;

    if (!userId) {
      socket.disconnect();
      return;
    }

    const chatService = container.resolve(ChatService);
    const groupService = container.resolve(GroupService);

    console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);

    await redisClient.set(`socket:${userId}`, socket.id);
    await redisClient.set(`online:${userId}`, "1");

    socket.join(userId);
    io.emit("user_status", { userId, online: true, lastSeen: null });

    // ─── Auto-join all group rooms this user belongs to ───────────────
    try {
      const userGroups = await groupService.getGroupsForUser(userId);
      userGroups.forEach((group) => {
        socket.join(`group:${group._id.toString()}`);
      });
    } catch (error) {
      console.error("Failed to join group rooms:", error);
    }

    // ─── Get Online Users ─────────────────────────────────────────────
    socket.on("get_online_users", async () => {
      const keys = await redisClient.keys("online:*");
      const onlineUserIds = keys.map((k) => k.replace("online:", ""));
      socket.emit("online_users", onlineUserIds);
    });

    // ─── Join specific group rooms (called from frontend after fetch) ──
    socket.on("join_groups", (groupIds: string[]) => {
      groupIds.forEach((id) => socket.join(`group:${id}`));
    });

    // ─── Send DM ──────────────────────────────────────────────────────
    socket.on(
      "send_message",
      async (data: { receiverId: string; text: string; tempId: string }) => {
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
      },
    );

    // ─── Mark DM Seen ─────────────────────────────────────────────────
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

    // ─── DM Typing ────────────────────────────────────────────────────
    socket.on("typing", (data: { to: string; from: string }) => {
      io.to(data.to).emit("typing", { from: data.from });
    });

    socket.on("stop_typing", (data: { to: string; from: string }) => {
      io.to(data.to).emit("stop_typing", { from: data.from });
    });

    // ─── Send Group Message ───────────────────────────────────────────
    socket.on(
      "send_group_message",
      async (data: {
        groupId: string;
        text: string;
        tempId: string;
        senderName: string;
      }) => {
        console.log("📨 send_group_message received:", data);
        try {
          const saved = await groupService.saveGroupMessage(
            data.groupId,
            userId,
            data.text,
          );
          console.log("✅ Group message saved:", saved._id);

          const payload = {
            _id: saved._id.toString(),
            tempId: data.tempId,
            groupId: data.groupId,
            senderId: userId,
            senderName: data.senderName,
            text: saved.text,
            seenBy: [userId],
            createdAt: saved.createdAt,
          };

          // Deliver to all members in the group room (including sender's other tabs)
          socket
            .to(`group:${data.groupId}`)
            .emit("receive_group_message", payload);
          socket.emit("group_message_sent", payload);
        } catch (error) {
          console.error("send_group_message error:", error);
          socket.emit("group_message_error", { tempId: data.tempId });
        }
      },
    );

    // ─── Mark Group Messages Seen ─────────────────────────────────────
    socket.on(
      "mark_group_seen",
      async (data: { messageIds: string[]; groupId: string }) => {
        try {
          await groupService.markGroupMessagesSeen(data.messageIds, userId);
          socket.to(`group:${data.groupId}`).emit("group_messages_seen", {
            messageIds: data.messageIds,
            seenBy: userId,
          });
        } catch (error) {
          console.error("mark_group_seen error:", error);
        }
      },
    );

    // ─── Group Typing ─────────────────────────────────────────────────
    socket.on(
      "group_typing",
      (data: { groupId: string; from: string; fromName: string }) => {
        socket.to(`group:${data.groupId}`).emit("group_typing", data);
      },
    );

    socket.on(
      "group_stop_typing",
      (data: { groupId: string; from: string }) => {
        socket.to(`group:${data.groupId}`).emit("group_stop_typing", data);
      },
    );

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
