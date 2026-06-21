import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { LeanksController } from "./leanks.controller";
import { LeanksService } from "./leanks.service";

@Module({
  imports: [MediaModule],
  controllers: [LeanksController],
  providers: [LeanksService],
  exports: [LeanksService],
})
export class LeanksModule {}
