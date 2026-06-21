import { Body, Controller, Get, Post } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/auth.decorators";
import { ApplyReferralDto } from "./dto/apply-referral.dto";
import { ReferralsService } from "./referrals.service";

@Controller("v1/users/me/referral")
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get()
  getStats(@CurrentUser() user: User) {
    return this.referrals.getStats(user);
  }

  @Post("apply")
  apply(@CurrentUser() user: User, @Body() input: ApplyReferralDto) {
    return this.referrals.apply(user, input.code);
  }
}
