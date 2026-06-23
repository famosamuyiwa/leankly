export interface PushJobData {
  recipients: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  image?: string;
}
