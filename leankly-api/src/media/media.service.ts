import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { Client, Storage } from "node-appwrite";
import { ConfirmMediaDto } from "./dto/confirm-media.dto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 10 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly storage: Storage;

  constructor(private readonly config: ConfigService) {
    const client = new Client()
      .setEndpoint(config.getOrThrow<string>("APPWRITE_ENDPOINT"))
      .setProject(config.getOrThrow<string>("APPWRITE_PROJECT_ID"))
      .setKey(config.getOrThrow<string>("APPWRITE_API_KEY"));
    this.storage = new Storage(client);
  }

  async confirm(user: User, input: ConfirmMediaDto) {
    const expectedPurpose =
      input.bucket === "avatars" ? "avatar" : "leank_cover";
    if (input.purpose !== expectedPurpose)
      throw new BadRequestException("Bucket and purpose do not match");
    const bucketId = this.bucketId(input.bucket);
    const file = await this.storage.getFile({ bucketId, fileId: input.fileId });
    if (!ALLOWED_TYPES.has(file.mimeType))
      throw new BadRequestException("Unsupported image type");
    if (file.sizeOriginal > MAX_SIZE)
      throw new BadRequestException("Image exceeds 10 MB");
    const ownsFile = file.$permissions.some(
      (permission) =>
        permission.includes(`user:${user.appwriteUserId}`) &&
        /update|delete/.test(permission),
    );
    if (!ownsFile)
      throw new ForbiddenException(
        "The uploaded file does not belong to this user",
      );
    return {
      fileId: file.$id,
      bucket: input.bucket,
      purpose: input.purpose,
      mimeType: file.mimeType,
      size: file.sizeOriginal,
      viewUrl: this.viewUrl(bucketId, file.$id),
    };
  }

  private bucketId(bucket: ConfirmMediaDto["bucket"]) {
    return this.config.getOrThrow<string>(
      bucket === "avatars"
        ? "APPWRITE_AVATAR_BUCKET_ID"
        : "APPWRITE_LEANK_COVER_BUCKET_ID",
    );
  }

  private viewUrl(bucketId: string, fileId: string) {
    const endpoint = this.config
      .getOrThrow<string>("APPWRITE_ENDPOINT")
      .replace(/\/$/, "");
    const project = this.config.getOrThrow<string>("APPWRITE_PROJECT_ID");
    return `${endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/view?project=${encodeURIComponent(project)}`;
  }
}
