import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

type DependencyStatus = 'up' | 'down';

@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const healthy = database.status === 'up' && redis.status === 'up';
    const payload = {
      status: healthy ? 'ok' : 'degraded',
      service: 'nova-api',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: { database, redis },
    };
    if (!healthy) throw new HttpException(payload, HttpStatus.SERVICE_UNAVAILABLE);
    return payload;
  }

  @Get('ready')
  async ready() {
    return this.check();
  }

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'nova-api',
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  metrics() {
    const memory = process.memoryUsage();
    return {
      service: 'nova-api',
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<{ status: DependencyStatus; latencyMs: number; error?: string }> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { status: 'down', latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Database check failed' };
    }
  }

  private async checkRedis(): Promise<{ status: DependencyStatus; latencyMs: number; error?: string }> {
    const startedAt = Date.now();
    try {
      await this.redis.client.ping();
      return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { status: 'down', latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Redis check failed' };
    }
  }
}
