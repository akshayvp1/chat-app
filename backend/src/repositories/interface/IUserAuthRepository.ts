import { IUser } from "../../interfaces/IUser";

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

  getUsers(currentUserId: string): Promise<IUser[]>;
}