import { UserRole } from '../../users/entities/user.entity';

export interface AuthTokenPayload {
    sub: string;
    email: string;
    fullName: string;
    role: UserRole;
}
