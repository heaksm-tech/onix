/**
 * The shared vocabulary of a company used by communication forms.
 *
 * A name identifies the company, and the database holds a unique index on the
 * trimmed, case-folded form of it. Both forms that can take a name check it
 * against the list they already loaded, so the answer arrives while typing
 * rather than on save; the API is still the authority, and answers 409.
 */

export type CompanyOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

/** The same key the database is unique on. */
export function companyNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The loaded company already using `name`, if any.
 *
 * `exceptId` is the company being renamed: it is allowed to keep the name it
 * already has, including a change of case.
 */
export function companyWithName<T extends CompanyOption>(
  companies: T[],
  name: string,
  exceptId?: string,
): T | undefined {
  const key = companyNameKey(name);
  if (key === '') return undefined;

  return companies.find(
    (company) => company.id !== exceptId && companyNameKey(company.name) === key,
  );
}
