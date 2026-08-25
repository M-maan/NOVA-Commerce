import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ReturnStatus,
  ShipmentStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '../../queue/queue.constants';

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly notifications: Queue,
  ) {}

  async createFromPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        checkoutSession: {
          include: {
            cart: { include: { items: { include: { product: { include: { images: true } }, variant: { include: { images: true } } } }, coupon: true } },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.SUCCEEDED) throw new BadRequestException('Order requires a successful payment');
    const existing = await this.prisma.order.findUnique({ where: { checkoutSessionId: payment.checkoutSessionId }, include: this.orderInclude });
    if (existing) return existing;
    const checkout = payment.checkoutSession;
    if (!checkout.cart.items.length) throw new BadRequestException('Cannot create an order from an empty cart');
    const variantIds = checkout.cart.items.flatMap((item) => (item.variantId ? [item.variantId] : []));
    if (variantIds.length) {
      const activeReservations = await this.prisma.stockReservation.count({
        where: { cartId: checkout.cartId, productVariantId: { in: variantIds }, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      });
      if (activeReservations !== variantIds.length) throw new BadRequestException('Active inventory reservation is required before order creation');
    }

    // convertCart only processes ACTIVE reservations, making this operation safe to retry.
    await this.inventory.convertCart(checkout.cartId);
    const orderNumber = await this.nextOrderNumber();
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: payment.userId,
          checkoutSessionId: checkout.id,
          email: payment.user.email,
          phone: payment.user.phone,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.SUCCEEDED,
          currency: checkout.currency,
          subtotal: checkout.subtotal,
          discountTotal: checkout.discountTotal,
          shippingTotal: checkout.shippingTotal,
          taxTotal: checkout.taxTotal,
          grandTotal: checkout.grandTotal,
          couponCode: checkout.cart.coupon?.code,
          shippingAddressSnapshot: checkout.shippingAddress as Prisma.InputJsonValue,
          billingAddressSnapshot: checkout.billingAddress ? (checkout.billingAddress as Prisma.InputJsonValue) : Prisma.JsonNull,
          items: {
            create: checkout.cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productNameSnapshot: item.product.name,
              variantNameSnapshot: item.variant?.name,
              skuSnapshot: item.variant?.sku,
              imageSnapshot: item.variant?.images?.[0]?.imageUrl ?? item.product.images[0]?.imageUrl,
              unitPrice: item.variant?.price ?? item.unitPriceSnapshot,
              quantity: item.quantity,
              lineTotal: new Prisma.Decimal(item.variant?.price ?? item.unitPriceSnapshot).mul(item.quantity),
            })),
          },
          statusHistory: { create: { newStatus: OrderStatus.CONFIRMED, reason: 'Payment confirmed' } },
        },
        include: this.orderInclude,
      });
      await tx.payment.update({ where: { id: payment.id }, data: { orderId: created.id } });
      await tx.checkoutSession.update({ where: { id: checkout.id }, data: { status: 'COMPLETED' } });
      await tx.cart.update({ where: { id: checkout.cartId }, data: { status: 'CONVERTED' } });
      return created;
    });
    await this.notifications.add('order-confirmed', { recipient: order.email, template: 'order-confirmed', orderId: order.id }, { removeOnComplete: true });
    return order;
  }

  private readonly orderInclude = {
    items: true,
    statusHistory: { orderBy: { createdAt: 'asc' as const } },
    shipments: { orderBy: { createdAt: 'desc' as const } },
    returnRequests: { orderBy: { requestedAt: 'desc' as const } },
    refunds: { orderBy: { createdAt: 'desc' as const } },
  } as const;

  private async nextOrderNumber() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const number = `NOVA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      if (!(await this.prisma.order.findUnique({ where: { orderNumber: number }, select: { id: true } }))) return number;
    }
    throw new ConflictException('Could not allocate a unique order number');
  }

  listMine(userId: string) {
    return this.prisma.order.findMany({ where: { userId }, include: this.orderInclude, orderBy: { createdAt: 'desc' } });
  }

  async getMine(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: this.orderInclude });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Order does not belong to current user');
    return order;
  }

  async transition(id: string, status: OrderStatus, changedBy?: string, reason?: string) {
    const current = await this.prisma.order.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Order not found');
    if (!transitions[current.status].includes(status)) throw new BadRequestException(`Invalid order transition: ${current.status} -> ${status}`);
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({ where: { id }, data: { status, fulfillmentStatus: this.fulfillmentFor(status), cancelledAt: status === 'CANCELLED' ? new Date() : undefined } });
      await tx.orderStatusHistory.create({ data: { orderId: id, previousStatus: current.status, newStatus: status, changedBy, reason } });
      return order;
    });
    await this.notifications.add(`order-${status.toLowerCase()}`, { template: `order-${status.toLowerCase()}`, orderId: id }, { removeOnComplete: true });
    return updated;
  }

  private fulfillmentFor(status: OrderStatus) {
    if (status === 'PROCESSING') return 'PROCESSING';
    if (status === 'PACKED') return 'PACKED';
    if (status === 'SHIPPED') return 'SHIPPED';
    if (status === 'DELIVERED') return 'DELIVERED';
    if (status === 'RETURNED') return 'RETURNED';
    return undefined;
  }

  async cancel(userId: string, id: string, reason?: string) {
    const order = await this.getMine(userId, id);
    if (!['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)) throw new BadRequestException('Order can no longer be cancelled');
    return this.transition(id, OrderStatus.CANCELLED, userId, reason ?? 'Customer cancellation');
  }

  async createReturn(userId: string, id: string, reason: string, notes?: string) {
    const order = await this.getMine(userId, id);
    if (order.status !== OrderStatus.DELIVERED) throw new BadRequestException('Returns are available after delivery only');
    const deliveredAt = order.shipments.find((shipment) => shipment.deliveredAt)?.deliveredAt ?? order.updatedAt;
    const returnWindowDays = this.config.get<number>('RETURN_WINDOW_DAYS', 30);
    if (Date.now() - deliveredAt.getTime() > returnWindowDays * 24 * 60 * 60 * 1000) throw new BadRequestException('The return window has expired');
    const existing = await this.prisma.returnRequest.findUnique({ where: { orderId_userId: { orderId: id, userId } } });
    if (existing && !['REJECTED', 'CANCELLED'].includes(existing.status)) throw new ConflictException('A return request already exists');
    const request = await this.prisma.returnRequest.create({ data: { orderId: id, userId, reason, notes } });
    await this.transition(id, OrderStatus.RETURN_REQUESTED, userId, 'Return requested');
    return request;
  }

  async returnsMine(userId: string, id: string) {
    await this.getMine(userId, id);
    return this.prisma.returnRequest.findMany({ where: { orderId: id, userId }, orderBy: { requestedAt: 'desc' } });
  }

  invoice(userId: string, id: string) {
    return this.getMine(userId, id).then((order) => ({ orderNumber: order.orderNumber, issuedAt: order.placedAt, currency: order.currency, totals: { subtotal: order.subtotal, discount: order.discountTotal, shipping: order.shippingTotal, tax: order.taxTotal, grandTotal: order.grandTotal }, items: order.items, shippingAddress: order.shippingAddressSnapshot, billingAddress: order.billingAddressSnapshot }));
  }

  listAdmin() { return this.prisma.order.findMany({ include: this.orderInclude, orderBy: { createdAt: 'desc' } }); }
  adminGet(id: string) { return this.prisma.order.findUnique({ where: { id }, include: this.orderInclude }).then((x) => { if (!x) throw new NotFoundException('Order not found'); return x; }); }

  async addShipment(orderId: string, data: { carrier: string; trackingNumber?: string; trackingUrl?: string; status?: ShipmentStatus }, actor: string) {
    const order = await this.adminGet(orderId);
    const shipment = await this.prisma.shipment.create({ data: { orderId, carrier: data.carrier, trackingNumber: data.trackingNumber, trackingUrl: data.trackingUrl, status: data.status, shippedAt: data.status === ShipmentStatus.SHIPPED ? new Date() : undefined } });
    if (data.status === ShipmentStatus.SHIPPED && ['PACKED', 'PROCESSING', 'CONFIRMED'].includes(order.status)) await this.transition(orderId, OrderStatus.SHIPPED, actor, 'Shipment created');
    return shipment;
  }

  async updateReturn(id: string, status: ReturnStatus, actor: string) {
    const request = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Return request not found');
    const timestamps = status === 'APPROVED' ? { approvedAt: new Date() } : status === 'REJECTED' ? { rejectedAt: new Date() } : status === 'COMPLETED' ? { completedAt: new Date() } : {};
    const updated = await this.prisma.returnRequest.update({ where: { id }, data: { status, ...timestamps } });
    if (status === 'COMPLETED') await this.transition(request.orderId, OrderStatus.RETURNED, actor, 'Return completed');
    return updated;
  }

  async refund(orderId: string, amount: number | undefined, reason: string) {
    const order = await this.adminGet(orderId);
    const payment = await this.prisma.payment.findFirst({ where: { orderId, status: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED'] } } });
    if (!payment || !payment.providerPaymentId) throw new BadRequestException('A successful Stripe payment is required');
    const already = await this.prisma.refund.findFirst({ where: { orderId, status: { in: ['PENDING', 'PROCESSING'] } } });
    if (already) throw new ConflictException('A refund is already in progress for this order');
    const refunded = await this.prisma.refund.aggregate({ where: { orderId, status: RefundStatus.SUCCEEDED }, _sum: { amount: true } });
    const remaining = Number(order.grandTotal) - Number(refunded._sum.amount ?? 0);
    const refundAmount = Math.min(amount ?? remaining, remaining);
    if (refundAmount <= 0) throw new BadRequestException('Refund amount must be positive');
    const secret = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secret) throw new BadRequestException('Stripe payments are not configured');
    const response = await fetch('https://api.stripe.com/v1/refunds', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ payment_intent: payment.providerPaymentId, amount: String(Math.round(refundAmount * 100)), reason: 'requested_by_customer' }) });
    const data = await response.json() as { id?: string; status?: string; error?: { message?: string } };
    if (!response.ok) throw new BadRequestException(data.error?.message ?? 'Stripe refund failed');
    const status = data.status === 'succeeded' ? RefundStatus.SUCCEEDED : RefundStatus.PROCESSING;
    const created = await this.prisma.refund.create({ data: { orderId, paymentId: payment.id, amount: refundAmount, reason, providerRefundId: data.id, status } });
    if (status === RefundStatus.SUCCEEDED) await this.prisma.payment.update({ where: { id: payment.id }, data: { status: refundAmount >= Number(payment.amount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED } });
    return created;
  }

  refunds() { return this.prisma.refund.findMany({ include: { order: true }, orderBy: { createdAt: 'desc' } }); }
  returnsAdmin() { return this.prisma.returnRequest.findMany({ include: { order: true, user: true }, orderBy: { requestedAt: 'desc' } }); }
}
