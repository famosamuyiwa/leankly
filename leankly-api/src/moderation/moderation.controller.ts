import { Body, Controller, Get, Post } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/auth.decorators";
import { CreateBlockDto } from "./dto/create-block.dto";
import { CreateReportDto } from "./dto/create-report.dto";
import { ModerationService } from "./moderation.service";

@Controller("v1")
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get("blocks")
  listBlocks(@CurrentUser() user: User) {
    return this.moderation.listBlocks(user);
  }

  @Post("blocks")
  block(@CurrentUser() user: User, @Body() input: CreateBlockDto) {
    return this.moderation.block(user, input.blockedId);
  }

  @Post("reports")
  report(@CurrentUser() user: User, @Body() input: CreateReportDto) {
    return this.moderation.report(user, input);
  }
}
