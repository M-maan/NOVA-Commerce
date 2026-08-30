import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportingService, ReportType } from './reporting.service';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get()
  getReport(@Query('type') type: ReportType = 'sales', @Query('from') from?: string, @Query('to') to?: string) {
    return this.reporting.getReport(type, from, to);
  }
}
