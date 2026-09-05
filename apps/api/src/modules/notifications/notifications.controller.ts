import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsService } from './notifications.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get('notifications') list(@CurrentUser() user: AuthUser) { return this.notifications.list(user.id); }
  @Patch('notifications/:id/read') read(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.notifications.markRead(user.id, id); }
  @Get('notification-preferences') preferences(@CurrentUser() user: AuthUser) { return this.notifications.preferences(user.id); }
  @Patch('notification-preferences') update(@CurrentUser() user: AuthUser, @Body() body: { emailEnabled?: boolean; notificationEnabled?: boolean }) { return this.notifications.updatePreferences(user.id, body); }
}
