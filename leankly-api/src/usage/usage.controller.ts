import { Controller, Get } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/auth.decorators";
import { UsageService } from "./usage.service";

@Controller("v1/users/me")
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get("usage")
  getUsage(@CurrentUser() user: User) {
    return this.usage.getUsage(user);
  }

  @Get("entitlements")
  getEntitlements(@CurrentUser() user: User) {
    return this.usage.getEntitlements(user);
  }
}
