import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomersService } from './customers.service';

@Controller('admin/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}
  @Get() list(@Query('q') q?: string) { return this.customers.list(q); }
  @Get(':id') get(@Param('id') id: string) { return this.customers.get(id); }
}
