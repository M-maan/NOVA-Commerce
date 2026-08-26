import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
@Injectable()
export class ShippingService { constructor(private readonly prisma: PrismaService) {} list() { return this.prisma.shippingMethod.findMany({ where: { status: 'ACTIVE' }, orderBy: { price: 'asc' } }); } }
