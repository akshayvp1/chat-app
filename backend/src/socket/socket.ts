import { Server, Socket } from "socket.io";
import { container } from "tsyringe";
import redisClient from "../config/redis";
import ChatService from "../services/chatService";
import GroupService from "../services/groupService";
import CallService from "../services/callService";
import GroupCallService from "../services/groupCallService";
import { User } from "../models/userModels";

const RING_TIMEOUT_MS = 45_000;
const ringingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const groupRingingTimers = new Map<string, ReturnType<typeof setTimeout>>();

const finalizingGroupCalls = new Set<string>();

function clearRingingTimer(callId: string) {
  const t = ringingTimers.get(callId);
  if (t) {
    clearTimeout(t);
    ringingTimers.delete(callId);
  }
}

function clearGroupRingingTimer(callId: string) {
  const t = groupRingingTimers.get(callId);
  if (t) {
    clearTimeout(t);
    groupRingingTimers.delete(callId);
  }
}

export const initializeSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;

    if (!userId) {
      socket.disconnect();
      return;
    }

    const chatService = container.resolve(ChatService);
    const groupService = container.resolve(GroupService);
    const callService = container.resolve(CallService);
    const groupCallService = container.resolve(GroupCallService);

    console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);

    /* ════════════════════════════════════════════════════════════════
       LISTENERS FIRST, ALWAYS.

       Everything below is registered synchronously, before any await.
       The async setup (Redis writes, joining this user's group rooms
       from the DB) happens further down and can take anywhere from a
       few ms to a few hundred ms depending on load.

       If listeners were registered AFTER that setup (as before), any
       event the client sends in that window — most importantly
       "join_groups", fired the instant GroupChat.tsx mounts — has no
       handler yet and is silently dropped. No error, no retry. That
       produced exactly the symptom reported: typing/messages working
       "most of the time" and randomly not, depending on timing.
       ════════════════════════════════════════════════════════════════ */

    socket.on("get_online_users", async () => {
      const keys = await redisClient.keys("online:*");
      const onlineUserIds = keys.map((k) => k.replace("online:", ""));
      socket.emit("online_users", onlineUserIds);
    });

    socket.on("join_groups", (groupIds: string[]) => {
      groupIds.forEach((id) => socket.join(`group:${id}`));
    });

    // ─── Send DM ──────────────────────────────────────────────────────
    socket.on(
      "send_message",
      async (data: { receiverId: string; text: string; tempId: string }) => {
        console.log("📨 send_message received:", data);
        try {
          const saved = await chatService.saveMessage(userId, data.receiverId, data.text);
          console.log("✅ Message saved:", saved._id);

          const payload = {
            _id: saved._id.toString(),
            tempId: data.tempId,
            senderId: userId,
            receiverId: data.receiverId,
            text: saved.text,
            type: "text" as const,
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
          io.to(data.senderId).emit("messages_seen", { messageIds: data.messageIds });
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
      // senderName no longer accepted from the client — the repository
      // now populates it from the User collection when saving, so the
      // name shown is always the real one, not whatever the client
      // claimed to be. It's also why "no name on refresh" is fixed:
      // getGroupMessages populates it the same way for every read.
      "send_group_message",
      async (data: { groupId: string; text: string; tempId: string }) => {
        console.log("📨 send_group_message received:", data);
        try {
          const saved = await groupService.saveGroupMessage(data.groupId, userId, data.text);
          console.log("✅ Group message saved:", saved._id);

          const payload = {
            _id: saved._id.toString(),
            tempId: data.tempId,
            groupId: data.groupId,
            senderId: userId,
            senderName: saved.senderName,
            text: saved.text,
            type: "text" as const,
            seenBy: [userId],
            createdAt: saved.createdAt,
          };

          socket.to(`group:${data.groupId}`).emit("receive_group_message", payload);
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

    // ════════════════════════════════════════════════════════════════════
    // ─── 1:1 CALLS (audio/video) ────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════

    async function finalizeCall(
      callId: string,
      status: "completed" | "missed" | "rejected",
    ) {
      try {
        clearRingingTimer(callId);

        const dbId = await redisClient.get(`call:${callId}`);
        if (!dbId) return;

        const call = await callService.endCall(dbId, status);
        if (!call) return;

        await redisClient.del(`call:${callId}`);
        await redisClient.del(`callconnected:${callId}`);

        const callerId = String((call as any).callerId?._id ?? (call as any).callerId);
        const receiverId = String((call as any).receiverId?._id ?? (call as any).receiverId);
        await redisClient.del(`activecall:${callerId}`);
        await redisClient.del(`activecall:${receiverId}`);

        const callMessage = await chatService.saveCallMessage(callerId, receiverId, {
          callType: (call as any).type,
          status,
          duration: (call as any).duration ?? 0,
        });

        const messagePayload = {
          _id: callMessage._id.toString(),
          senderId: callerId,
          receiverId,
          text: "",
          type: "call" as const,
          call: {
            callType: (call as any).type,
            status,
            duration: (call as any).duration ?? 0,
          },
          seen: false,
          createdAt: callMessage.createdAt,
        };

        io.to(callerId).emit("receive_message", messagePayload);
        io.to(receiverId).emit("receive_message", messagePayload);
      } catch (error) {
        console.error("finalizeCall error:", error);
      }
    }

    socket.on(
      "call:initiate",
      async (data: { callId: string; to: string; from: string; fromName: string; type: "audio" | "video" }) => {
        try {
          const call = await callService.startCall(data.from, data.to, data.type);
          await redisClient.set(`call:${data.callId}`, call._id.toString());
          await redisClient.set(`activecall:${data.from}`, data.callId);
          await redisClient.set(`activecall:${data.to}`, data.callId);

          io.to(data.to).emit("call:incoming", data);

          const timer = setTimeout(async () => {
            ringingTimers.delete(data.callId);
            await finalizeCall(data.callId, "missed");
            io.to(data.from).emit("call:timeout", { callId: data.callId });
            io.to(data.to).emit("call:cancelled", { callId: data.callId });
          }, RING_TIMEOUT_MS);
          ringingTimers.set(data.callId, timer);
        } catch (error) {
          console.error("call:initiate error:", error);
          socket.emit("call:unavailable", { callId: data.callId });
        }
      },
    );

    socket.on(
      "call:accept",
      async (data: { callId: string; to: string; from: string }) => {
        clearRingingTimer(data.callId);
        await redisClient.set(`callconnected:${data.callId}`, "1");
        io.to(data.to).emit("call:accepted", { callId: data.callId, from: data.from });
      },
    );

    socket.on(
      "call:reject",
      async (data: { callId: string; to: string; from: string }) => {
        clearRingingTimer(data.callId);
        await finalizeCall(data.callId, "rejected");
        io.to(data.to).emit("call:rejected", { callId: data.callId, from: data.from });
      },
    );

    socket.on(
      "call:cancel",
      async (data: { callId: string; to: string; from: string }) => {
        clearRingingTimer(data.callId);
        await finalizeCall(data.callId, "missed");
        io.to(data.to).emit("call:cancelled", { callId: data.callId });
      },
    );

    socket.on("call:end", async (data: { callId: string; to: string }) => {
      clearRingingTimer(data.callId);
      await finalizeCall(data.callId, "completed");
      io.to(data.to).emit("call:ended", { callId: data.callId });
    });

    socket.on("call:offer", (data: { callId: string; to: string; offer: unknown }) => {
      io.to(data.to).emit("call:offer", data);
    });

    socket.on("call:answer", (data: { callId: string; to: string; answer: unknown }) => {
      io.to(data.to).emit("call:answer", data);
    });

    socket.on(
      "call:ice-candidate",
      (data: { callId: string; to: string; candidate: unknown }) => {
        io.to(data.to).emit("call:ice-candidate", data);
      },
    );

    // ════════════════════════════════════════════════════════════════════
    // ─── GROUP CALLS (audio/video, full mesh) ───────────────────────────
    //
    // Redis keys:
    //   groupcall:<callId>            -> Mongo call _id
    //   groupcall:<callId>:members    -> SET of userIds currently in the call
    //   groupcall:<callId>:names      -> HASH userId -> display name
    //   groupcall:<callId>:connected  -> "1" once 2+ members were ever present
    //   activegroupcall:<groupId>     -> callId currently running for this group
    //   usergroupcall:<userId>        -> "<callId>:<groupId>" (disconnect cleanup)
    //
    // Convention: whoever JOINS an ongoing call creates the WebRTC offer to
    // every existing participant. Existing participants only ever answer.
    // ════════════════════════════════════════════════════════════════════

    async function finalizeGroupCall(callId: string, groupId: string) {
      if (finalizingGroupCalls.has(callId)) return;
      finalizingGroupCalls.add(callId);

      try {
        clearGroupRingingTimer(callId);

        const dbId = await redisClient.get(`groupcall:${callId}`);
        if (!dbId) return;

        const wasConnected = await redisClient.get(`groupcall:${callId}:connected`);
        const status: "completed" | "missed" = wasConnected ? "completed" : "missed";

        const call = await groupCallService.endCall(dbId, status);
        if (!call) return;

        await redisClient.del(`groupcall:${callId}`);
        await redisClient.del(`groupcall:${callId}:members`);
        await redisClient.del(`groupcall:${callId}:names`);
        await redisClient.del(`groupcall:${callId}:connected`);

        const currentActive = await redisClient.get(`activegroupcall:${groupId}`);
        if (currentActive === callId) {
          await redisClient.del(`activegroupcall:${groupId}`);
        }

        const participantCount = new Set(
          (call as any).participants.map((p: any) => String(p.userId?._id ?? p.userId)),
        ).size;

        const initiatorId = String((call as any).initiatorId?._id ?? (call as any).initiatorId);

        const callMessage = await groupService.saveGroupCallMessage(groupId, initiatorId, {
          callType: (call as any).type,
          status,
          duration: (call as any).duration ?? 0,
          participantCount,
        });

        const messagePayload = {
          _id: callMessage._id.toString(),
          groupId,
          senderId: initiatorId,
          senderName: callMessage.senderName,
          text: "",
          type: "call" as const,
          call: {
            callType: (call as any).type,
            status,
            duration: (call as any).duration ?? 0,
            participantCount,
          },
          seenBy: [],
          createdAt: callMessage.createdAt,
        };

        io.to(`group:${groupId}`).emit("receive_group_message", messagePayload);
        io.to(`group:${groupId}`).emit("group_call:ended", { callId, groupId });
      } catch (error) {
        console.error("finalizeGroupCall error:", error);
      } finally {
        finalizingGroupCalls.delete(callId);
      }
    }

    // ─── Start (or transparently join) a group call ─────────────────────
    socket.on(
      "group_call:initiate",
      async (data: {
        callId: string;
        groupId: string;
        from: string;
        fromName: string;
        type: "audio" | "video";
      }) => {
        try {
          const initiatorId = userId; // never trust data.from

          const existingCallId = await redisClient.get(`activegroupcall:${data.groupId}`);
          if (existingCallId) {
            socket.emit("group_call:join-existing", {
              callId: existingCallId,
              groupId: data.groupId,
              type: data.type,
            });
            return;
          }

          const call = await groupCallService.startCall(data.groupId, initiatorId, data.type);

          await redisClient.set(`groupcall:${data.callId}`, call._id.toString());
          await redisClient.set(`activegroupcall:${data.groupId}`, data.callId);
          await redisClient.set(`usergroupcall:${initiatorId}`, `${data.callId}:${data.groupId}`);
          await redisClient.sAdd(`groupcall:${data.callId}:members`, initiatorId);
          await redisClient.hSet(`groupcall:${data.callId}:names`, initiatorId, data.fromName);

          socket.emit("group_call:initiated", {
            callId: data.callId,
            groupId: data.groupId,
            type: data.type,
          });

          socket.to(`group:${data.groupId}`).emit("group_call:incoming", {
            callId: data.callId,
            groupId: data.groupId,
            from: initiatorId,
            fromName: data.fromName,
            type: data.type,
          });

          const timer = setTimeout(async () => {
            groupRingingTimers.delete(data.callId);
            const memberCount = await redisClient.sCard(`groupcall:${data.callId}:members`);
            if (memberCount <= 1) {
              await finalizeGroupCall(data.callId, data.groupId);
            }
          }, RING_TIMEOUT_MS);
          groupRingingTimers.set(data.callId, timer);
        } catch (error) {
          console.error("group_call:initiate error:", error);
          socket.emit("call:unavailable", { callId: data.callId });
        }
      },
    );

    // ─── Join an ongoing group call ─────────────────────────────────────
    socket.on(
      "group_call:join",
      async (data: { callId: string; groupId: string; userId: string; userName: string }) => {
        try {
          const joiningUserId = userId; // never trust data.userId

          const dbId = await redisClient.get(`groupcall:${data.callId}`);
          if (!dbId) {
            socket.emit("call:unavailable", { callId: data.callId });
            return;
          }

          clearGroupRingingTimer(data.callId);

          const existingMemberIds = await redisClient.sMembers(
            `groupcall:${data.callId}:members`,
          );
          const namesMap = (await redisClient.hGetAll(`groupcall:${data.callId}:names`)) ?? {};

          const alreadyMember = existingMemberIds.includes(joiningUserId);
          if (!alreadyMember) {
            await redisClient.sAdd(`groupcall:${data.callId}:members`, joiningUserId);
            await redisClient.hSet(`groupcall:${data.callId}:names`, joiningUserId, data.userName);
            await groupCallService.joinCall(dbId, joiningUserId);
          }

          await redisClient.set(`usergroupcall:${joiningUserId}`, `${data.callId}:${data.groupId}`);

          const memberCount = await redisClient.sCard(`groupcall:${data.callId}:members`);
          if (memberCount >= 2) {
            await redisClient.set(`groupcall:${data.callId}:connected`, "1");
            await groupCallService.markOngoing(dbId);
          }

          // Tell the joiner who's already here — the joiner creates offers to each.
          socket.emit("group_call:existing-participants", {
            callId: data.callId,
            participants: existingMemberIds
              .filter((id) => id !== joiningUserId)
              .map((id) => ({ userId: id, userName: namesMap[id] ?? "Unknown" })),
          });

          socket.to(`group:${data.groupId}`).emit("group_call:user-joined", {
            callId: data.callId,
            userId: joiningUserId,
            userName: data.userName,
          });
        } catch (error) {
          console.error("group_call:join error:", error);
          socket.emit("call:unavailable", { callId: data.callId });
        }
      },
    );

    // ─── Leave a group call ─────────────────────────────────────────────
    socket.on(
      "group_call:leave",
      async (data: { callId: string; groupId: string; userId: string }) => {
        try {
          const leavingUserId = userId;

          const dbId = await redisClient.get(`groupcall:${data.callId}`);
          await redisClient.sRem(`groupcall:${data.callId}:members`, leavingUserId);
          await redisClient.hDel(`groupcall:${data.callId}:names`, leavingUserId);
          await redisClient.del(`usergroupcall:${leavingUserId}`);

          if (dbId) await groupCallService.leaveCall(dbId, leavingUserId);

          socket.to(`group:${data.groupId}`).emit("group_call:user-left", {
            callId: data.callId,
            userId: leavingUserId,
          });

          const remaining = await redisClient.sCard(`groupcall:${data.callId}:members`);
          if (remaining === 0) {
            await finalizeGroupCall(data.callId, data.groupId);
          }
        } catch (error) {
          console.error("group_call:leave error:", error);
        }
      },
    );

    // ─── WebRTC signaling relay for group calls (pairwise) ──────────────
    socket.on(
      "group_call:offer",
      (data: { callId: string; to: string; offer: unknown }) => {
        io.to(data.to).emit("group_call:offer", { ...data, from: userId });
      },
    );

    socket.on(
      "group_call:answer",
      (data: { callId: string; to: string; answer: unknown }) => {
        io.to(data.to).emit("group_call:answer", { ...data, from: userId });
      },
    );

    socket.on(
      "group_call:ice-candidate",
      (data: { callId: string; to: string; candidate: unknown }) => {
        io.to(data.to).emit("group_call:ice-candidate", { ...data, from: userId });
      },
    );

    // ─── Disconnect ───────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`❌ User disconnected: ${userId}`);

      try {
        const activeCallId = await redisClient.get(`activecall:${userId}`);
        if (activeCallId) {
          clearRingingTimer(activeCallId);
          const wasConnected = await redisClient.get(`callconnected:${activeCallId}`);
          const finalStatus = wasConnected ? "completed" : "missed";
          await finalizeCall(activeCallId, finalStatus);
          io.emit("call:ended", { callId: activeCallId });
        }
      } catch (error) {
        console.error("disconnect call cleanup error:", error);
      }

      try {
        const activeGroupCall = await redisClient.get(`usergroupcall:${userId}`);
        if (activeGroupCall) {
          const [callId, groupId] = activeGroupCall.split(":");
          await redisClient.del(`usergroupcall:${userId}`);
          await redisClient.sRem(`groupcall:${callId}:members`, userId);
          await redisClient.hDel(`groupcall:${callId}:names`, userId);

          const dbId = await redisClient.get(`groupcall:${callId}`);
          if (dbId) await groupCallService.leaveCall(dbId, userId);

          io.to(`group:${groupId}`).emit("group_call:user-left", { callId, userId });

          const remaining = await redisClient.sCard(`groupcall:${callId}:members`);
          if (remaining === 0) {
            await finalizeGroupCall(callId, groupId);
          }
        }
      } catch (error) {
        console.error("disconnect group call cleanup error:", error);
      }

      await redisClient.del(`socket:${userId}`);
      await redisClient.del(`online:${userId}`);
      await redisClient.del(`activecall:${userId}`);

      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { lastSeen });

      io.emit("user_status", { userId, online: false, lastSeen });
    });

    /* ════════════════════════════════════════════════════════════════
       ASYNC SETUP — runs after every listener above already exists.

       Nothing the client sends in this window can be dropped anymore;
       worst case a very early "group_typing" or "send_group_message"
       arrives before this user has been auto-joined into their group
       rooms via getGroupsForUser, and misses ONE broadcast to a room
       they weren't in yet. The explicit client-side "join_groups" call
       (now guaranteed to be heard, since the listener exists from the
       first tick) covers the group that's actually open in the UI.
       ════════════════════════════════════════════════════════════════ */

    (async () => {
      try {
        await redisClient.set(`socket:${userId}`, socket.id);
        await redisClient.set(`online:${userId}`, "1");

        socket.join(userId);
        io.emit("user_status", { userId, online: true, lastSeen: null });

        const userGroups = await groupService.getGroupsForUser(userId);
        userGroups.forEach((group) => {
          socket.join(`group:${group._id.toString()}`);
        });
      } catch (error) {
        console.error("connection setup error:", error);
      }
    })();
  });
};