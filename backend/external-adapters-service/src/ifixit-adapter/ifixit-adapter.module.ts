import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { IfixitAdapterService } from "./ifixit-adapter.service";
import { IfixitAdapterController } from "./ifixit-adapter.controller";

@Module({
  imports: [HttpModule],
  controllers: [IfixitAdapterController],
  providers: [IfixitAdapterService],
  exports: [IfixitAdapterService],
})
export class IfixitAdapterModule {}
