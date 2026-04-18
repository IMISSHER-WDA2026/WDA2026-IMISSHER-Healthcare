import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { UserRole } from '../users/entities/user.entity';
import { AuthTokenPayload } from './interfaces/auth-payload.interface';

type AuthUserRecord = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
};

export type AuthUserPublic = Omit<AuthUserRecord, 'passwordHash'>;

export type AuthSuccessResponse = {
  token: string;
  user: AuthUserPublic;
};

@Injectable()
export class AuthService {
  private readonly usersById = new Map<string, AuthUserRecord>();
  private readonly userIdByEmail = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) { }

  async register(createAuthDto: CreateAuthDto): Promise<AuthSuccessResponse> {
    const email = this.normalizeEmail(createAuthDto.email);
    if (this.userIdByEmail.has(email)) {
      throw new ConflictException('Email is already registered.');
    }

    const now = new Date().toISOString();
    const user: AuthUserRecord = {
      id: randomUUID(),
      email,
      fullName: createAuthDto.fullName.trim(),
      role: UserRole.USER,
      passwordHash: this.hashPassword(createAuthDto.password),
      createdAt: now,
    };

    this.usersById.set(user.id, user);
    this.userIdByEmail.set(user.email, user.id);

    return this.buildAuthResponse(user);
  }

  async login(loginAuthDto: LoginAuthDto): Promise<AuthSuccessResponse> {
    const email = this.normalizeEmail(loginAuthDto.email);
    const userId = this.userIdByEmail.get(email);
    if (!userId) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const user = this.usersById.get(userId);
    if (!user || user.passwordHash !== this.hashPassword(loginAuthDto.password)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  async getMe(payload: AuthTokenPayload): Promise<AuthUserPublic> {
    return this.getUserPublicById(payload.sub);
  }

  getUserPublicById(userId: string): AuthUserPublic {
    const user = this.usersById.get(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toPublic(user);
  }

  updateProfile(userId: string, updateAuthDto: UpdateAuthDto): AuthUserPublic {
    const user = this.usersById.get(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (updateAuthDto.fullName) {
      user.fullName = updateAuthDto.fullName.trim();
    }

    if (updateAuthDto.phone !== undefined) {
      const nextValue = updateAuthDto.phone.trim();
      user.phone = nextValue || undefined;
    }

    if (updateAuthDto.bloodType !== undefined) {
      const nextValue = updateAuthDto.bloodType.trim();
      user.bloodType = nextValue || undefined;
    }

    if (updateAuthDto.allergies !== undefined) {
      const nextValue = updateAuthDto.allergies.trim();
      user.allergies = nextValue || undefined;
    }

    if (updateAuthDto.chronicConditions !== undefined) {
      const nextValue = updateAuthDto.chronicConditions.trim();
      user.chronicConditions = nextValue || undefined;
    }

    if (updateAuthDto.emergencyContactName !== undefined) {
      const nextValue = updateAuthDto.emergencyContactName.trim();
      user.emergencyContactName = nextValue || undefined;
    }

    if (updateAuthDto.emergencyContactPhone !== undefined) {
      const nextValue = updateAuthDto.emergencyContactPhone.trim();
      user.emergencyContactPhone = nextValue || undefined;
    }

    this.usersById.set(user.id, user);
    return this.toPublic(user);
  }

  validateUserByPayload(payload: AuthTokenPayload): AuthTokenPayload {
    const user = this.usersById.get(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token.');
    }

    return this.toPayload(user);
  }

  private async buildAuthResponse(user: AuthUserRecord): Promise<AuthSuccessResponse> {
    const payload = this.toPayload(user);
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: this.toPublic(user),
    };
  }

  private toPublic(user: AuthUserRecord): AuthUserPublic {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      bloodType: user.bloodType,
      allergies: user.allergies,
      chronicConditions: user.chronicConditions,
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private toPayload(user: AuthUserRecord): AuthTokenPayload {
    return {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }
}
