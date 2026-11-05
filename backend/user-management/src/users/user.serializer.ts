import { User } from './user.entity';

/**

 * The subset of {@link User} that is safe to hand back over the wire.

 *

 * The entity carries three secrets — `password` (bcrypt hash), `resetToken`

 * and `confirmationToken` — none of which a caller ever needs. Returning the

 * entity directly leaked all three to every API consumer, so every handler

 * that answers with a user goes through this mapper.

 */

export interface SafeUser {
  id: number;

  email: string;

  isVerified: boolean;

  created_at: Date;

  updated_at: Date;

  role: User['role'];

  profile: User['profile'];
}

export function toSafeUser(user: User): SafeUser;

export function toSafeUser(user: null | undefined): null;

export function toSafeUser(user: User | null | undefined): SafeUser | null;

export function toSafeUser(user: User | null | undefined): SafeUser | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,

    email: user.email,

    isVerified: user.isVerified,

    created_at: user.created_at,

    updated_at: user.updated_at,

    role: user.role,

    profile: user.profile,
  };
}

export function toSafeUsers(users: User[]): SafeUser[] {
  return users.map((user) => toSafeUser(user));
}

