import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.promotion.findMany({ include: { coupons: true }, orderBy: { createdAt: 'desc' } }); }
  async toggle(id: string, status: 'ACTIVE' | 'INACTIVE') { const promotion = await this.prisma.promotion.findUnique({ where: { id } }); if (!promotion) throw new NotFoundException('Promotion not found'); return this.prisma.promotion.update({ where: { id }, data: { status } }); }
}
