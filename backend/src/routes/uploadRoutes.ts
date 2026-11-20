import express from "express";
import { container } from "tsyringe";
import UploadController from "../controllers/uploadController";
import { authMiddleware } from "../middleware/authMiddleware";
import { createUploadMiddleware, runUpload } from "../config/uploads";

const upload = express.Router();

const uploadController = container.resolve(UploadController);

upload.post(
  "/profile",
  authMiddleware,
  runUpload(createUploadMiddleware("profile"), "profile"),
  uploadController.uploadProfileImage
);

upload.post(
  "/message",
  authMiddleware,
  runUpload(createUploadMiddleware("message"), "message"),
  uploadController.uploadMessageAttachments
);

export default upload;
