import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationDto } from './create-application.dto';

// All fields optional; the same validation rules apply when present.
export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}
