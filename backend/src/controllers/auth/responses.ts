import { Response } from "express";
import { getPublicErrorMessage, RequestError } from "../../utils/validation";
import { PublicUser } from "../../interfaces/IUser";

export const sendJsonSuccess = (res: Response, payload: object): Response =>
  res.status(200).json(payload);

export const sendAuthSuccess = (
  res: Response,
  message: string,
  user: PublicUser
): Response => sendJsonSuccess(res, { message, user });

export const sendMessageResponse = (
  res: Response,
  status: number,
  message: string
): Response => res.status(status).json({ message });

export const sendPublicFailure = (
  res: Response,
  error: unknown,
  fallback: string,
  fallbackStatus: number,
  allowedMessages: readonly string[] = [],
  publicStatus = 400
): Response => {
  const message = getPublicErrorMessage(error, fallback, allowedMessages);
  return sendMessageResponse(
    res,
    message === fallback ? fallbackStatus : publicStatus,
    message
  );
};

export const sendFixedFailure = (
  res: Response,
  status: number,
  error: unknown,
  fallback: string,
  allowedMessages: readonly string[] = []
): Response =>
  sendMessageResponse(
    res,
    status,
    getPublicErrorMessage(error, fallback, allowedMessages)
  );

export const sendRequestError = (res: Response, error: RequestError): Response =>
  sendMessageResponse(res, error.status, error.message);

export const sendInvalidCredentials = (res: Response, error: unknown): Response =>
  sendMessageResponse(
    res,
    401,
    getPublicErrorMessage(error, "Invalid email or password", ["Invalid credentials"])
  );

export const sendUpdateProfileFailure = (res: Response, error: unknown): Response =>
  res.status(error instanceof RequestError ? error.status : 500).json({
    success: false,
    message: getPublicErrorMessage(error, "Failed to update profile"),
  });

export const sendUnauthorized = (res: Response): Response =>
  res.status(401).json({ success: false, message: "Unauthorized" });
