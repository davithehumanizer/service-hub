import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { YoutubeAdapterService } from "./youtube-adapter.service";

@Controller()
export class YoutubeAdapterController {
  constructor(private readonly youtubeAdapterService: YoutubeAdapterService) {}

  @MessagePattern({ cmd: "search-videos-youtube" })
  searchRepairVideos(@Payload() data: { query: string }) {
    const { query } = data;
    return this.youtubeAdapterService.searchRepairVideos(query);
  }
}
