import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { MediaService } from "./media.service";

const user = { appwriteUserId: "appwrite-user" } as never;
const config = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      APPWRITE_ENDPOINT: "https://nyc.cloud.appwrite.io/v1",
      APPWRITE_PROJECT_ID: "project",
      APPWRITE_API_KEY: "key",
      APPWRITE_AVATAR_BUCKET_ID: "avatars",
      APPWRITE_LEANK_COVER_BUCKET_ID: "covers",
    };
    return values[key];
  }),
};

describe("MediaService", () => {
  it("rejects mismatched bucket and purpose", async () => {
    const service = new MediaService(config as never);
    await expect(
      service.confirm(user, {
        fileId: "file",
        bucket: "avatars",
        purpose: "leank_cover",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects files without uploader ownership permissions", async () => {
    const service = new MediaService(config as never);
    (service as any).storage = {
      getFile: jest.fn(() =>
        Promise.resolve({
          $id: "file",
          $permissions: ['read("any")'],
          mimeType: "image/jpeg",
          sizeOriginal: 100,
        }),
      ),
    };
    await expect(
      service.confirm(user, {
        fileId: "file",
        bucket: "avatars",
        purpose: "avatar",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
