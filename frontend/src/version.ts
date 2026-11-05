/**
 * The running build's version, shown at the foot of the sidebar so a bug report
 * names the build it came from.
 *
 * Derived from `git describe` at build time, not from a number anyone has to
 * remember to bump: `v1.0.0` on a tagged release, `v1.0.0-3-g20a8152` three
 * commits past one — which still identifies the exact commit a tester was on.
 * The deploy passes it as a build argument; see docs/OPERATIONS.md.
 *
 * `dev` when built without that argument, which is every local `npm start`.
 */
export const APP_VERSION = process.env.REACT_APP_VERSION || 'dev';

/**
 * Where users can get the source of this build, as section 13 of the AGPL
 * requires. A modified version must point it at its own source.
 */
export const SOURCE_URL =
  process.env.REACT_APP_SOURCE_URL || 'https://github.com/davithehumanizer/service-hub';
