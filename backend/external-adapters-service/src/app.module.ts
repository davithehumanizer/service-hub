import { Module } from "@nestjs/common";
import { FixometerAdapterModule } from "./fixometer-adapter/fixometer-adapter.module";
import { IfixitAdapterModule } from "./ifixit-adapter/ifixit-adapter.module";
import { YoutubeAdapterModule } from "./youtube-adapter/youtube-adapter.module";

@Module({
  imports: [FixometerAdapterModule, IfixitAdapterModule, YoutubeAdapterModule],
})
export class AppModule {}
