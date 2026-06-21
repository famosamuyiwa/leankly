import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { ApiResponseInterceptor } from "./common/api-response.interceptor";

export function configureApplication(app: INestApplication) {
  app.use(helmet());
  app.use(pinoHttp({ genReqId: (request) => request.id }));
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Leankly API")
      .setVersion("1.0")
      .addBearerAuth()
      .build(),
  );
  document.openapi = "3.1.0";
  SwaggerModule.setup("docs", app, document);
  return document;
}
