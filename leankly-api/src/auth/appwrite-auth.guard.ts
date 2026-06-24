import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  GoneException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { Request } from "express";
import { AppwriteException } from "node-appwrite";
import { PrismaService } from "../prisma/prisma.service";
import { ALLOW_UNVERIFIED_KEY, IS_PUBLIC_KEY } from "./auth.decorators";
import { AppwriteService } from "./appwrite.service";

@Injectable()
export class AppwriteAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly appwrite: AppwriteService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.readBearerToken(request);
    if (!token) throw new UnauthorizedException("Missing Appwrite JWT");

    let identity;
    try {
      identity = await this.appwrite.verifyJwt(token);
    } catch (error) {
      const message =
        error instanceof AppwriteException
          ? error.message
          : "Invalid Appwrite JWT";
      throw new UnauthorizedException(message);
    }

    const existing = await this.prisma.user.findUnique({
      where: { appwriteUserId: identity.$id },
    });
    if (existing?.deletedAt) {
      throw new GoneException("This Leankly profile has been deleted");
    }

    const configuredRole = this.configuredRole(identity.$id);
    const fallbackName =
      identity.name?.trim() || this.makeFallbackName(identity.$id);
    const user = await this.prisma.user.upsert({
      where: { appwriteUserId: identity.$id },
      create: {
        appwriteUserId: identity.$id,
        email: identity.email,
        emailVerified: identity.emailVerification,
        name: fallbackName,
        avatarUrl: this.makeInitialsAvatar(fallbackName),
        role: configuredRole ?? UserRole.USER,
      },
      update: {
        email: identity.email,
        emailVerified: identity.emailVerification,
        role: configuredRole ?? existing?.role,
      },
    });

    if (!user.isActive || user.suspendedAt) {
      throw new ForbiddenException("This account is suspended");
    }

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!allowUnverified && !identity.emailVerification) {
      throw new ForbiddenException("Verify your email before continuing");
    }

    request.appwriteIdentity = identity;
    request.currentUser = user;
    return true;
  }

  private readBearerToken(request: Request) {
    const value = request.headers.authorization;
    const [scheme, token] = value?.split(" ") || [];
    return scheme?.toLowerCase() === "bearer" ? token : null;
  }

  private makeFallbackName(appwriteUserId: string) {
    return `Leanker-${appwriteUserId.slice(-6)}`;
  }

  private configuredRole(appwriteUserId: string) {
    if (this.configuredIds("ADMIN_APPWRITE_USER_IDS").has(appwriteUserId)) {
      return UserRole.ADMIN;
    }
    if (this.configuredIds("QA_APPWRITE_USER_IDS").has(appwriteUserId)) {
      return UserRole.QA;
    }
    if (this.configuredIds("DEV_APPWRITE_USER_IDS").has(appwriteUserId)) {
      return UserRole.DEV;
    }
    return null;
  }

  private configuredIds(key: string) {
    return new Set(
      (this.config.get<string>(key) || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  private makeInitialsAvatar(name: string) {
    const endpoint = this.config.getOrThrow<string>("APPWRITE_ENDPOINT");
    const project = this.config.getOrThrow<string>("APPWRITE_PROJECT_ID");
    const url = new URL(`${endpoint.replace(/\/$/, "")}/avatars/initials`);
    url.searchParams.set("name", name);
    url.searchParams.set("width", "200");
    url.searchParams.set("height", "200");
    url.searchParams.set("project", project);
    return url.toString();
  }
}
