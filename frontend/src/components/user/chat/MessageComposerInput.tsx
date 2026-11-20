import { Send, Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND_COLOR } from "../../../constants/brand";
import type { MessageComposerResult } from "../../../hooks/useMessageComposer";
import { MESSAGE_MAX_LENGTH } from "../../../utils/validation";
import AttachmentMenu from "../AttachmentMenu";
import EmojiPicker from "../EmojiPicker";
import AttachmentSection from "./AttachmentSection";

interface MessageComposerInputProps {
  composer: MessageComposerResult;
  placeholder: string;
  ariaLabel: string;
}

export default function MessageComposerInput({
  composer,
  placeholder,
  ariaLabel,
}: MessageComposerInputProps) {
  const canSend = composer.canSendMessage();

  return (
    <div className="border-t border-border bg-card px-3 py-3 dark:border-border sm:px-4">
      <AttachmentSection
        attachments={composer.pendingFiles}
        uploading={composer.uploading}
        uploadError={composer.uploadError}
        progressByFileId={composer.uploadProgress}
        onRemove={composer.requestRemoveAttachment}
      />

      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <AttachmentMenu
          disabled={composer.uploading}
          onFiles={composer.handleFilesSelected}
        />

        <div className="relative min-w-0 flex-1">
          <Input
            type="text"
            placeholder={placeholder}
            value={composer.newMessage}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={composer.handleInputChange}
            onKeyDown={composer.handleKeyDown}
            aria-label={ariaLabel}
            className="bg-muted/60 pr-10 text-sm"
          />

          <button
            type="button"
            onClick={() =>
              composer.setShowEmojiPicker((open) => !open)
            }
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            title="Emoji picker"
            aria-label="Open emoji picker"
            aria-expanded={composer.showEmojiPicker}
          >
            <Smile className="h-4 w-4" />
          </button>

          {composer.showEmojiPicker && (
            <EmojiPicker
              onSelect={composer.insertEmoji}
              onClose={() => composer.setShowEmojiPicker(false)}
            />
          )}
        </div>

        <Button
          type="button"
          onClick={composer.sendMessage}
          disabled={!canSend}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          style={{
            backgroundColor: BRAND_COLOR,
            opacity: canSend ? 1 : 0.6,
          }}
          title="Send message"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
