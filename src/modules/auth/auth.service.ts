import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { TokenService } from './services/token.service';

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean | string;
  name?: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user || user.password !== dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.tokenService.generate({
      userId: user.id,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );
    if (tokenInfoRes.ok) {
      return tokenInfoRes.json() as Promise<GoogleUserInfo>;
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userInfoRes.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }
    return userInfoRes.json() as Promise<GoogleUserInfo>;
  }

  async loginWithGoogle(googleAccessToken: string, role?: UserRole) {
    const info = await this.verifyGoogleToken(googleAccessToken);

    if (!info.email || !(info.email_verified === true || info.email_verified === 'true')) {
      throw new UnauthorizedException('Google account email not verified');
    }

    let user = await this.usersRepository.findOne({
      where: { email: info.email },
    });

    if (!user) {
      if (!role) {
        return { requiresRoleSelection: true as const };
      }

      user = this.usersRepository.create({
        name: info.name ?? info.email,
        email: info.email,
        googleId: info.sub,
        role,
      });
      await this.usersRepository.save(user);
    } else if (!user.googleId) {
      user.googleId = info.sub;
      await this.usersRepository.save(user);
    }

    const accessToken = this.tokenService.generate({
      userId: user.id,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
