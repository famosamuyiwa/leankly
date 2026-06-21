import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/auth.decorators";
import { MessagesQueryDto } from "./dto/messages-query.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { MessagesService } from "./messages.service";

@Controller("v1")
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get("leanks/:id/messages")
  list(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.messages.list(user, id, query);
  }

  @Post("leanks/:id/messages")
  send(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() input: SendMessageDto,
  ) {
    return this.messages.send(user, id, input);
  }

  @Patch("leanks/:id/read")
  markRead(@CurrentUser() user: User, @Param("id") id: string) {
    return this.messages.markRead(user, id);
  }

  @Get("users/me/unread-count")
  unread(@CurrentUser() user: User) {
    return this.messages.unreadCount(user);
  }
}
