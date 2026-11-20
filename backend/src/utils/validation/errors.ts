export class RequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

export function getPublicErrorMessage(
  error: unknown,
  fallback: string,
  allowedMessages: readonly string[] = []
): string {
  if (error instanceof RequestError) return error.message;
  if (error instanceof Error && allowedMessages.includes(error.message)) {
    return error.message;
  }
  return fallback;
}
