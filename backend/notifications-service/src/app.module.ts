import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MailerConfigModule } from './mailer/mailer.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { TutorialSubscriptionModule } from './tutorial-subscription/tutorial-subscription.module';

@Module({
  imports: [
    MailerConfigModule,
    ConfigModule.forRoot(),
    DatabaseModule,
    TutorialSubscriptionModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
