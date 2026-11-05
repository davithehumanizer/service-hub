import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SparePartsAdapterModule } from "./spare-parts/spare-parts.module";

@Module({
  imports: [ConfigModule.forRoot(), SparePartsAdapterModule],
})
export class AppModule {}
