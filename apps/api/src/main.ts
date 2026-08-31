import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const webOrigins = config
    .getOrThrow<string>('WEB_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cookieParser());
  app.enableCors({ origin: webOrigins, credentials: true });
  app.setGlobalPrefix(config.getOrThrow('API_PREFIX'));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
  logger.log(`NOVA API listening on port ${port}`);
}
void bootstrap();
