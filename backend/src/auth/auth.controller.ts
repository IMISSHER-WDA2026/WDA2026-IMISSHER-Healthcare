import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthTokenPayload } from './interfaces/auth-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @ApiOperation({ summary: 'Register a new user account.' })
  @Post('register')
  register(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.register(createAuthDto);
  }

  @ApiOperation({ summary: 'Login with email and password.' })
  @HttpCode(200)
  @Post('login')
  login(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.login(loginAuthDto);
  }

  @ApiOperation({ summary: 'Get current authenticated user.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: Request & { user: AuthTokenPayload }) {
    return this.authService.getMe(req.user);
  }

  @ApiOperation({ summary: 'Get public medical profile for bystander / QR scan view.' })
  @ApiParam({ name: 'userId', description: 'User UUID encoded in the QR code.' })
  @Throttle({ 'public-profile': { limit: 10, ttl: 60_000 } })
  @Get('public/:userId')
  getPublicProfile(@Param('userId') userId: string) {
    return this.authService.getUserPublicById(userId);
  }
}
