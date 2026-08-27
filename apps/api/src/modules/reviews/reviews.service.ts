import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReviewStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}
  list(productId: string) { return this.prisma.review.findMany({ where: { productId, status: ReviewStatus.APPROVED }, include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } }); }
  async create(userId: string, productId: string, data: { orderId: string; rating: number; title: string; comment: string }) {
    if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) throw new BadRequestException('Rating must be an integer from 1 to 5');
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    const order = await this.prisma.order.findFirst({ where: { id: data.orderId, userId, status: { in: ['DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'] }, items: { some: { productId } } }, select: { id: true } });
    if (!order) throw new ForbiddenException('A delivered purchase of this product is required');
    try { return await this.prisma.review.create({ data: { productId, userId, orderId: data.orderId, rating: data.rating, title: data.title.trim(), comment: data.comment.trim() } }); } catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('You have already reviewed this product'); throw error; }
  }
  async update(userId: string, id: string, data: { rating?: number; title?: string; comment?: string }) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('Review does not belong to current user');
    if (data.rating !== undefined && (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5)) throw new BadRequestException('Rating must be an integer from 1 to 5');
    return this.prisma.review.update({ where: { id }, data: { ...data, status: ReviewStatus.PENDING } });
  }
  async remove(userId: string, id: string) { const review = await this.prisma.review.findUnique({ where: { id } }); if (!review) throw new NotFoundException('Review not found'); if (review.userId !== userId) throw new ForbiddenException('Review does not belong to current user'); await this.prisma.review.delete({ where: { id } }); return { deleted: true }; }
  adminList() { return this.prisma.review.findMany({ include: { product: true, user: { select: { id: true, email: true, firstName: true, lastName: true } }, order: { select: { orderNumber: true } } }, orderBy: { createdAt: 'desc' } }); }
  adminStatus(id: string, status: ReviewStatus) { return this.prisma.review.update({ where: { id }, data: { status } }); }
}
