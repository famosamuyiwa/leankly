import { Body, Controller, Headers, Post } from "@nestjs/common";
import { Public } from "../auth/auth.decorators";
import { RevenueCatWebhookDto } from "./dto/revenuecat-webhook.dto";
import { RevenueCatService } from "./revenuecat.service";

@Controller("v1/webhooks")
export class WebhooksController {
  constructor(private readonly revenueCat: RevenueCatService) {}

  @Public()
  @Post("revenuecat")
  revenuecat(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: RevenueCatWebhookDto,
  ) {
    return this.revenueCat.handle(authorization, body);
  }
}
