import type {
  ChangeEvent,
  Dispatch,
  KeyboardEvent,
  SetStateAction,
} from "react";
import { useEffect, useRef, useState } from "react";

import { socket } from "@/socket/socket";
import type { StatusToastData } from "@/components/ui/StatusToast";
import type { ChatMessage, GroupMessage } from "../types/types";
import type { PendingAttachment } from "../utils/attachments";
import {
  canSendMessage,
  prepareOutgoingMessage,
} from "../utils/messageComposer";
import { MESSAGE_MAX_LENGTH } from "../utils/validation";
import { useMessageAttachments } from "./useMessageAttachments";
import { useTypingIndicator } from "./useTypingIndicator";

export interface MessageComposerResult {
  newMessage: string;
  pendingFiles: PendingAttachment[];
  uploading: boolean;
  uploadError: string;
  uploadProgress: Record<string, number>;
  showEmojiPicker: boolean;
  setShowEmojiPicker: Dispatch<SetStateAction<boolean>>;
  attachmentToRemove: string | null;
  setAttachmentToRemove: Dispatch<SetStateAction<string | null>>;
  toast: StatusToastData | null;
  setToast: Dispatch<SetStateAction<StatusToastData | null>>;
  canSendMessage: () => boolean;
  handleFilesSelected: (files: File[]) => void;
  removePendingAttachment: (id: string) => void;
  requestRemoveAttachment: (id: string) => void;
  insertEmoji: (emoji: string) => void;
  sendMessage: () => Promise<void>;
  handleInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  clearPendingAttachments: () => void;
  clearTypingState: () => void;
}

export interface DirectComposerTarget {
  kind: "direct";
  receiverId: string | null;
  ready: boolean;
}

export interface GroupComposerTarget {
  kind: "group";
  groupId: string;
  senderName: string;
}

interface BaseComposerParams<TMessage> {
  currentUserId: string;
  target: DirectComposerTarget | GroupComposerTarget;
  onMessageAdded: (message: TMessage) => void;
}

export interface DirectComposerParams extends BaseComposerParams<ChatMessage> {
  target: DirectComposerTarget;
}

export interface GroupComposerParams extends BaseComposerParams<GroupMessage> {
  target: GroupComposerTarget;
}

export function useMessageComposer(
  params: DirectComposerParams,
): MessageComposerResult;
export function useMessageComposer(
  params: GroupComposerParams,
): MessageComposerResult;
export function useMessageComposer(
  params: DirectComposerParams | GroupComposerParams,
): MessageComposerResult {
  const { currentUserId, target } = params;
  const onMessageAdded = params.onMessageAdded as (
    message: ChatMessage | GroupMessage,
  ) => void;

  const draftKey = target.kind === "direct" ? "direct" : target.groupId;
  const routingKey =
    target.kind === "direct" ? (target.receiverId ?? "") : target.groupId;

  const [draft, setDraft] = useState<{ key: string; text: string }>(() => ({
    key: draftKey,
    text: "",
  }));
  const newMessage = draft.key === draftKey ? draft.text : "";

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const {
    pendingFiles,
    uploading,
    uploadError,
    uploadProgress,
    attachmentToRemove,
    setAttachmentToRemove,
    toast,
    setToast,
    handleFilesSelected,
    removePendingAttachment,
    requestRemoveAttachment,
    clearPendingAttachments,
    resetAttachments,
    uploadPendingFiles,
  } = useMessageAttachments();

  const sendingRef = useRef(false);
  const previousDraftKeyRef = useRef(draftKey);

  const { clearTypingState, stopTyping, notifyTyping } = useTypingIndicator({
    routingKey,
    currentUserId,
    kind: target.kind,
    senderName: target.kind === "group" ? target.senderName : "",
    ready: target.kind === "direct" ? target.ready : true,
  });

  useEffect(() => {
    if (target.kind !== "group" || previousDraftKeyRef.current === draftKey) {
      return;
    }

    resetAttachments();
    setShowEmojiPicker(false);
    previousDraftKeyRef.current = draftKey;
  }, [draftKey, resetAttachments, target.kind]);

  function setNewMessage(value: string) {
    setDraft({ key: draftKey, text: value });
  }

  function insertEmoji(emoji: string) {
    setDraft((prev) => ({
      key: draftKey,
      text: (prev.key === draftKey ? prev.text + emoji : emoji).slice(
        0,
        MESSAGE_MAX_LENGTH,
      ),
    }));
    setShowEmojiPicker(false);
  }

  function isRecipientReady(): boolean {
    return target.kind === "direct" ? target.ready : true;
  }

  function canSend(): boolean {
    return canSendMessage({
      text: newMessage,
      hasAttachments: pendingFiles.length > 0,
      uploading,
      recipientReady: isRecipientReady(),
      currentUserId,
    });
  }

  async function sendMessage() {
    if (sendingRef.current || !canSend()) {
      return;
    }

    if (!currentUserId || !isRecipientReady()) {
      return;
    }

    sendingRef.current = true;

    const attachments = await uploadPendingFiles(
      target.kind === "direct"
        ? { kind: "direct", receiverId: target.receiverId ?? "" }
        : { kind: "group", groupId: target.groupId },
    );

    if (attachments === null) {
      sendingRef.current = false;
      return;
    }

    const { optimistic, event, payload } = prepareOutgoingMessage({
      target,
      currentUserId,
      text: newMessage,
      attachments,
    });

    stopTyping();

    onMessageAdded(optimistic);

    setNewMessage("");
    clearPendingAttachments();
    setShowEmojiPicker(false);
    sendingRef.current = false;

    socket.emit(event, payload);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setNewMessage(event.target.value.slice(0, MESSAGE_MAX_LENGTH));
    notifyTyping();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  }

  return {
    newMessage,
    pendingFiles,
    uploading,
    uploadError,
    uploadProgress,
    showEmojiPicker,
    setShowEmojiPicker,
    attachmentToRemove,
    setAttachmentToRemove,
    toast,
    setToast,
    canSendMessage: canSend,
    handleFilesSelected,
    removePendingAttachment,
    requestRemoveAttachment,
    insertEmoji,
    sendMessage,
    handleInputChange,
    handleKeyDown,
    clearPendingAttachments,
    clearTypingState,
  };
}
