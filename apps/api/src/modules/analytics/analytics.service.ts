import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const completedStatuses: OrderStatus[] = [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED, OrderStatus.RETURNED, OrderStatus.REFUNDED];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private range(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const end = to ? new Date(to) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new Error('Invalid date range');
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  async dashboard() {
    const orders = await this.prisma.order.aggregate({ where: { status: { in: completedStatuses } }, _count: { _all: true }, _sum: { grandTotal: true }, _avg: { grandTotal: true } });
    const [customers, products, lowStock, recent] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.orderItem.groupBy({ by: ['productId'], where: { order: { status: { in: completedStatuses } } }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
      this.prisma.inventoryLevel.count({ where: { quantityAvailable: { lte: 5 } } }),
      this.prisma.order.findMany({ take: 8, orderBy: { createdAt: 'desc' }, select: { id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true, user: { select: { email: true } } } }),
    ]);
    return { revenue: orders._sum.grandTotal ?? 0, orders: orders._count._all, averageOrderValue: orders._avg.grandTotal ?? 0, customers, lowStockProducts: lowStock, bestSellingProducts: products, recentActivities: recent };
  }

  async sales(from?: string, to?: string) {
    const rows = await this.prisma.order.findMany({ where: { createdAt: this.range(from, to), status: { in: completedStatuses } }, select: { createdAt: true, grandTotal: true, status: true }, orderBy: { createdAt: 'asc' } });
    const grouped = new Map<string, { revenue: Prisma.Decimal; orders: number }>();
    for (const row of rows) { const key = row.createdAt.toISOString().slice(0, 10); const value = grouped.get(key) ?? { revenue: new Prisma.Decimal(0), orders: 0 }; value.revenue = value.revenue.add(row.grandTotal); value.orders += 1; grouped.set(key, value); }
    return [...grouped.entries()].map(([date, value]) => ({ date, revenue: value.revenue, orders: value.orders }));
  }

  products() { return this.prisma.orderItem.groupBy({ by: ['productId'], where: { order: { status: { in: completedStatuses } } }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { lineTotal: 'desc' } }, take: 25 }); }
  customers() { return this.prisma.user.findMany({ where: { role: 'CUSTOMER' }, select: { id: true, email: true, firstName: true, lastName: true, createdAt: true, _count: { select: { orders: true } }, orders: { where: { status: { in: completedStatuses } }, select: { grandTotal: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  inventory() { return this.prisma.inventoryLevel.findMany({ include: { variant: { select: { sku: true, product: { select: { name: true } } } }, warehouse: { select: { name: true } } }, orderBy: { quantityAvailable: 'asc' }, take: 100 }); }
}
