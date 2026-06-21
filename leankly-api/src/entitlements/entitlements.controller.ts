import { Controller, Get } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/auth.decorators";
import { EntitlementsService } from "./entitlements.service";

@Controller("v1/entitlements")
export class EntitlementsController {
  constructor(private readonly entitlements: EntitlementsService) {}

  @Get("me")
  get(@CurrentUser() user: User) {
    return this.entitlements.get(user);
  }
}
