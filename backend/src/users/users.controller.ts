import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthTokenPayload } from '../auth/interfaces/auth-payload.interface';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @ApiOperation({ summary: 'Get current user profile.' })
    @Get('me')
    getMe(@Req() req: Request & { user: AuthTokenPayload }) {
        return this.usersService.getCurrentUser(req.user.sub);
    }

    @ApiOperation({ summary: 'Update current user profile.' })
    @Patch('me')
    updateMe(
        @Req() req: Request & { user: AuthTokenPayload },
        @Body() updateUserProfileDto: UpdateUserProfileDto,
    ) {
        return this.usersService.updateCurrentUser(req.user.sub, updateUserProfileDto);
    }
}
