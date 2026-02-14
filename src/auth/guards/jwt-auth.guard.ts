import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  /**
   * Handle authentication errors with better error messages
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    // Log authentication attempts for debugging
    if (err || !user) {
      this.logger.warn("Authentication failed", {
        path: request.url,
        method: request.method,
        hasAuthHeader: !!authHeader,
        error: err?.message || info?.message || "Unknown error",
      });
    }

    // Handle specific JWT errors
    if (info) {
      switch (info.name) {
        case "JsonWebTokenError":
          throw new UnauthorizedException("Invalid token format");
        case "TokenExpiredError":
          throw new UnauthorizedException("Token has expired");
        case "NotBeforeError":
          throw new UnauthorizedException("Token not active yet");
        default:
          if (info.message) {
            throw new UnauthorizedException(info.message);
          }
      }
    }

    // Handle other errors
    if (err) {
      throw err;
    }

    // If no user, throw unauthorized
    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    return user;
  }

  /**
   * Override canActivate to provide better error handling
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context) as Promise<boolean>;
  }
}
