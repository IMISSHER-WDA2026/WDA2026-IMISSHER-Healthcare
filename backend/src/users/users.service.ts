import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UsersService {
    constructor(private readonly authService: AuthService) { }

    getCurrentUser(userId: string) {
        return this.authService.getUserPublicById(userId);
    }

    updateCurrentUser(userId: string, updateUserProfileDto: UpdateUserProfileDto) {
        return this.authService.updateProfile(userId, updateUserProfileDto);
    }
}
