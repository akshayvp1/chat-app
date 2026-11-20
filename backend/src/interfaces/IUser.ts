export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  profile?: string;
  bio?: string;
  lastSeen?: Date | null;
}

export interface ProfileUpdate {
  name?: string;
  profile?: string;
  bio?: string;
}

/**
 * A user as safe to leave the service layer: the password hash must never
 * reach a controller response, a repository return value or a socket payload.
 */
export type PublicUser = Omit<IUser, "password">;
