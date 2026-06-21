import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/auth.decorators";
import { AdminService } from "./admin.service";
import { SuspendUserDto } from "./dto/suspend-user.dto";

@Roles(UserRole.ADMIN)
@Controller("v1/admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("reports")
  reports() {
    return this.admin.reports();
  }

  @Patch("users/:id/suspension")
  suspend(@Param("id") id: string, @Body() input: SuspendUserDto) {
    return this.admin.suspend(id, input.suspended);
  }
}
