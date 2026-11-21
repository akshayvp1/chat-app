import { Server, Socket } from "socket.io";
import redisClient from "../../config/redis";
import ChatService from "../../services/chatService";
import GroupService from "../../services/groupService";
import {
  isRecord,
  normalizeAttachments,
  normalizeMessageText,
  optionalTempId,
  requireObjectId,
  requireObjectIds,
  requireRecord,
} from "../../utils/validation";
import { emitSendError, getMemberGroup, hasConnectedRecipient } from "../helpers";

export function registerMessageListeners(
  io: Server,
  socket: Socket,
  userId: string,
  chatService: ChatService,
  groupService: GroupService,
): void {
  socket.on("get_online_users", async () => {
    try {
      const onlineUserIds: string[] = [];
      for await (const key of redisClient.scanIterator({
        MATCH: "online:*",
        COUNT: 100,
      })) {
        onlineUserIds.push(key.slice("online:".length));
      }
      socket.emit("online_users", onlineUserIds.sort());
    } catch (error) {
      console.error("get_online_users error:", error);
      socket.emit("online_users", []);
    }
  });

  socket.on("join_groups", async (groupIds: unknown) => {
    try {
      const groupIdsToJoin = requireObjectIds(groupIds, "group IDs", 50);
      const memberGroupIds = new Set(
        await groupService.getMemberGroupIds(userId, groupIdsToJoin)
      );

      for (const groupId of groupIdsToJoin) {
        if (memberGroupIds.has(groupId)) {
          socket.join(`group:${groupId}`);
        }
      }
    } catch (error) {
      console.error("join_groups error:", error);
    }
  });

  socket.on("send_message", async (data: unknown) => {
    const tempId = isRecord(data) ? optionalTempId(data.tempId) : undefined;

    try {
      const body = requireRecord(data, "Message payload");
      const receiverId = requireObjectId(body.receiverId, "receiver ID");
      const attachments = normalizeAttachments(body.attachments);
      const text = normalizeMessageText(body.text, Boolean(attachments && attachments.length > 0));

      if (receiverId === userId) {
        emitSendError(socket, "message_error", tempId);
        return;
      }

      const saved = await chatService.saveMessage(userId, receiverId, text, attachments);
      console.log("✅ Message saved:", saved._id);

      const payload = {
        _id: saved._id.toString(),
        tempId,
        senderId: userId,
        receiverId,
        text: saved.text,
        type: "text" as const,
        attachments: saved.attachments ?? [],
        seen: false,
        createdAt: saved.createdAt,
      };

      io.to(receiverId).emit("receive_message", payload);
      socket.emit("message_sent", payload);

      if (await hasConnectedRecipient(io, receiverId)) {
        socket.emit("message_delivered", {
          messageId: payload._id,
          tempId,
          receiverId,
        });
      }
    } catch (error) {
      console.error("send_message error:", error);
      emitSendError(socket, "message_error", tempId);
    }
  });

  socket.on("mark_seen", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Seen payload");
      const messageIds = requireObjectIds(body.messageIds, "message IDs", 100);
      const senderId = requireObjectId(body.senderId, "sender ID");

      if (senderId === userId) return;

      const uniqueMessageIds = [...new Set(messageIds)];
      if (uniqueMessageIds.length === 0) return;

      const matchedCount = await chatService.countMessagesForReceiver(
        senderId,
        userId,
        uniqueMessageIds,
      );
      if (matchedCount !== uniqueMessageIds.length) return;

      await chatService.markSeenForReceiver(uniqueMessageIds, userId);
      io.to(senderId).emit("messages_seen", { messageIds: uniqueMessageIds });
    } catch (error) {
      console.error("mark_seen error:", error);
    }
  });

  socket.on("send_group_message", async (data: unknown) => {
    const tempId = isRecord(data) ? optionalTempId(data.tempId) : undefined;

    try {
      const body = requireRecord(data, "Group message payload");
      const groupId = requireObjectId(body.groupId, "group ID");
      const attachments = normalizeAttachments(body.attachments);
      const text = normalizeMessageText(body.text, Boolean(attachments && attachments.length > 0));
      const group = await getMemberGroup(groupService, groupId, userId);

      if (!group) {
        emitSendError(socket, "group_message_error", tempId);
        return;
      }

      const saved = await groupService.saveGroupMessage(groupId, userId, text, attachments);
      console.log("✅ Group message saved:", saved._id);

      const payload = {
        _id: saved._id.toString(),
        tempId,
        groupId,
        senderId: userId,
        senderName: saved.senderName,
        text: saved.text,
        type: "text" as const,
        attachments: saved.attachments ?? [],
        seenBy: [userId],
        createdAt: saved.createdAt,
      };

      io.to(`group:${groupId}`).except(userId).emit("receive_group_message", payload);
      socket.emit("group_message_sent", payload);

      if (await hasConnectedRecipient(io, `group:${groupId}`, userId)) {
        socket.emit("group_message_delivered", {
          messageId: payload._id,
          tempId,
          groupId,
        });
      }
    } catch (error) {
      console.error("send_group_message error:", error);
      emitSendError(socket, "group_message_error", tempId);
    }
  });

  socket.on("mark_group_seen", async (data: unknown) => {
    try {
      const body = requireRecord(data, "Group seen payload");
      const groupId = requireObjectId(body.groupId, "group ID");
      const messageIds = requireObjectIds(body.messageIds, "message IDs", 100);
      const group = await getMemberGroup(groupService, groupId, userId);

      if (!group) return;

      const uniqueMessageIds = [...new Set(messageIds)];
      if (uniqueMessageIds.length === 0) return;

      const matchedCount = await groupService.countGroupMessages(
        groupId,
        uniqueMessageIds,
      );
      if (matchedCount !== uniqueMessageIds.length) return;

      await groupService.markGroupMessagesSeen(uniqueMessageIds, userId, groupId);
      io.to(`group:${groupId}`).except(userId).emit("group_messages_seen", {
        messageIds: uniqueMessageIds,
        seenBy: userId,
      });
    } catch (error) {
      console.error("mark_group_seen error:", error);
    }
  });
}
