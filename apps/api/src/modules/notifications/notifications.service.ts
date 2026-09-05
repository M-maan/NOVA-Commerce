import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) { return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }); }
  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({ where: { id, userId }, data: { readStatus: true } });
    if (!result.count) throw new NotFoundException('Notification not found');
    return this.prisma.notification.findUnique({ where: { id } });
  }
  preferences(userId: string) { return this.prisma.notificationPreference.upsert({ where: { userId }, create: { userId }, update: {} }); }
  updatePreferences(userId: string, data: { emailEnabled?: boolean; notificationEnabled?: boolean }) { return this.prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...data }, update: data }); }
  create(userId: string, type: NotificationType, title: string, message: string) { return this.prisma.notification.create({ data: { userId, type, title, message } }); }
}
