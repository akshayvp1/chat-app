import "reflect-metadata"
import { container } from "tsyringe";
//models
import {User} from "../models/userModels"
import Message from "../models/Message"
import Group from "../models/Group";
import GroupMessage from "../models/GroupMessage";
import CallLogModel from "../models/callLogModel";
//controllers
import UserAuthController from "../controllers/userAuthController"
import ChatController from "../controllers/chatController";
import GroupController from "../controllers/groupController";
//services
import UserAuthService from "../services/userAuthService"
import ChatService from "../services/chatService";
import GroupService from "../services/groupService";
//repositories
import UserAuthRepository from "../repositories/userAuthRepository"
import ChatRepository from "../repositories/chatRepository";
import GroupRepository from "../repositories/groupRepository";
import CallController from "../controllers/callController";
import CallService from "../services/callService";
import CallRepository from "../repositories/callRepository";

//models
container.register("User",{useValue: User})
container.register("Message",{useValue:Message})
container.register("Group", { useValue: Group });
container.register("GroupMessage", { useValue: GroupMessage });
container.register("CallLog", { useValue: CallLogModel });
//controllers
container.register("UserAuthController",{useClass:UserAuthController})
container.register("ChatController",{useClass:ChatController})
container.register("GroupController", { useClass: GroupController });
container.register("CallController", { useClass: CallController });
//services
container.register("UserAuthService",{useClass:UserAuthService})
container.register("ChatService",{useClass:ChatService})
container.register("GroupService", { useClass: GroupService });
container.register("CallService", { useClass: CallService });
//repositories
container.register("UserAuthRepository",{useClass:UserAuthRepository})
container.register("ChatRepository",{useClass:ChatRepository})
container.register("GroupRepository", { useClass: GroupRepository });
container.register("CallRepository", { useClass: CallRepository });


export default container;
