import { Schema, model } from "mongoose";
import { IUser } from "../interfaces/IUser";

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile: { type: String },
  bio: { type: String, default: "" },
  lastSeen: { type: Date, default: null },
});

// Never serialize the password hash — applies to res.json(), JSON.stringify()
// and any socket payload built from a user document.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete (ret as unknown as Record<string, unknown>).password;
    return ret;
  },
});

export const User = model<IUser>("User", userSchema);