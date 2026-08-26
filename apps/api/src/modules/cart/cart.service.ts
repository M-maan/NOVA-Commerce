import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type CartWithRelations = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: true;
        variant: true;
      };
    };
    coupon: {
      include: {
        promotion: true;
      };
    };
  };
}>;

type CartItemWithRelations = CartWithRelations['items'][number];

type AddCartItemInput = {
  productId: string;
  variantId?: string;
  quantity: number;
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private cartInclude = {
    items: {
      include: {
        product: true,
        variant: true,
      },
    },
    coupon: {
      include: {
        promotion: true,
      },
    },
  } satisfies Prisma.CartInclude;

  private async getCart(userId?: string, guestSessionId?: string) {
    if (!userId && !guestSessionId) {
      throw new BadRequestException('Guest session is required');
    }

    const where = userId
      ? { userId, status: 'ACTIVE' as const }
      : { guestSessionId, status: 'ACTIVE' as const };

    const existing = await this.prisma.cart.findFirst({
      where,
      include: this.cartInclude,
    });

    if (existing) return existing;

    return this.prisma.cart.create({
      data: userId
        ? { userId, currency: 'USD' }
        : { guestSessionId, currency: 'USD' },
      include: this.cartInclude,
    });
  }

  private itemPrice(item: CartItemWithRelations) {
    return Number(item.variant?.price ?? item.product.basePrice);
  }

  private publicCartItem(item: CartItemWithRelations) {
    const { costPrice: productCostPrice, ...product } = item.product;
    void productCostPrice;

    const variant = item.variant
      ? (() => {
          const { costPrice: variantCostPrice, ...safeVariant } = item.variant;
          void variantCostPrice;
          return safeVariant;
        })()
      : null;

    return { ...item, product, variant };
  }

  private async view(cart: CartWithRelations) {
    const items = cart.items.map((item) => {
      const unitPrice = this.itemPrice(item);
      return { ...this.publicCartItem(item), unitPrice, lineTotal: unitPrice * item.quantity };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    let discount = 0;
    const promotion = cart.coupon?.promotion;

    if (
      promotion &&
      (!promotion.endsAt || promotion.endsAt > new Date()) &&
      subtotal >= Number(promotion.minimumOrderAmount ?? 0)
    ) {
      discount =
        promotion.type === 'PERCENTAGE'
          ? (subtotal * Number(promotion.value)) / 100
          : Number(promotion.value);
    }

    if (promotion?.maximumDiscount) {
      discount = Math.min(discount, Number(promotion.maximumDiscount));
    }

    return {
      ...cart,
      items,
      subtotal,
      discount,
      estimatedTotal: Math.max(0, subtotal - discount),
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  async get(userId?: string, guest?: string) {
    return this.view(await this.getCart(userId, guest));
  }

  async add(userId: string | undefined, guest: string | undefined, body: AddCartItemInput) {
    if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 99) {
      throw new BadRequestException('Invalid quantity');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: body.productId, status: 'ACTIVE', publishedAt: { not: null } },
      include: { variants: true },
    });

    if (!product) throw new NotFoundException('Product not found or inactive');

    const variant = body.variantId
      ? product.variants.find((item) => item.id === body.variantId && item.status === 'ACTIVE')
      : null;

    if (body.variantId && !variant) {
      throw new NotFoundException('Variant not found or inactive');
    }

    const cart = await this.getCart(userId, guest);
    const existing = cart.items.find(
      (item) =>
        item.productId === body.productId && item.variantId === (body.variantId ?? null),
    );

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + body.quantity,
          unitPriceSnapshot: variant?.price ?? product.basePrice,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          variantId: variant?.id,
          quantity: body.quantity,
          unitPriceSnapshot: variant?.price ?? product.basePrice,
        },
      });
    }

    return this.get(userId, guest);
  }

  async update(userId: string | undefined, guest: string | undefined, id: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new BadRequestException('Invalid quantity');
    }

    const cart = await this.getCart(userId, guest);
    const item = cart.items.find((cartItem) => cartItem.id === id);

    if (!item) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.update({ where: { id }, data: { quantity } });
    return this.get(userId, guest);
  }

  async remove(userId: string | undefined, guest: string | undefined, id: string) {
    const cart = await this.getCart(userId, guest);

    if (!cart.items.some((item) => item.id === id)) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id } });
    return this.get(userId, guest);
  }

  async clear(userId?: string, guest?: string) {
    const cart = await this.getCart(userId, guest);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.get(userId, guest);
  }

  async applyCoupon(userId: string | undefined, guest: string | undefined, code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: { promotion: true },
    });

    if (
      !coupon ||
      coupon.status !== 'ACTIVE' ||
      coupon.promotion.status !== 'ACTIVE' ||
      coupon.startsAt > new Date() ||
      (coupon.expiresAt && coupon.expiresAt < new Date()) ||
      (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
    ) {
      throw new BadRequestException('Invalid or expired coupon');
    }

    const cart = await this.getCart(userId, guest);
    const subtotal = cart.items.reduce(
      (sum, item) => sum + this.itemPrice(item) * item.quantity,
      0,
    );

    if (
      coupon.promotion.minimumOrderAmount &&
      subtotal < Number(coupon.promotion.minimumOrderAmount)
    ) {
      throw new BadRequestException('Minimum order amount not met');
    }

    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
    return this.get(userId, guest);
  }

  async removeCoupon(userId?: string, guest?: string) {
    const cart = await this.getCart(userId, guest);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    return this.get(userId, guest);
  }

  async merge(userId: string, guest: string) {
    if (!userId) throw new BadRequestException('User is required');
    if (!guest) throw new BadRequestException('Guest session is required');

    const guestCart = await this.getCart(undefined, guest);
    const userCart = await this.getCart(userId);

    for (const item of guestCart.items) {
      const existing = userCart.items.find(
        (cartItem) =>
          cartItem.productId === item.productId && cartItem.variantId === item.variantId,
      );

      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.min(99, existing.quantity + item.quantity) },
        });
      } else {
        await this.prisma.cartItem.update({
          where: { id: item.id },
          data: { cartId: userCart.id },
        });
      }
    }

    await this.prisma.cart.update({
      where: { id: guestCart.id },
      data: { status: 'CONVERTED', guestSessionId: null },
    });

    return this.get(userId);
  }
}
