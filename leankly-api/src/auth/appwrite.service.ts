import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Account, Client } from "node-appwrite";
import { AppwriteIdentity } from "./auth.types";

@Injectable()
export class AppwriteService {
  constructor(private readonly config: ConfigService) {}

  async verifyJwt(jwt: string): Promise<AppwriteIdentity> {
    const client = new Client()
      .setEndpoint(this.config.getOrThrow<string>("APPWRITE_ENDPOINT"))
      .setProject(this.config.getOrThrow<string>("APPWRITE_PROJECT_ID"))
      .setJWT(jwt);
    return new Account(client).get();
  }
}
