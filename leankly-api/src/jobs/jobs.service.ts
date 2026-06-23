import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { CLASSIFICATION_QUEUE, PUSH_QUEUE } from "./jobs.constants";
import { PushJobData } from "./push.types";

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(CLASSIFICATION_QUEUE) private readonly classification: Queue,
    @InjectQueue(PUSH_QUEUE) private readonly push: Queue,
  ) {}

  enqueueClassification(data: {
    leankId: string;
    title: string;
    description: string;
  }) {
    return this.classification.add("leank.classify", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  enqueuePush(data: PushJobData) {
    return this.push.add("push.send", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}
