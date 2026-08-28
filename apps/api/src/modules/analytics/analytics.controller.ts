import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get('dashboard') dashboard() { return this.analytics.dashboard(); }
  @Get('analytics/sales') sales(@Query('from') from?: string, @Query('to') to?: string) { return this.analytics.sales(from, to); }
  @Get('analytics/products') products() { return this.analytics.products(); }
  @Get('analytics/customers') customers() { return this.analytics.customers(); }
  @Get('analytics/inventory') inventory() { return this.analytics.inventory(); }
}
