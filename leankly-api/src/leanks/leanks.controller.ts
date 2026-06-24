import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/auth.decorators";
import { CreateLeankDto, UpdateLeankDto } from "./dto/create-leank.dto";
import { FeedQueryDto } from "./dto/feed-query.dto";
import { PaginationQueryDto } from "./dto/pagination-query.dto";
import { LeanksService } from "./leanks.service";

@Controller("v1/leanks")
export class LeanksController {
  constructor(private readonly leanks: LeanksService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() input: CreateLeankDto) {
    return this.leanks.create(user, input);
  }

  @Get("feed")
  feed(@CurrentUser() user: User, @Query() query: FeedQueryDto) {
    return this.leanks.feed(user, query);
  }

  @Get("hosted")
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  hosted(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return this.leanks.hosted(user, query);
  }

  @Get("attended")
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  attended(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return this.leanks.attended(user, query);
  }

  @Get("profile-counts")
  profileCounts(@CurrentUser() user: User) {
    return this.leanks.profileCounts(user);
  }

  @Get("chats")
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  chats(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return this.leanks.chats(user, query);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.leanks.getById(id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() input: UpdateLeankDto,
  ) {
    return this.leanks.update(user, id, input);
  }

  @Post(":id/close")
  close(@CurrentUser() user: User, @Param("id") id: string) {
    return this.leanks.close(user, id);
  }
}
