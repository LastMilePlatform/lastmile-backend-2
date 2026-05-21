import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getTypeOrmConfig } from './config/database.config';
import { validateEnv } from './config/env.validation';
import { RequestSigningGuard } from './guards/request-signing.guard';
import { AuthModule } from './modules/auth/auth.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { ProductsModule } from './modules/products/products.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatModule } from './modules/chat/chat.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { HttpMetricsMiddleware } from './modules/metrics/http-metrics.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    AuctionsModule,
    ProductsModule,
    LogisticsModule,
    NotificationsModule,
    ChatModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: RequestSigningGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
