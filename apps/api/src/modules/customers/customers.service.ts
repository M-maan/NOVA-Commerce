import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}
  list(q?: string) {
    const where = q
      ? { role: 'CUSTOMER' as const, OR: [{ email: { contains: q, mode: 'insensitive' as const } }, { firstName: { contains: q, mode: 'insensitive' as const } }, { lastName: { contains: q, mode: 'insensitive' as const } }] }
      : { role: 'CUSTOMER' as const };
    return this.prisma.user.findMany({ where, select: { id: true, email: true, firstName: true, lastName: true, status: true, createdAt: true, lastLogin: true, _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  async get(id: string) {
    const customer = await this.prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, status: true, createdAt: true, lastLogin: true,
        orders: { orderBy: { createdAt: 'desc' }, select: { id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return { ...customer, lifetimeValue: customer.orders.reduce((sum, order) => sum + Number(order.grandTotal), 0) };
  }
}
