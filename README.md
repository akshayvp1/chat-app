# ChatApp

A real-time chat app with one-to-one chat, group chat, calls, and file sharing.

## Local development

### Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

Set environment variables in `backend/.env` (see `backend/.env.example`):

- `PORT`, `CLIENT_URL`, `MONGO_URI`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_EXPIRES`, `REFRESH_TOKEN_EXPIRES`
- `EMAIL_USER`, `EMAIL_PASS`
- `REDIS_HOST`, `REDIS_PORT`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (required for file/profile uploads)

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

`frontend/.env`:

- `VITE_API_BASE_URL=http://localhost:3000/api`
- `VITE_SOCKET_URL=http://localhost:3000`

## File uploads (Cloudinary)

- Authenticated uploads go through backend endpoints: `POST /api/upload/profile` and `POST /api/upload/message`.
- Message uploads require a `receiverId` (1:1 chat) or `groupId` (group chat), which are validated on the backend before uploading.
- Files are uploaded server-side to Cloudinary; the backend returns/saves attachment metadata (URL, public ID, resource type, MIME type, file name, size/format).
- Profile images: JPG/PNG/GIF/WebP/AVIF, max 5MB. Message attachments (images, video, audio, documents): max 25MB each, up to 5 per message.
- Uploaded messages are sent via existing Socket.IO events and persisted in MongoDB, so they appear immediately and after refresh.

## Deployment

- Set `CLIENT_URL` and all backend secrets (including Cloudinary credentials) in your deployment environment.
- Set frontend `VITE_API_BASE_URL=https://<backend>/api` and `VITE_SOCKET_URL=https://<backend>`.
- No persistent local disk is required for Cloudinary uploads.
