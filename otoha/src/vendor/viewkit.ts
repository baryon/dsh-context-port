import type { fmt } from './format';
export interface ViewKit { t(key: string, args?: Record<string, string | number>): string; fmt: typeof fmt; catLabel(key: string): string; }
