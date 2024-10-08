import { JobsOptions } from "bullmq";

export const defaultQueueConfig: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
  attempts: 3,
};
