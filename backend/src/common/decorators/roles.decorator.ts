import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';
// Applies role metadata to route handlers, for example: @Roles(UserRole.DOCTOR)
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
