import { Body, Controller, Get, Patch } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser, Permissions } from "../auth/auth.decorators";
import { UserPermission } from "../auth/permissions";
import { SetDeveloperModeDto } from "./dto/set-developer-mode.dto";
import { EntitlementsService } from "./entitlements.service";

@Controller("v1/entitlements")
export class EntitlementsController {
  constructor(private readonly entitlements: EntitlementsService) {}

  @Get("me")
  get(@CurrentUser() user: User) {
    return this.entitlements.get(user);
  }

  @Patch("me/developer-mode")
  @Permissions(UserPermission.LEANKLY_PLUS_BYPASS)
  setDeveloperMode(
    @CurrentUser() user: User,
    @Body() input: SetDeveloperModeDto,
  ) {
    return this.entitlements.setDeveloperMode(user, input.enabled);
  }
}
