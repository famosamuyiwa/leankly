import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { AppwriteAdminService } from "../appwrite/appwrite-admin.service";
import { PUSH_QUEUE } from "./jobs.constants";

export interface PushJobData {
  recipients: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Processor(PUSH_QUEUE, { concurrency: 10 })
export class PushProcessor extends WorkerHost {
  constructor(private readonly appwrite: AppwriteAdminService) {
    super();
  }

  process(job: Job<PushJobData>) {
    if (!job.data.recipients.length) return Promise.resolve(null);
    return this.appwrite.sendPush(job.data);
  }
}
