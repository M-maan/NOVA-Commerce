import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CheckoutService } from '../checkout/checkout.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly checkout: CheckoutService) {}
  private async stripe(path: string, params: Record<string, string>) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) throw new BadRequestException('Stripe payments are not configured');
    const body = new URLSearchParams(params);
    const response = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const data = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new BadRequestException(typeof data.error === 'object' && data.error ? (data.error as { message?: string }).message : 'Stripe request failed');
    return data;
  }
  async createIntent(userId: string, checkoutSessionId: string) {
    const checkout = await this.prisma.checkoutSession.findFirst({ where: { id: checkoutSessionId, userId }, include: { payments: true } });
    if (!checkout) throw new NotFoundException('Checkout session not found');
    if (checkout.expiresAt < new Date()) throw new BadRequestException('Checkout session expired');
    await this.checkout.reserveStock(userId, checkout.id);
    const existing = checkout.payments.find((p) => ['PENDING', 'REQUIRES_ACTION', 'PROCESSING'].includes(p.status));
    if (existing) return { payment: existing, clientSecret: existing.providerPaymentId };
    const amount = Math.round(Number(checkout.grandTotal) * 100);
    const intent = await this.stripe('payment_intents', { amount: String(amount), currency: checkout.currency.toLowerCase(), 'metadata[checkout_session_id]': checkout.id, 'automatic_payment_methods[enabled]': 'true' });
    const payment = await this.prisma.payment.create({ data: { userId, checkoutSessionId: checkout.id, provider: 'stripe', providerPaymentId: String(intent.id), amount: checkout.grandTotal, currency: checkout.currency, status: 'PENDING' } });
    await this.prisma.checkoutSession.update({ where: { id: checkout.id }, data: { status: 'PAYMENT_PENDING' } });
    return { payment, clientSecret: intent.client_secret };
  }
  async status(userId: string, id: string) { const p = await this.prisma.payment.findFirst({ where: { id, userId } }); if (!p) throw new NotFoundException('Payment not found'); return p; }
  async retry(userId: string, id: string) { const p = await this.status(userId, id); if (!['FAILED', 'CANCELLED'].includes(p.status)) throw new BadRequestException('Payment cannot be retried'); return this.createIntent(userId, p.checkoutSessionId); }
  async webhook(signature?: string, rawBody?: Buffer) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret || !signature || !rawBody) throw new UnauthorizedException('Invalid webhook signature');
    const timestamp = signature.match(/t=(\d+)/)?.[1]; const digest = signature.match(/v1=([a-f0-9]+)/)?.[1];
    if (!timestamp || !digest || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new UnauthorizedException('Invalid webhook signature');
    const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString()}`).digest('hex');
    if (expected.length !== digest.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(digest))) throw new UnauthorizedException('Invalid webhook signature');
    const event = JSON.parse(rawBody.toString()) as { id: string; type: string; data?: { object?: { id?: string; metadata?: { checkout_session_id?: string }; last_payment_error?: { message?: string } } } };
    const object = event.data?.object; const providerId = object?.id;
    if (!providerId) return { received: true };
    const payment = await this.prisma.payment.findFirst({ where: { providerPaymentId: providerId } });
    if (!payment) return { received: true };
    const duplicate = await this.prisma.paymentEvent.findUnique({ where: { providerEventId: event.id } });
    if (duplicate) return { received: true, duplicate: true };
    const status = event.type === 'payment_intent.succeeded' ? 'SUCCEEDED' : event.type === 'payment_intent.payment_failed' ? 'FAILED' : event.type === 'payment_intent.canceled' ? 'CANCELLED' : payment.status;
    await this.prisma.$transaction([this.prisma.paymentEvent.create({ data: { paymentId: payment.id, providerEventId: event.id, eventType: event.type, status, processedAt: new Date() } }), this.prisma.payment.update({ where: { id: payment.id }, data: { status, failureReason: object?.last_payment_error?.message } }), ...(status === 'SUCCEEDED' ? [this.prisma.checkoutSession.update({ where: { id: payment.checkoutSessionId }, data: { status: 'PROCESSING' } })] : status === 'FAILED' || status === 'CANCELLED' ? [this.prisma.checkoutSession.update({ where: { id: payment.checkoutSessionId }, data: { status: 'FAILED' } })] : [])]);
    if (status === 'FAILED' || status === 'CANCELLED') { const failedCheckout = await this.prisma.checkoutSession.findUnique({ where: { id: payment.checkoutSessionId } }); if (failedCheckout) await this.checkout.releaseStock(failedCheckout.cartId); }
    return { received: true };
  }
}
