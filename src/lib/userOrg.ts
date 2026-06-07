export type AppUser = {
  id?: string;
  organizationId?: string;
  organization?: { id: string; name?: string };
  name?: string;
  email?: string;
};

export function getOrganizationId(user: AppUser | null | undefined): string | undefined {
  return user?.organizationId || user?.organization?.id;
}

export function getStoredUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('veriaudit_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function withSyncContext<T extends object>(
  data: T,
  user: AppUser | null | undefined
): T & { organizationId?: string; auditorId?: string; auditorName?: string } {
  const resolvedUser = user || getStoredUser();
  const organizationId = getOrganizationId(resolvedUser);
  const existingAuditorId =
    'auditorId' in data && typeof data.auditorId === 'string' ? data.auditorId : undefined;
  const existingAuditorName =
    'auditorName' in data && typeof data.auditorName === 'string' ? data.auditorName : undefined;

  return {
    ...data,
    ...(organizationId ? { organizationId } : {}),
    auditorId: existingAuditorId || resolvedUser?.id,
    auditorName: existingAuditorName || resolvedUser?.name || resolvedUser?.email,
  };
}
