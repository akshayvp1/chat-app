import "reflect-metadata"
import { container } from "tsyringe";
//models
import {User} from "../models/userModels"
//controllers
import UserAuthController from "../controllers/userAuthController"
//services
import UserAuthService from "../services/userAuthService"
//repositories
import UserAuthRepository from "../repositories/userAuthRepository"

//models
container.register("User",{useValue: User})
//controllers
container.register("UserAuthController",{useClass:UserAuthController})
//services
container.register("UserAuthService",{useClass:UserAuthService})
//repositories
container.register("UserAuthRepository",{useClass:UserAuthRepository})

export default container;
