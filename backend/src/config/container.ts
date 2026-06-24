import "reflect-metadata"
import { container } from "tsyringe";
//models
import {User} from "../models/userModels"
import Message from "../models/Message"
//controllers
import UserAuthController from "../controllers/userAuthController"
import ChatController from "../controllers/chatController";
//services
import UserAuthService from "../services/userAuthService"
import ChatService from "../services/chatService";
//repositories
import UserAuthRepository from "../repositories/userAuthRepository"
import ChatRepository from "../repositories/chatRepository";

//models
container.register("User",{useValue: User})
container.register("Message",{useValue:Message})
//controllers
container.register("UserAuthController",{useClass:UserAuthController})
container.register("ChatController",{useClass:ChatController})
//services
container.register("UserAuthService",{useClass:UserAuthService})
container.register("ChatService",{useClass:ChatService})
//repositories
container.register("UserAuthRepository",{useClass:UserAuthRepository})
container.register("ChatRepository",{useClass:ChatRepository})

export default container;
