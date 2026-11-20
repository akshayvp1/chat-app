import type {
  ChatMessage,
  GroupMessage,
  MessageAttachment,
} from "../types/types";
import type { PendingAttachment } from "./attachments";
import { createTempId, normalizeText, validateMessageText } from "./validation";

interface CanSendParams {
  text: string;
  hasAttachments: boolean;
  uploading: boolean;
  recipientReady: boolean;
  currentUserId: string;
}

type OutgoingTarget =
  | { kind: "direct"; receiverId: string | null }
  | { kind: "group"; groupId: string; senderName: string };

export function canSendMessage({
  text,
  hasAttachments,
  uploading,
  recipientReady,
  currentUserId,
}: CanSendParams): boolean {
  const normalizedText = normalizeText(text);
  const textValid =
    normalizedText.length === 0 || validateMessageText(text) === null;

  return (
    recipientReady &&
    !!currentUserId &&
    !uploading &&
    textValid &&
    (normalizedText.length > 0 || hasAttachments)
  );
}

export function validateComposerFiles(
  validate: (files: File[]) => string | null,
  pendingFiles: PendingAttachment[],
  files: File[],
): string | null {
  return validate([
    ...pendingFiles.map((item) => item.file),
    ...files,
  ]);
}

export function buildOptimisticDirectMessage({
  text,
  currentUserId,
  receiverId,
  attachments,
}: {
  text: string;
  currentUserId: string;
  receiverId: string;
  attachments: MessageAttachment[];
}): ChatMessage {
  const normalizedText = normalizeText(text);
  const tempId = createTempId("temp");

  return {
    _id: tempId,
    tempId,
    senderId: currentUserId,
    receiverId,
    text: normalizedText,
    type: "text",
    attachments: attachments.length > 0 ? attachments : undefined,
    seen: false,
    createdAt: new Date().toISOString(),
    status: "sent",
  };
}

export function buildOptimisticGroupMessage({
  text,
  currentUserId,
  currentUserName,
  groupId,
  attachments,
}: {
  text: string;
  currentUserId: string;
  currentUserName: string;
  groupId: string;
  attachments: MessageAttachment[];
}): GroupMessage {
  const normalizedText = normalizeText(text);
  const tempId = createTempId("temp");

  return {
    _id: tempId,
    tempId,
    groupId,
    senderId: currentUserId,
    senderName: currentUserName,
    text: normalizedText,
    type: "text",
    attachments: attachments.length > 0 ? attachments : undefined,
    seenBy: [currentUserId],
    createdAt: new Date().toISOString(),
    status: "sent",
  };
}

export function prepareOutgoingMessage({
  target,
  currentUserId,
  text,
  attachments,
}: {
  target: OutgoingTarget;
  currentUserId: string;
  text: string;
  attachments: MessageAttachment[];
}) {
  const optimistic =
    target.kind === "direct"
      ? buildOptimisticDirectMessage({
          text,
          currentUserId,
          receiverId: target.receiverId ?? "",
          attachments,
        })
      : buildOptimisticGroupMessage({
          text,
          currentUserId,
          currentUserName: target.senderName,
          groupId: target.groupId,
          attachments,
        });

  const tempId = optimistic.tempId ?? optimistic._id;
  const attachmentPayload = attachments.length > 0 ? { attachments } : {};

  if (target.kind === "direct") {
    return {
      optimistic,
      event: "send_message" as const,
      payload: {
        senderId: currentUserId,
        receiverId: target.receiverId ?? "",
        text: optimistic.text,
        tempId,
        ...attachmentPayload,
      },
    };
  }

  return {
    optimistic,
    event: "send_group_message" as const,
    payload: {
      groupId: target.groupId,
      senderId: currentUserId,
      senderName: (optimistic as GroupMessage).senderName,
      text: optimistic.text,
      tempId,
      ...attachmentPayload,
    },
  };
}
