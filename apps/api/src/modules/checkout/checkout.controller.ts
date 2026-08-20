import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CheckoutService } from './checkout.service';

class CreateSessionDto { @IsString() cartId!: string; @IsString() shippingAddressId!: string; @IsOptional() @IsString() billingAddressId?: string; }
class AddressDto { @IsString() sessionId!: string; @IsString() addressId!: string; @IsOptional() @IsString() billingAddressId?: string; }
class ShippingDto { @IsString() sessionId!: string; @IsString() shippingMethodId!: string; }
class CouponDto { @IsString() sessionId!: string; @IsString() code!: string; }

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}
  @Post('session') create(@CurrentUser() user: AuthUser, @Body() dto: CreateSessionDto) { return this.service.create(user.id, dto); }
  @Get('session/:id') get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.getOwned(user.id, id); }
  @Post('address') address(@CurrentUser() user: AuthUser, @Body() dto: AddressDto) { return this.service.address(user.id, dto.sessionId, dto); }
  @Post('shipping-method') shipping(@CurrentUser() user: AuthUser, @Body() dto: ShippingDto) { return this.service.shipping(user.id, dto.sessionId, dto.shippingMethodId); }
  @Post('apply-coupon') coupon(@CurrentUser() user: AuthUser, @Body() dto: CouponDto) { return this.service.coupon(user.id, dto.sessionId, dto.code); }
  @Post('recalculate') recalculate(@CurrentUser() user: AuthUser, @Body() dto: { sessionId: string }) { return this.service.recalculate(user.id, dto.sessionId); }
  @Post('confirm') confirm(@CurrentUser() user: AuthUser, @Body() dto: { sessionId: string }) { return this.service.confirm(user.id, dto.sessionId); }
}
