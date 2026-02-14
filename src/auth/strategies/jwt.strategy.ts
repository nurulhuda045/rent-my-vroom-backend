import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { Role, RegistrationStep } from "../../generated/prisma/client";

/**
 * JWT Token Payload Interface
 * Matches the payload structure used in auth.service.ts generateTokens method
 */
export interface JwtPayload {
  sub: number;
  phone: string;
  role: Role;
  isVerified: boolean;
  registrationStep: RegistrationStep | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private config: ConfigService,
    private authService: AuthService,
  ) {
    const jwtSecret = config.get<string>("JWT_SECRET");
    
    if (!jwtSecret) {
      throw new Error(
        "JWT_SECRET is not configured. Please set JWT_SECRET in your environment variables.",
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
      ignoreExpiration: false,
    });
  }

  /**
   * Validate JWT payload and return user object
   * This method is called after the JWT is successfully decoded
   */
  async validate(payload: JwtPayload) {
    // Validate required payload fields
    if (!payload.sub || !payload.phone || !payload.role) {
      this.logger.warn("Invalid JWT payload structure", { payload });
      throw new UnauthorizedException("Invalid token payload");
    }

    try {
      // Fetch user from database
      const user = await this.authService.validateUser(payload.sub);

      if (!user) {
        this.logger.warn(`User not found for userId: ${payload.sub}`);
        throw new UnauthorizedException("User not found");
      }

      // Return user object (will be attached to request.user)
      return user;
    } catch (error) {
      // If it's already an UnauthorizedException, rethrow it
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error("Error validating user", {
        userId: payload.sub,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new UnauthorizedException("Authentication failed");
    }
  }
}
