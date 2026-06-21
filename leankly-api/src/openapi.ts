import { writeFile } from "node:fs/promises";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApplication } from "./bootstrap";

async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    preview: true,
  });
  const document = configureApplication(app);
  await writeFile("openapi.json", JSON.stringify(document, null, 2));
  await app.close();
}

void exportOpenApi();
