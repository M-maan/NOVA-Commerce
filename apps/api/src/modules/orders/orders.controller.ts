import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrderStatus, ReturnStatus, Role, ShipmentStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { OrdersService } from './orders.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders') list(@CurrentUser() user: AuthUser) { return this.orders.listMine(user.id); }
  @Get('orders/:id') get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.orders.getMine(user.id, id); }
  @Get('orders/:id/invoice') invoice(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.orders.invoice(user.id, id); }
  @Post('orders/:id/cancel') cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.orders.cancel(user.id, id, body.reason); }
  @Post('orders/:id/returns') returnRequest(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { reason: string; notes?: string }) { return this.orders.createReturn(user.id, id, body.reason, body.notes); }
  @Get('orders/:id/returns') returns(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.orders.returnsMine(user.id, id); }

}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders') list(@Query('q') q?: string, @Query('status') status?: OrderStatus) { return this.orders.listAdmin({ q, status }); }
  @Get('orders/:id') get(@Param('id') id: string) { return this.orders.adminGet(id); }
  @Patch('orders/:id/status') status(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: OrderStatus; reason?: string }) { return this.orders.transition(id, body.status, user.id, body.reason); }
  @Post('orders/:id/shipment') shipment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { carrier: string; trackingNumber?: string; trackingUrl?: string; status?: ShipmentStatus }) { return this.orders.addShipment(id, body, user.id); }
  @Patch('returns/:id') updateReturn(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status: ReturnStatus }) { return this.orders.updateReturn(id, body.status, user.id); }
  @Get('returns') returns() { return this.orders.returnsAdmin(); }
  @Post('orders/:id/refund') refund(@Param('id') id: string, @Body() body: { amount?: number; reason: string }) { return this.orders.refund(id, body.amount, body.reason); }
  @Get('refunds') refunds() { return this.orders.refunds(); }
}
