import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route (or controller) to one or more roles. Enforced by RolesGuard.
 * @example @Roles(Role.REVIEWER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
