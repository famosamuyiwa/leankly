import { Injectable, UnauthorizedException } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { AppwriteService } from "../auth/appwrite.service";
import { PrismaService } from "../prisma/prisma.service";

type AuthenticatedSocket = Socket & { data: { userId?: string } };

@Injectable()
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly appwrite: AppwriteService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.token(client);
      if (!token) throw new UnauthorizedException("Missing Appwrite JWT");
      const identity = await this.appwrite.verifyJwt(token);
      const user = await this.prisma.user.findUnique({
        where: { appwriteUserId: identity.$id },
      });
      if (
        !user ||
        !user.isActive ||
        user.deletedAt ||
        user.suspendedAt ||
        !identity.emailVerification
      ) {
        throw new UnauthorizedException("Inactive Leankly profile");
      }
      client.data.userId = user.id;
      await client.join(this.userRoom(user.id));
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage("leank.subscribe")
  async subscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { leankId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.leankId) return { ok: false };
    const member = await this.prisma.leank.findFirst({
      where: {
        id: body.leankId,
        OR: [{ ownerId: userId }, { participants: { some: { userId } } }],
      },
      select: { id: true },
    });
    if (!member) return { ok: false };
    await client.join(this.leankRoom(body.leankId));
    return { ok: true };
  }

  @SubscribeMessage("leank.unsubscribe")
  async unsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { leankId?: string },
  ) {
    if (body?.leankId) await client.leave(this.leankRoom(body.leankId));
    return { ok: true };
  }

  emitLeank(leankId: string, event: string, data: unknown) {
    this.server.to(this.leankRoom(leankId)).emit(event, data);
  }

  emitUser(userId: string, event: string, data: unknown) {
    this.server.to(this.userRoom(userId)).emit(event, data);
  }

  private token(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string") return authToken;
    const value = client.handshake.headers.authorization;
    const [scheme, token] = value?.split(" ") || [];
    return scheme?.toLowerCase() === "bearer" ? token : null;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private leankRoom(leankId: string) {
    return `leank:${leankId}`;
  }
}
