import { RequestError } from "./errors";
import { boundedString } from "./fields";

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);
}

export function requireObjectId(value: unknown, field: string): string {
  if (!isObjectId(value)) {
    throw new RequestError(`Invalid ${field}`);
  }
  return value;
}

export function requireObjectIds(value: unknown, field: string, maxItems = 100): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
    throw new RequestError(`Invalid ${field}`);
  }
  return value.map((item) => requireObjectId(item, field));
}

export function requireStringArray(
  value: unknown,
  field: string,
  maxItems: number,
  maxLength = 200
): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
    throw new RequestError(`Invalid ${field}`);
  }
  return value.map((item) => boundedString(item, field, 1, maxLength));
}

export function requireCallType(value: unknown): "audio" | "video" {
  if (value !== "audio" && value !== "video") {
    throw new RequestError("Invalid call type");
  }
  return value;
}

export function requireCallId(value: unknown): string {
  const callId = boundedString(value, "Call ID", 1, 100);
  if (!/^[a-zA-Z0-9_-]+$/.test(callId)) {
    throw new RequestError("Invalid call ID");
  }
  return callId;
}

export function optionalTempId(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 100) {
    return undefined;
  }
  return value;
}

export function idToString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const nested = "_id" in value ? (value as { _id: unknown })._id : undefined;
    if (nested && nested !== value) {
      const nestedId = idToString(nested);
      if (nestedId) return nestedId;
    }
    return String(value);
  }
  return undefined;
}

export function isGroupMember(
  group: { admin: unknown; members: unknown[] } | null | undefined,
  userId: string
): boolean {
  if (!group) return false;
  if (idToString(group.admin) === userId) return true;
  return group.members.some((member) => idToString(member) === userId);
}
