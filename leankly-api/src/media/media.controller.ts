import { Body, Controller, Post } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/auth.decorators";
import { ConfirmMediaDto } from "./dto/confirm-media.dto";
import { MediaService } from "./media.service";

@Controller("v1/media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post("confirm")
  confirm(@CurrentUser() user: User, @Body() input: ConfirmMediaDto) {
    return this.media.confirm(user, input);
  }
}
