import { IUser, ProfileUpdate, PublicUser } from "../../interfaces/IUser";

export interface IUserAuthRepository {
  findByEmail(email: string): Promise<IUser | null>;

  createUser(userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<IUser>;

  findById(id: string): Promise<IUser | null>;

  updatePassword(
    userId: string,
    password: string
  ): Promise<IUser | null>;

  updateProfile(
    userId: string,
    updates: ProfileUpdate
  ): Promise<PublicUser | null>;

  getUsers(currentUserId: string): Promise<PublicUser[]>;
}
