import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, ID, Messaging } from "node-appwrite";
import { PushJobData } from "../jobs/push.types";

@Injectable()
export class AppwriteAdminService {
  private readonly messaging: Messaging;

  constructor(config: ConfigService) {
    const client = new Client()
      .setEndpoint(config.getOrThrow<string>("APPWRITE_ENDPOINT"))
      .setProject(config.getOrThrow<string>("APPWRITE_PROJECT_ID"))
      .setKey(config.getOrThrow<string>("APPWRITE_API_KEY"));
    this.messaging = new Messaging(client);
  }

  sendPush(input: PushJobData) {
    return this.messaging.createPush({
      messageId: ID.unique(),
      users: input.recipients,
      title: input.title,
      body: input.body,
      data: input.data,
      badge: input.badge,
      image: input.image,
      sound: "default",
    });
  }
}
