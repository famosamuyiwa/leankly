import { Body, Controller, Delete, Get, Patch } from "@nestjs/common";
import { User } from "@prisma/client";
import { AllowUnverified, CurrentUser } from "../auth/auth.decorators";
import { UpdatePushTargetDto } from "./dto/update-push-target.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("v1/users/me")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @AllowUnverified()
  getMe(@CurrentUser() user: User) {
    return this.users.getProfile(user);
  }

  @Patch()
  updateMe(@CurrentUser() user: User, @Body() input: UpdateUserDto) {
    return this.users.updateProfile(user, input);
  }

  @Patch("push-token")
  updatePushTarget(
    @CurrentUser() user: User,
    @Body() input: UpdatePushTargetDto,
  ) {
    return this.users.updatePushTarget(user, input);
  }

  @Delete()
  deleteMe(@CurrentUser() user: User) {
    return this.users.deleteProfile(user);
  }
}
