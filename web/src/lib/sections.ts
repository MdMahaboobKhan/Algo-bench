// Top-level content sections. AlgoBench started as pure coding-pattern
// practice; this exists so future areas (system design, behavioral
// interview prep, etc.) can be added as siblings to "Coding" without
// restructuring the home page again -- add an entry here with `href: null`
// as a placeholder until that section actually has content/a route.
export interface Section {
  slug: string;
  name: string;
  description: string;
  href: string | null;
}

export const SECTIONS: Section[] = [
  { slug: "coding", name: "Coding", description: "Pattern-based coding problems.", href: "/coding" },
  { slug: "system-design", name: "System Design", description: "Coming soon.", href: null },
  { slug: "interview", name: "Interview", description: "Coming soon.", href: null },
];
