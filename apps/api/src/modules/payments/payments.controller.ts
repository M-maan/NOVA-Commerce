import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.type';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}
  @Post('webhook') webhook(@Headers('stripe-signature') signature: string | undefined, @Req() req: Request & { rawBody?: Buffer }) { return this.service.webhook(signature, req.rawBody); }
  @UseGuards(JwtAuthGuard)
  @Post('create-intent') intent(@CurrentUser() user: AuthUser, @Body() body: { checkoutSessionId: string }) { return this.service.createIntent(user.id, body.checkoutSessionId); }
  @UseGuards(JwtAuthGuard)
  @Get(':id/status') status(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.status(user.id, id); }
  @UseGuards(JwtAuthGuard)
  @Post(':id/retry') retry(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.retry(user.id, id); }
}
