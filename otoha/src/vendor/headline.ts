import type { PartsPart } from './categories';
import type { ContextReserve } from './reserve';
export interface Headline { tokens: number; window?: number; pct: number | null; parts: PartsPart[]; reserve?: ContextReserve; }
