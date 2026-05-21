import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { TokenService } from './services/token.service';
import { User } from '../users/entities/user.entity';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MetricsModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AuthGuard],
  exports: [TokenService, AuthGuard],
})
export class AuthModule {}
