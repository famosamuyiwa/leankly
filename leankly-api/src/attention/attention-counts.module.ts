import { Global, Module } from "@nestjs/common";
import { AttentionCountsService } from "./attention-counts.service";

@Global()
@Module({
  providers: [AttentionCountsService],
  exports: [AttentionCountsService],
})
export class AttentionCountsModule {}
