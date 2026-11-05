import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRefreshToken } from './user-refresh-token.entity';
import { RefreshTokenService } from './refresh-token.service';

/**
 * Standalone so that both AuthModule (issue/rotate) and UserModule (revoke on
 * password reset) can depend on it without creating a circular import.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserRefreshToken])],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
