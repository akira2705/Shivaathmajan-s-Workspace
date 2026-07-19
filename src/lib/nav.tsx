import type { ReactNode } from "react";

// Standalone demo only has a single page (/tasks), so there are no
// additional nav destinations. Kept as an empty array so any leftover
// callers don't need to change shape.
export const NAV_LINKS: { href: string; label: string; icon: ReactNode }[] = [];
