import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { AuthTokenPayload } from './interfaces/auth-payload.interface';

type EmergencyContactRecord = {
  name: string;
  phone: string;
};

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
  emergencyContacts?: EmergencyContactRecord[];
  role: UserRole;
  createdAt: string;
};

export type AuthUserPublic = AuthUserRecord;

export type AuthSuccessResponse = {
  token: string;
  user: AuthUserPublic;
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedTestAccount();
  }

  async register(createAuthDto: CreateAuthDto): Promise<AuthSuccessResponse> {
    const email = this.normalizeEmail(createAuthDto.email);
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already registered.');
    }

    const user = this.usersRepository.create({
      email,
      fullName: createAuthDto.fullName.trim(),
      role: UserRole.USER,
      passwordHash: await this.hashPassword(createAuthDto.password),
    });

    const savedUser = await this.usersRepository.save(user);

    return this.buildAuthResponse(savedUser);
  }

  async login(loginAuthDto: LoginAuthDto): Promise<AuthSuccessResponse> {
    const email = this.normalizeEmail(loginAuthDto.email);
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (
      !(await this.verifyPassword(loginAuthDto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  async getMe(payload: AuthTokenPayload): Promise<AuthUserPublic> {
    return this.getUserPublicById(payload.sub);
  }

  async getUserPublicById(userId: string): Promise<AuthUserPublic> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toPublic(user);
  }

  async updateProfile(
    userId: string,
    updateAuthDto: UpdateAuthDto,
  ): Promise<AuthUserPublic> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (updateAuthDto.fullName) {
      user.fullName = updateAuthDto.fullName.trim();
    }

    if (updateAuthDto.phone !== undefined) {
      const nextValue = updateAuthDto.phone.trim();
      user.phone = nextValue || null;
    }

    if (updateAuthDto.bloodType !== undefined) {
      const nextValue = updateAuthDto.bloodType.trim();
      user.bloodType = nextValue || null;
    }

    if (updateAuthDto.allergies !== undefined) {
      const nextValue = updateAuthDto.allergies.trim();
      user.allergies = nextValue || null;
    }

    if (updateAuthDto.chronicConditions !== undefined) {
      const nextValue = updateAuthDto.chronicConditions.trim();
      user.chronicConditions = nextValue || null;
    }

    if (updateAuthDto.emergencyContactName !== undefined) {
      const nextValue = updateAuthDto.emergencyContactName.trim();
      user.emergencyContactName = nextValue || null;
    }

    if (updateAuthDto.emergencyContactPhone !== undefined) {
      const nextValue = updateAuthDto.emergencyContactPhone.trim();
      user.emergencyContactPhone = nextValue || null;
    }

    if (updateAuthDto.emergencyContacts !== undefined) {
      const normalizedContacts = this.normalizeEmergencyContacts(
        updateAuthDto.emergencyContacts,
      );

      if (normalizedContacts.length > 0) {
        user.emergencyContacts = normalizedContacts;
        user.emergencyContactName = normalizedContacts[0].name;
        user.emergencyContactPhone = normalizedContacts[0].phone;
      } else {
        user.emergencyContacts = null;
        user.emergencyContactName = null;
        user.emergencyContactPhone = null;
      }
    } else if (
      updateAuthDto.emergencyContactName !== undefined ||
      updateAuthDto.emergencyContactPhone !== undefined
    ) {
      const normalizedContacts = this.normalizeEmergencyContacts([
        {
          name: user.emergencyContactName,
          phone: user.emergencyContactPhone,
        },
      ]);

      user.emergencyContacts =
        normalizedContacts.length > 0 ? normalizedContacts : null;
    }

    const savedUser = await this.usersRepository.save(user);
    return this.toPublic(savedUser);
  }

  async validateUserByPayload(
    payload: AuthTokenPayload,
  ): Promise<AuthTokenPayload> {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid token.');
    }

    return this.toPayload(user);
  }

  private async buildAuthResponse(user: User): Promise<AuthSuccessResponse> {
    const payload = this.toPayload(user);
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: this.toPublic(user),
    };
  }

  private toPublic(user: User): AuthUserPublic {
    const persistedEmergencyContacts = this.normalizeEmergencyContacts(
      this.coerceEmergencyContacts(user.emergencyContacts),
    );

    const fallbackEmergencyContacts = this.normalizeEmergencyContacts([
      {
        name: this.normalizeOptionalText(user.emergencyContactName),
        phone: this.normalizeOptionalText(user.emergencyContactPhone),
      },
    ]);

    const emergencyContacts =
      persistedEmergencyContacts.length > 0
        ? persistedEmergencyContacts
        : fallbackEmergencyContacts;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: this.normalizeOptionalText(user.phone),
      bloodType: this.normalizeOptionalText(user.bloodType),
      allergies: this.normalizeOptionalText(user.allergies),
      chronicConditions: this.normalizeOptionalText(user.chronicConditions),
      emergencyContactName:
        emergencyContacts.length > 0
          ? emergencyContacts[0].name
          : this.normalizeOptionalText(user.emergencyContactName),
      emergencyContactPhone:
        emergencyContacts.length > 0
          ? emergencyContacts[0].phone
          : this.normalizeOptionalText(user.emergencyContactPhone),
      emergencyContacts,
      role: user.role,
      createdAt: this.toIsoString(user.createdAt),
    };
  }

  private toPayload(user: User): AuthTokenPayload {
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

  private normalizeOptionalText(value?: string | null): string | undefined {
    const nextValue = value?.trim();
    if (!nextValue) {
      return undefined;
    }

    return nextValue;
  }

  private coerceEmergencyContacts(
    value: unknown,
  ): Array<{ name?: string; phone?: string }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return {};
      }

      const candidate = entry as { name?: unknown; phone?: unknown };
      return {
        name: typeof candidate.name === 'string' ? candidate.name : undefined,
        phone:
          typeof candidate.phone === 'string' ? candidate.phone : undefined,
      };
    });
  }

  private normalizeEmergencyContacts(
    contacts: Array<{
      name?: string | null;
      phone?: string | null;
    }>,
  ): EmergencyContactRecord[] {
    return contacts
      .map((contact) => ({
        name: contact.name?.trim() ?? '',
        phone: contact.phone?.trim() ?? '',
      }))
      .filter((contact) => contact.name.length > 0 && contact.phone.length > 0)
      .slice(0, 5);
  }

  private async seedTestAccount(): Promise<void> {
    const email = this.normalizeEmail(
      process.env.HEALTHCARE_TEST_ACCOUNT_EMAIL ?? 'test@healthcare.dev',
    );
    const password = (
      process.env.HEALTHCARE_TEST_ACCOUNT_PASSWORD ?? 'Test@123456'
    ).trim();
    const fullName = (
      process.env.HEALTHCARE_TEST_ACCOUNT_FULL_NAME ?? 'Healthcare Test User'
    ).trim();

    if (
      !email ||
      email.length < 5 ||
      password.length < 8 ||
      fullName.length < 2
    ) {
      return;
    }

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      const passwordHash = await this.hashPassword(password);
      let changed = false;

      if (existingUser.fullName !== fullName) {
        existingUser.fullName = fullName;
        changed = true;
      }

      if (existingUser.passwordHash !== passwordHash) {
        existingUser.passwordHash = passwordHash;
        changed = true;
      }

      if (existingUser.role !== UserRole.USER) {
        existingUser.role = UserRole.USER;
        changed = true;
      }

      if (changed) {
        await this.usersRepository.save(existingUser);
      }

      return;
    }

    const user = this.usersRepository.create({
      email,
      fullName,
      role: UserRole.USER,
      passwordHash: await this.hashPassword(password),
    });

    await this.usersRepository.save(user);
  }

  private toIsoString(value: Date | string | undefined | null): string {
    if (!value) {
      return new Date().toISOString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString();
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
