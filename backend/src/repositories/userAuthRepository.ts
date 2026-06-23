import { injectable } from "tsyringe";
import { IUserAuthRepository } from "../repositories/interface/IUserAuthRepository";
import { IUser } from "../interfaces/IUser";
import { User } from "../models/userModels";

@injectable()
class UserAuthRepository implements IUserAuthRepository {
  private readonly UserModel = User;

//   async register(
//     name: string,
//     email: string,
//     phone: string,
//     password: string
//   ): Promise<IUser> {
//     console.log("repository");
//     try {
//       const user = new this.UserModel({
//         name,
//         email,
//         phone,
//         password,
//       });

//       await user.save();

//       return user;
//     } catch (error) {
//       throw error;
//     }
//   }
  async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await this.UserModel.findOne({ email });
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
    console.log("repository")
  return await this.UserModel.findByIdAndUpdate(
    userId,
    {
      password,
    }
  );
};

 getUsers = async (
    currentUserId: string
  ) => {

    const users = await User.find(
      {
        _id: { $ne: currentUserId }
      },
      {
        password: 0
      }
    );

    return users;
  };

}

export default UserAuthRepository;