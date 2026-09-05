import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ReviewStatus, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}
  @Get('products/:id/reviews') list(@Param('id') id: string) { return this.reviews.list(id); }
  @Post('products/:id/reviews') @UseGuards(JwtAuthGuard) create(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { orderId: string; rating: number; title: string; comment: string }) { return this.reviews.create(user.id, id, body); }
  @Patch('reviews/:id') @UseGuards(JwtAuthGuard) update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { rating?: number; title?: string; comment?: string }) { return this.reviews.update(user.id, id, body); }
  @Delete('reviews/:id') @UseGuards(JwtAuthGuard) remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.reviews.remove(user.id, id); }
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}
  @Get('reviews') list() { return this.reviews.adminList(); }
  @Patch('reviews/:id/status') status(@Param('id') id: string, @Body() body: { status: ReviewStatus }) { return this.reviews.adminStatus(id, body.status); }
}
