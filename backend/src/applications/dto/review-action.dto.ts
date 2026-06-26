import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for reject / return-for-changes. The comment is mandatory; the workflow
 * state machine also enforces this, but validating here yields a clean 400 with
 * a field-level error before any work is done.
 */
export class ReviewActionDto {
  @IsString()
  @IsNotEmpty({ message: 'comment is required' })
  @MaxLength(2000)
  comment: string;
}

/** Body for approve — comment is optional. */
export class ApproveDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
