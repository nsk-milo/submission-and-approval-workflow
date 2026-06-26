import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ApplicationsService } from './applications.service';
import { QueryApplicationsDto } from './dto/query-applications.dto';
import { ApproveDto, ReviewActionDto } from './dto/review-action.dto';

/**
 * Reviewer-facing endpoints. Every route requires an authenticated REVIEWER.
 * Reviewers never edit application data — they only drive workflow transitions.
 */
@Controller('reviewer/applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REVIEWER)
export class ReviewerController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  list(@Query() query: QueryApplicationsDto) {
    return this.applications.reviewerList(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applications.findOneForReviewer(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ApproveDto) {
    return this.applications.approve(id, user, dto?.comment);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewActionDto) {
    return this.applications.reject(id, user, dto.comment);
  }

  @Post(':id/return')
  @HttpCode(HttpStatus.OK)
  returnForChanges(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewActionDto,
  ) {
    return this.applications.returnForChanges(id, user, dto.comment);
  }
}
