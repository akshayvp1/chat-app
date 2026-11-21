import { Server, Socket } from "socket.io";
import { authenticateSocket } from "./auth";
import { finalizeCall } from "./registrations/directCallFinalize";
import { registerDirectCallListeners } from "./registrations/directCalls";
import { registerDisconnectCleanup } from "./registrations/disconnect";
import {
  finalizeGroupCall,
  registerGroupCallListeners,
} from "./registrations/groupCalls";
import { registerMessageListeners } from "./registrations/messages";
import { joinPresence } from "./presence";
import { DirectCallStatus } from "./state";
import { registerTypingListeners } from "./typing";

export const initializeSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    const authenticated = authenticateSocket(socket);
    if (!authenticated) return;

    const { userId, services } = authenticated;
    const { chatService, groupService, callService, groupCallService } = services;

    console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);

    socket.join(userId);

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

    registerMessageListeners(io, socket, userId, chatService, groupService);
    registerTypingListeners(io, socket, userId, groupService);
    registerDirectCallListeners(io, socket, userId, chatService, callService);
    registerGroupCallListeners(io, socket, userId, groupService, groupCallService);
    registerDisconnectCleanup(io, socket, userId, {
      groupCallService,
      finalizeCall: (
        callId: string,
        status: DirectCallStatus,
        originSocketId?: string,
        actorId?: string,
      ) =>
        finalizeCall(
          io,
          callService,
          chatService,
          callId,
          status,
          originSocketId,
          actorId,
        ),
      finalizeGroupCall: (callId: string, groupId: string) =>
        finalizeGroupCall(io, groupCallService, groupService, callId, groupId),
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
      await joinPresence(io, userId, socket.id);

      try {
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
