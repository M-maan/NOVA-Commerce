import { Body, Controller, Get, Headers, Ip, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUser } from './types/auth-user.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Headers('user-agent') device: string | undefined, @Ip() ipAddress: string, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto, { device, ipAddress });
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Headers('user-agent') device: string | undefined, @Ip() ipAddress: string, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto, { device, ipAddress });
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Post('logout')
  async logout(@Body() dto: Partial<RefreshTokenDto>, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = dto.refreshToken ?? request.cookies?.refreshToken;
    response.clearCookie('refreshToken');
    return this.auth.logout(token);
  }

  @Post('refresh')
  async refresh(@Body() dto: Partial<RefreshTokenDto>, @Req() request: Request, @Headers('user-agent') device: string | undefined, @Ip() ipAddress: string, @Res({ passthrough: true }) response: Response) {
    const token = dto.refreshToken ?? request.cookies?.refreshToken;
    const result = await this.auth.refresh(String(token), { device, ipAddress });
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    void dto;
    return this.auth.forgotPassword();
  }

  @Patch('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    void dto;
    return this.auth.resetPassword();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getMe(user);
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}
