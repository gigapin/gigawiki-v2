import { nanoid } from 'nanoid'
import slugify from 'slugify'

/** Slugify a string the same way everywhere: lowercase, strict character set. */
export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true })
}

/**
 * Slugify `text`, appending a short random suffix when the base slug is taken.
 *
 * `checkExists` receives a candidate slug and resolves true when it is already in use,
 * so each caller decides which table to look in.
 */
export async function generateUniqueSlug(
  text: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = generateSlug(text)

  if (!(await checkExists(base))) return base

  return `${base}-${nanoid(6)}`
}
