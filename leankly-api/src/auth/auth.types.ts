import { Models } from "node-appwrite";
import { User } from "@prisma/client";

export type AppwriteIdentity = Models.User<Models.Preferences>;

declare global {
  namespace Express {
    interface Request {
      appwriteIdentity: AppwriteIdentity;
      currentUser: User;
    }
  }
}
