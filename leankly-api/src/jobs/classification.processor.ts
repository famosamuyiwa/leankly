import { Processor, WorkerHost } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";
import OpenAI from "openai";
import { CATEGORY_KEYS, CATEGORY_VALUES } from "../leanks/leank.constants";
import { PrismaService } from "../prisma/prisma.service";
import { CLASSIFICATION_QUEUE } from "./jobs.constants";

interface ClassificationJobData {
  leankId: string;
  title: string;
  description: string;
}

@Processor(CLASSIFICATION_QUEUE, { concurrency: 3 })
export class ClassificationProcessor extends WorkerHost {
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.openai = new OpenAI({ apiKey: config.getOrThrow("OPENAI_API_KEY") });
    this.model =
      config.get<string>("OPENAI_CLASSIFICATION_MODEL") || "gpt-5.4-nano";
  }

  async process(job: Job<ClassificationJobData>) {
    const response = await this.openai.responses.create({
      model: this.model,
      input: [
        {
          role: "system",
          content:
            "Classify the activity into exactly one allowed category. Do not add commentary.",
        },
        {
          role: "user",
          content: `Title: ${job.data.title}\nDescription: ${job.data.description}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "leank_classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: {
                type: "string",
                enum: Object.values(CATEGORY_VALUES),
              },
            },
            required: ["category"],
          },
        },
      },
    });
    const parsed = JSON.parse(response.output_text) as { category: string };
    const category = CATEGORY_KEYS.find(
      (key) => CATEGORY_VALUES[key] === parsed.category,
    );
    if (!category)
      throw new Error("Classifier returned an unsupported category");
    await this.prisma.leank.updateMany({
      where: { id: job.data.leankId },
      data: { category },
    });
    return { category };
  }
}
