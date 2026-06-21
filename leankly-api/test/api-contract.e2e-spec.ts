import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { IsNotEmpty, IsString } from "class-validator";
import * as request from "supertest";
import { configureApplication } from "../src/bootstrap";

class ContractDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Controller("contract")
class ContractController {
  @Get()
  getContract() {
    return { status: "ready" };
  }

  @Post()
  validateContract(@Body() input: ContractDto) {
    return input;
  }
}

@Module({ controllers: [ContractController] })
class ContractModule {}

describe("HTTP API contract", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const fixture = await Test.createTestingModule({
      imports: [ContractModule],
    }).compile();
    app = fixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it("wraps successful responses and installs security headers", async () => {
    const response = await request(app.getHttpServer())
      .get("/contract")
      .expect(200);

    expect(response.body).toEqual({
      ok: true,
      data: { status: "ready" },
    });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("returns the stable error envelope for invalid input", async () => {
    const response = await request(app.getHttpServer())
      .post("/contract")
      .send({ name: "", ownerId: "client-controlled" })
      .expect(400);

    expect(response.body).toMatchObject({
      ok: false,
      error: {
        code: "BAD_REQUEST",
        status: 400,
      },
    });
    expect(response.body.error.message).toContain("property ownerId");
  });
});
