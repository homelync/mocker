import { allLocales } from '@faker-js/faker'
import type { LocaleDefinition } from '@faker-js/faker'

/**
 * Faker locale *names*, resolved to the definitions `generate` takes.
 *
 * Its own module because of what importing it costs. `allLocales` is one object
 * naming every locale faker ships, so a bundler that would otherwise drop the
 * 76 a project never mentions has to keep all 77. Only the paths that take a
 * locale by name pay that — the `x-mock-locale` control, and the CLI flag
 * behind it. {@link GenerateOptions.locale} takes a definition the caller
 * imported themselves and costs nothing, and is still the better option for a
 * locale a registry entry always wants.
 */

/**
 * `allLocales` keyed by `string` rather than by its 77 literal names.
 *
 * A widening, not a narrowing: every value is a `LocaleDefinition` either way,
 * and `noUncheckedIndexedAccess` keeps the `undefined` an unknown name returns.
 */
const LOCALES: Readonly<Record<string, LocaleDefinition>> = allLocales

/** Every locale name faker ships, sorted — for suggesting one back. */
export const LOCALE_NAMES: readonly string[] = Object.keys(LOCALES).sort()

/** Whether faker ships a locale by this name. */
export function isLocaleName(name: string): boolean {
  return LOCALES[name] !== undefined
}

/**
 * The definitions for a chain of locale names, in the order given.
 *
 * @param names locale names, highest priority first
 * @throws {Error} for a name faker does not ship. Callers that read a name from
 *   a header or a config file check it with {@link isLocaleName} first, so as to
 *   reject it where the mistake was made rather than here.
 */
export function resolveLocales(
  names: readonly string[],
): readonly LocaleDefinition[] {
  return names.map((name) => {
    const locale = LOCALES[name]
    if (locale === undefined) {
      throw new Error(`No faker locale named "${name}".`)
    }
    return locale
  })
}
