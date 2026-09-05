import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type ReportType = 'sales' | 'orders' | 'products' | 'customers' | 'inventory';

const completeOrderStatuses: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.RETURN_REQUESTED,
  OrderStatus.RETURNED,
  OrderStatus.REFUNDED,
];

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(type: ReportType, from?: string, to?: string) {
    const createdAt = this.dateRange(from, to);
    if (type === 'sales') return this.sales(createdAt);
    if (type === 'orders') return this.orders(createdAt);
    if (type === 'products') return this.products(createdAt);
    if (type === 'customers') return this.customers(createdAt);
    if (type === 'inventory') return this.inventory();
    throw new BadRequestException('Unsupported report type');
  }

  private dateRange(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ? new Date(to) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new BadRequestException('Invalid report date range');
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  private async sales(createdAt: Prisma.DateTimeFilter) {
    const orders = await this.prisma.order.findMany({
      where: { createdAt, status: { in: completeOrderStatuses } },
      select: { createdAt: true, grandTotal: true, discountTotal: true, taxTotal: true, shippingTotal: true },
      orderBy: { createdAt: 'asc' },
    });
    const grouped = new Map<string, { orders: number; revenue: Prisma.Decimal; discounts: Prisma.Decimal; tax: Prisma.Decimal; shipping: Prisma.Decimal }>();
    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      const row = grouped.get(date) ?? {
        orders: 0,
        revenue: new Prisma.Decimal(0),
        discounts: new Prisma.Decimal(0),
        tax: new Prisma.Decimal(0),
        shipping: new Prisma.Decimal(0),
      };
      row.orders += 1;
      row.revenue = row.revenue.add(order.grandTotal);
      row.discounts = row.discounts.add(order.discountTotal);
      row.tax = row.tax.add(order.taxTotal);
      row.shipping = row.shipping.add(order.shippingTotal);
      grouped.set(date, row);
    }
    return [...grouped.entries()].map(([date, row]) => ({ date, ...row }));
  }

  private orders(createdAt: Prisma.DateTimeFilter) {
    return this.prisma.order.findMany({
      where: { createdAt },
      select: { orderNumber: true, status: true, paymentStatus: true, fulfillmentStatus: true, email: true, grandTotal: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  private products(createdAt: Prisma.DateTimeFilter) {
    return this.prisma.orderItem.groupBy({
      by: ['productId', 'productNameSnapshot'],
      where: { order: { createdAt, status: { in: completeOrderStatuses } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 100,
    });
  }

  private async customers(createdAt: Prisma.DateTimeFilter) {
    const customers = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER', createdAt },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        orders: { where: { status: { in: completeOrderStatuses } }, select: { grandTotal: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return customers.map((customer) => ({
      id: customer.id,
      email: customer.email,
      name: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email,
      createdAt: customer.createdAt,
      orders: customer._count.orders,
      lifetimeValue: customer.orders.reduce((sum, order) => sum + Number(order.grandTotal), 0),
    }));
  }

  private inventory() {
    return this.prisma.inventoryLevel.findMany({
      where: { variant: { status: CatalogStatus.ACTIVE, product: { status: { not: CatalogStatus.ARCHIVED } } } },
      select: {
        quantityReserved: true,
        quantityAvailable: true,
        warehouse: { select: { name: true } },
        variant: { select: { sku: true, name: true, product: { select: { name: true, status: true } } } },
      },
      orderBy: { quantityAvailable: 'asc' },
      take: 500,
    });
  }
}
