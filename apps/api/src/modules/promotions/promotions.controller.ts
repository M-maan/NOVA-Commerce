import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PromotionsService } from './promotions.service';
@Controller('admin/promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class PromotionsController { constructor(private readonly promotions: PromotionsService) {} @Get() list() { return this.promotions.list(); } @Patch(':id/status') status(@Param('id') id: string, @Body() body: { status: 'ACTIVE' | 'INACTIVE' }) { return this.promotions.toggle(id, body.status); } }
