/** The roles declared by the `user_role` enum in the create-users migration. */
export const USER_ROLES = ['employee', 'manager', 'technical', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** The signed-in user, as carried on the request and returned to the client. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
