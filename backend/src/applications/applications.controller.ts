import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

/**
 * Applicant-facing endpoints. Every route requires an authenticated APPLICANT;
 * ownership is enforced inside the service for per-record authorization.
 */
@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.APPLICANT)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateApplicationDto) {
    return this.applications.create(user, dto);
  }

  @Get('my')
  findMine(@CurrentUser('id') userId: string) {
    return this.applications.findMine(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.applications.findOneForApplicant(id, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applications.update(id, user, dto);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.applications.submit(id, user);
  }

  @Post(':id/revise')
  @HttpCode(HttpStatus.OK)
  revise(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.applications.revise(id, user);
  }
}
