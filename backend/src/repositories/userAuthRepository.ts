import { Model } from "mongoose";
import { injectable } from "tsyringe";
import { IUserAuthRepository } from "../repositories/interface/IUserAuthRepository";
import { IUser, ProfileUpdate } from "../interfaces/IUser";
import { User } from "../models/userModels";

@injectable()
class UserAuthRepository implements IUserAuthRepository {
  private readonly UserModel: Model<IUser> = User;

  async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await this.UserModel.findOne({ email }).collation({ locale: "en", strength: 2 });
    } catch (error) {
      throw error;
    }
  }
  async createUser(userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<IUser> {
    try {
      const user = new this.UserModel(userData);
      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }

  findById = async (
  id: string
): Promise<IUser | null> => {
  return await this.UserModel.findById(id);
};


updatePassword = async (
  userId: string,
  password: string
) => {
  return await this.UserModel.findByIdAndUpdate(
    userId,
    {
      password,
    }
  );
};

  updateProfile = async (
    userId: string,
    updates: ProfileUpdate
  ): Promise<IUser | null> => {
    return await this.UserModel.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");
  };

  getUsers = async (currentUserId: string) => {
  const users = await User.find(
    { _id: { $ne: currentUserId } },
    { password: 0 }  
  );
  return users;
};

}

export default UserAuthRepository;