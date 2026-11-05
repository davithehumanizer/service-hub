import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { YoutubeAdapterService } from "./youtube-adapter.service";
import { YoutubeAdapterController } from "./youtube-adapter.controller";

@Module({
  imports: [HttpModule],
  controllers: [YoutubeAdapterController],
  providers: [YoutubeAdapterService],
  exports: [YoutubeAdapterService],
})
export class YoutubeAdapterModule {}
