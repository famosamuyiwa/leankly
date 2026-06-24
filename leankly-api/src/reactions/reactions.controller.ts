import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/auth.decorators";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { CreateReactionDto } from "./dto/create-reaction.dto";
import { ReactionsService } from "./reactions.service";

@Controller("v1")
export class ReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

  @Post("reactions")
  react(@CurrentUser() user: User, @Body() input: CreateReactionDto) {
    return this.reactions.react(user, input);
  }

  @Delete("reactions/:leankId")
  undo(@CurrentUser() user: User, @Param("leankId") leankId: string) {
    return this.reactions.undo(user, leankId);
  }

  @Get("reactions/requests")
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  requests(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return this.reactions.requests(user, query);
  }

  @Post("reactions/:id/accept")
  accept(@CurrentUser() user: User, @Param("id") id: string) {
    return this.reactions.accept(user, id);
  }

  @Post("reactions/:id/decline")
  decline(@CurrentUser() user: User, @Param("id") id: string) {
    return this.reactions.decline(user, id);
  }

  @Get("leanks/:id/participants")
  participants(@CurrentUser() user: User, @Param("id") id: string) {
    return this.reactions.participants(user, id);
  }

  @Post("leanks/:id/leave")
  leave(@CurrentUser() user: User, @Param("id") id: string) {
    return this.reactions.leave(user, id);
  }

  @Delete("leanks/:id/participants/:userId")
  remove(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Param("userId") userId: string,
  ) {
    return this.reactions.remove(user, id, userId);
  }
}
