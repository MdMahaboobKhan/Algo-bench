import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 ships a native .node addon -- keep it out of the
  // server bundle so Next doesn't try to webpack/turbopack-bundle it.
  serverExternalPackages: ["better-sqlite3"],
  // Next auto-generates web/AGENTS.md + web/CLAUDE.md on `next dev` --
  // this project deliberately consolidated all docs into the root
  // AGENTS.md/README.md, so disable the regeneration rather than keep
  // deleting/gitignoring the files it drops back in.
  agentRules: false,
};

export default nextConfig;
