import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { AuthTokenPayload } from '../interfaces/auth-payload.interface';
import { resolveJwtSecret } from '../../common/config/runtime-security.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: resolveJwtSecret(),
        });
    }

    async validate(payload: AuthTokenPayload): Promise<AuthTokenPayload> {
        return this.authService.validateUserByPayload(payload);
    }
}
