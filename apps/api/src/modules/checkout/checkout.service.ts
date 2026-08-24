import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ConfigService } from '@nestjs/config';

type Input = { cartId: string; shippingAddressId: string; billingAddressId?: string };
type AddressInput = { addressId: string; billingAddressId?: string };
const money = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService, private readonly inventory: InventoryService, private readonly config: ConfigService) {}

  private async addresses(userId: string, shippingId: string, billingId?: string) {
    const ids = [shippingId, billingId].filter(Boolean) as string[];
    const rows = await this.prisma.userAddress.findMany({ where: { userId, id: { in: ids } } });
    if (rows.length !== ids.length) throw new BadRequestException('Invalid checkout address');
    const shipping = rows.find((x) => x.id === shippingId)!;
    const billing = billingId ? rows.find((x) => x.id === billingId) : shipping;
    return { shipping: shipping as unknown as Prisma.InputJsonValue, billing: billing as unknown as Prisma.InputJsonValue };
  }

  private async calculate(userId: string, cartId: string, shippingMethodId?: string, couponCode?: string) {
    const cart = await this.prisma.cart.findFirst({ where: { id: cartId, userId, status: 'ACTIVE' }, include: { items: { include: { product: true, variant: true } }, coupon: { include: { promotion: true } } } });
    if (!cart || !cart.items.length) throw new BadRequestException('Cart is empty or unavailable');
    let subtotal = 0;
    for (const item of cart.items) {
      if (item.product.status !== 'ACTIVE' || (item.product.publishedAt === null) || (item.variantId && (!item.variant || item.variant.status !== 'ACTIVE'))) throw new BadRequestException('Cart contains an inactive product or variant');
      subtotal += Number(item.variant?.price ?? item.product.basePrice) * item.quantity;
    }
    let promotion = cart.coupon?.promotion;
    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() }, include: { promotion: true } });
      if (!coupon || coupon.status !== 'ACTIVE' || coupon.promotion.status !== 'ACTIVE' || coupon.startsAt > new Date() || (coupon.expiresAt && coupon.expiresAt < new Date())) throw new BadRequestException('Invalid or expired coupon');
      promotion = coupon.promotion;
    }
    let discount = 0;
    if (promotion && subtotal >= Number(promotion.minimumOrderAmount ?? 0)) discount = promotion.type === 'PERCENTAGE' ? subtotal * Number(promotion.value) / 100 : Number(promotion.value);
    if (promotion?.maximumDiscount) discount = Math.min(discount, Number(promotion.maximumDiscount));
    const shipping = shippingMethodId ? await this.prisma.shippingMethod.findFirst({ where: { id: shippingMethodId, status: 'ACTIVE' } }) : null;
    if (shippingMethodId && !shipping) throw new BadRequestException('Invalid shipping method');
    const shippingTotal = Number(shipping?.price ?? 0);
    const taxRate = this.config.get<number>('CHECKOUT_TAX_RATE', 0.1);
    const taxTotal = money((subtotal - discount + shippingTotal) * taxRate);
    return { cart, subtotal: money(subtotal), discountTotal: money(discount), shippingTotal, taxTotal, grandTotal: money(subtotal - discount + shippingTotal + taxTotal), shipping };
  }

  async create(userId: string, dto: Input) {
    const addresses = await this.addresses(userId, dto.shippingAddressId, dto.billingAddressId);
    const calc = await this.calculate(userId, dto.cartId);
    const existing = await this.prisma.checkoutSession.findFirst({ where: { userId, cartId: dto.cartId, status: { in: ['ACTIVE', 'PAYMENT_PENDING'] }, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (existing) return this.getOwned(userId, existing.id);
    const session = await this.prisma.checkoutSession.create({ data: { userId, cartId: dto.cartId, currency: calc.cart.currency, subtotal: calc.subtotal, discountTotal: calc.discountTotal, shippingTotal: calc.shippingTotal, taxTotal: calc.taxTotal, grandTotal: calc.grandTotal, shippingAddress: addresses.shipping, billingAddress: addresses.billing, expiresAt: new Date(Date.now() + 30 * 60_000) } });
    return this.getOwned(userId, session.id);
  }

  async getOwned(userId: string, id: string) { const x = await this.prisma.checkoutSession.findFirst({ where: { id, userId }, include: { shippingMethod: true, payments: true } }); if (!x) throw new NotFoundException('Checkout session not found'); if (x.expiresAt < new Date() && ['ACTIVE', 'PAYMENT_PENDING'].includes(x.status)) { await this.inventory.releaseCart(x.cartId); await this.prisma.checkoutSession.update({ where: { id }, data: { status: 'EXPIRED' } }); throw new BadRequestException('Checkout session expired'); } return x; }

  async address(userId: string, id: string, dto: AddressInput) { const session = await this.getOwned(userId, id); const a = await this.addresses(userId, dto.addressId, dto.billingAddressId); return this.prisma.checkoutSession.update({ where: { id: session.id }, data: { shippingAddress: a.shipping, billingAddress: a.billing } }); }
  async shipping(userId: string, id: string, methodId: string) { await this.getOwned(userId, id); const calc = await this.calculate(userId, (await this.getOwned(userId, id)).cartId, methodId); return this.prisma.checkoutSession.update({ where: { id }, data: { shippingMethodId: methodId, shippingTotal: calc.shippingTotal, taxTotal: calc.taxTotal, grandTotal: calc.grandTotal } }); }
  async coupon(userId: string, id: string, code: string) { const s = await this.getOwned(userId, id); const calc = await this.calculate(userId, s.cartId, s.shippingMethodId ?? undefined, code); return this.prisma.checkoutSession.update({ where: { id }, data: { discountTotal: calc.discountTotal, taxTotal: calc.taxTotal, grandTotal: calc.grandTotal } }); }
  async recalculate(userId: string, id: string) { const s = await this.getOwned(userId, id); const calc = await this.calculate(userId, s.cartId, s.shippingMethodId ?? undefined); return this.prisma.checkoutSession.update({ where: { id }, data: { subtotal: calc.subtotal, discountTotal: calc.discountTotal, shippingTotal: calc.shippingTotal, taxTotal: calc.taxTotal, grandTotal: calc.grandTotal } }); }
  async reserveStock(userId: string, id: string) { const s = await this.getOwned(userId, id); await this.calculate(userId, s.cartId, s.shippingMethodId ?? undefined); return this.inventory.reserveCart(s.cartId, 30); }
  async releaseStock(cartId: string) { return this.inventory.releaseCart(cartId); }
  async convertStock(cartId: string) { return this.inventory.convertCart(cartId); }
  async confirm(userId: string, id: string) { const s = await this.getOwned(userId, id); const payment = s.payments.find((item) => item.status === 'SUCCEEDED'); if (!payment) throw new BadRequestException('Payment is not verified'); if (s.status === 'COMPLETED') return s; await this.inventory.convertCart(s.cartId); await this.prisma.cart.update({ where: { id: s.cartId }, data: { status: 'CONVERTED' } }); return this.prisma.checkoutSession.update({ where: { id }, data: { status: 'COMPLETED' } }); }
}
