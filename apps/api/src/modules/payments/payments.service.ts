import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CheckoutService } from '../checkout/checkout.service';
import { OrdersService } from '../orders/orders.service';

type StripeIntent = {
  id: string;
  client_secret?: string;
  status?: string;
  last_payment_error?: { message?: string } | null;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly checkout: CheckoutService,
    private readonly orders: OrdersService,
  ) {}

  private async stripe(path: string, method: 'GET' | 'POST' = 'POST', params: Record<string, string> = {}, idempotencyKey?: string) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) throw new BadRequestException('Stripe payments are not configured');
    const query = new URLSearchParams(params);
    const url = `https://api.stripe.com/v1/${path}${method === 'GET' && query.size ? `?${query}` : ''}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: method === 'POST' ? query : undefined,
    });
    const data = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      const message = typeof data.error === 'object' && data.error ? (data.error as { message?: string }).message : undefined;
      throw new BadRequestException(message ?? 'Stripe request failed');
    }
    return data;
  }

  async createIntent(userId: string, checkoutSessionId: string) {
    const session = await this.prisma.checkoutSession.findFirst({ where: { id: checkoutSessionId, userId }, include: { payments: { orderBy: { createdAt: 'desc' } } } });
    if (!session) throw new NotFoundException('Checkout session not found');
    if (session.expiresAt < new Date()) throw new BadRequestException('Checkout session expired');
    if (!session.shippingMethodId) throw new BadRequestException('Select a shipping method before payment');
    await this.checkout.reserveStock(userId, session.id);

    const existing = session.payments.find((payment) => ['PENDING', 'REQUIRES_ACTION', 'PROCESSING'].includes(payment.status) && payment.providerPaymentId);
    if (existing?.providerPaymentId) {
      const intent = await this.stripe(`payment_intents/${existing.providerPaymentId}`, 'GET') as StripeIntent;
      return { payment: existing, clientSecret: intent.client_secret, publishableKey: this.config.get<string>('STRIPE_PUBLISHABLE_KEY') || undefined };
    }

    const amount = Math.round(Number(session.grandTotal) * 100);
    if (amount < 50) throw new BadRequestException('Order total is below Stripe’s minimum payment amount');
    const intent = await this.stripe('payment_intents', 'POST', {
      amount: String(amount),
      currency: session.currency.toLowerCase(),
      'metadata[checkout_session_id]': session.id,
      'metadata[user_id]': userId,
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never',
    }, `nova-checkout-${session.id}-${session.payments.length}`) as StripeIntent;
    const payment = await this.prisma.payment.upsert({
      where: { providerPaymentId: intent.id },
      update: {},
      create: { userId, checkoutSessionId: session.id, provider: 'stripe', providerPaymentId: intent.id, amount: session.grandTotal, currency: session.currency, status: PaymentStatus.PENDING },
    });
    await this.prisma.checkoutSession.update({ where: { id: session.id }, data: { status: 'PAYMENT_PENDING' } });
    return { payment, clientSecret: intent.client_secret, publishableKey: this.config.get<string>('STRIPE_PUBLISHABLE_KEY') || undefined };
  }

  async status(userId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id, userId }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.reconcile(payment);
  }

  async checkoutStatus(userId: string, checkoutSessionId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { checkoutSessionId, userId }, orderBy: { createdAt: 'desc' }, include: { order: true } });
    if (!payment) throw new NotFoundException('Payment has not been started');
    return this.reconcile(payment);
  }

  async retry(userId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id, userId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!['FAILED', 'CANCELLED'].includes(payment.status)) throw new BadRequestException('Payment cannot be retried');
    return this.createIntent(userId, payment.checkoutSessionId);
  }

  private stripeStatus(status?: string, failed = false): PaymentStatus {
    if (status === 'succeeded') return PaymentStatus.SUCCEEDED;
    if (status === 'processing') return PaymentStatus.PROCESSING;
    if (status === 'requires_action') return PaymentStatus.REQUIRES_ACTION;
    if (status === 'canceled') return PaymentStatus.CANCELLED;
    if (status === 'requires_payment_method' && failed) return PaymentStatus.FAILED;
    return PaymentStatus.PENDING;
  }

  private async reconcile(payment: Payment & { order?: unknown }) {
    if (!payment.providerPaymentId || ['SUCCEEDED', 'CANCELLED'].includes(payment.status)) return payment;
    const intent = await this.stripe(`payment_intents/${payment.providerPaymentId}`, 'GET') as StripeIntent;
    const status = this.stripeStatus(intent.status, Boolean(intent.last_payment_error));
    if (status !== payment.status || intent.last_payment_error?.message) await this.applyStatus(payment, status, intent.last_payment_error?.message);
    return this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { order: true } });
  }

  private async applyStatus(payment: Payment, status: PaymentStatus, failureReason?: string) {
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status, failureReason: failureReason ?? null } });
    if (status === PaymentStatus.SUCCEEDED) {
      await this.prisma.checkoutSession.update({ where: { id: payment.checkoutSessionId }, data: { status: 'PROCESSING' } });
      await this.orders.createFromPayment(payment.id);
    } else if (status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED) {
      const session = await this.prisma.checkoutSession.update({ where: { id: payment.checkoutSessionId }, data: { status: 'FAILED' } });
      await this.checkout.releaseStock(session.cartId);
    }
  }

  async webhook(signature?: string, rawBody?: Buffer) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret || !signature || !rawBody) throw new UnauthorizedException('Invalid webhook signature');
    const timestamp = signature.match(/t=(\d+)/)?.[1];
    const digest = signature.match(/v1=([a-f0-9]+)/)?.[1];
    if (!timestamp || !digest || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new UnauthorizedException('Invalid webhook signature');
    const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString()}`).digest('hex');
    if (expected.length !== digest.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(digest))) throw new UnauthorizedException('Invalid webhook signature');

    const event = JSON.parse(rawBody.toString()) as { id: string; type: string; data?: { object?: StripeIntent } };
    const intent = event.data?.object;
    if (!intent?.id) return { received: true };
    const payment = await this.prisma.payment.findFirst({ where: { providerPaymentId: intent.id } });
    if (!payment) return { received: true };
    const duplicate = await this.prisma.paymentEvent.findUnique({ where: { providerEventId: event.id } });
    if (duplicate) return { received: true, duplicate: true };

    const status = this.stripeStatus(intent.status, Boolean(intent.last_payment_error));
    await this.prisma.paymentEvent.create({ data: { paymentId: payment.id, providerEventId: event.id, eventType: event.type, status, processedAt: new Date() } });
    await this.applyStatus(payment, status, intent.last_payment_error?.message);
    return { received: true };
  }
}
