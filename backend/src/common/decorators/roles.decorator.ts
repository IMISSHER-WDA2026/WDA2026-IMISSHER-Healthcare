import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';
// Decorator này dùng để dán lên API. Ví dụ: @Roles(UserRole.DOCTOR)
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);