import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const config = app.get(ConfigService);
  const webOrigins = config
    .getOrThrow<string>('WEB_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: webOrigins, credentials: true });
  app.setGlobalPrefix(config.getOrThrow('API_PREFIX'));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(config.getOrThrow<number>('PORT'));
}
void bootstrap();
