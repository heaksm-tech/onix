/** The roles declared by the `user_role` enum in the create-users migration. */
export const USER_ROLES = ['employee', 'manager', 'technical', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Roles an administrator or technician may assign through an invitation. */
export const INVITABLE_ROLES = [
  'employee',
  'manager',
  'technical',
] as const satisfies readonly UserRole[];

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

/** The signed-in user, as carried on the request and returned to the client. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
