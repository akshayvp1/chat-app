import axios from "axios";

export const getErrorMessage = (
  error: unknown,
  defaultMessage: string
): string => {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string })?.message ??
      defaultMessage
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return defaultMessage;
};