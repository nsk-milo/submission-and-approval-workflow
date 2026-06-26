import { BadRequestException } from '@nestjs/common';

/**
 * Thrown when a reviewer action that mandates a comment (reject / return for
 * changes) is attempted without one. Surfaces as HTTP 400.
 */
export class CommentRequiredException extends BadRequestException {
  constructor(action: string) {
    super({
      statusCode: 400,
      message: `A comment is required to ${action} an application`,
    });
  }
}
