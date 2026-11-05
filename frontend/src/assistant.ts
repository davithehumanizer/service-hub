/**
 * The Retorik information agent is a separate service, not part of this code.
 * Its page and menu entry exist only when a tenant is set at build time, in
 * frontend/.env like the other REACT_APP_* values: without one, the platform
 * runs without the agent.
 */
export const RETORIK_TENANT = process.env.REACT_APP_RETORIK_TENANT || '';
export const RETORIK_PREFIX = process.env.REACT_APP_RETORIK_PREFIX || undefined;
export const ASSISTANT_ENABLED = RETORIK_TENANT !== '';
