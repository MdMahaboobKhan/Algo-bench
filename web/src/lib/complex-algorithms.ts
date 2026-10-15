export const COMPLEX_ALGORITHMS_CACHE_KEY = "algobench:complex-algorithms-cache";

export interface ComplexAlgorithm {
  title: string;
  body: string;
  bullets: string[];
}

export interface ComplexAlgorithmsCache {
  version: 1;
  source: "ai" | "examples";
  generatedAt: string;
  algorithms: ComplexAlgorithm[];
}

export function complexAlgorithmSlug(algorithm: ComplexAlgorithm): string {
  return algorithm.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isComplexAlgorithmArray(value: unknown): value is ComplexAlgorithm[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const algorithm = item as Record<string, unknown>;
    return (
      typeof algorithm.title === "string" &&
      typeof algorithm.body === "string" &&
      Array.isArray(algorithm.bullets) &&
      algorithm.bullets.every((bullet) => typeof bullet === "string")
    );
  });
}

export function isComplexAlgorithmsCache(value: unknown): value is ComplexAlgorithmsCache {
  if (!value || typeof value !== "object") return false;
  const cache = value as Record<string, unknown>;
  return (
    cache.version === 1 &&
    (cache.source === "ai" || cache.source === "examples") &&
    typeof cache.generatedAt === "string" &&
    isComplexAlgorithmArray(cache.algorithms)
  );
}

export function fallbackComplexAlgorithms(): ComplexAlgorithm[] {
  return [
    { title: "Paxos", body: "A family of consensus algorithms for getting distributed nodes to agree on a value despite failures.", bullets: ["Replicated state machines", "Proposers, acceptors, quorums", "Ballots and safety"] },
    { title: "Raft", body: "A leader-based consensus algorithm used for replicated logs and coordination.", bullets: ["Leader election", "Log replication", "Terms and committed entries"] },
    { title: "Consistent hashing", body: "A partitioning algorithm that minimizes key movement as nodes join or leave a cluster.", bullets: ["Cache and shard placement", "Virtual nodes", "Membership changes"] },
    { title: "Rendezvous hashing", body: "A placement algorithm that chooses the highest-scoring node for a key.", bullets: ["Shard assignment", "Minimal disruption", "No hash ring required"] },
    { title: "CRDTs", body: "Conflict-free replicated data types allow replicas to merge independent updates without coordination.", bullets: ["Collaborative editing", "Offline-first sync", "Convergent merge semantics"] },
    { title: "Vector clocks", body: "Logical clocks that capture causal relationships between distributed events.", bullets: ["Concurrent writes", "Dynamo-style versioning", "Causality tracking"] },
    { title: "Merkle trees", body: "Hash trees that efficiently compare large replicated datasets and locate differences.", bullets: ["Anti-entropy repair", "Storage verification", "Recursive mismatch detection"] },
    { title: "Bloom filters", body: "Probabilistic membership structures with no false negatives and tunable false positives.", bullets: ["Skip expensive lookups", "LSM databases", "Memory vs false-positive rate"] },
    { title: "HyperLogLog", body: "A probabilistic algorithm for approximate distinct counts at massive scale.", bullets: ["Cardinality estimation", "Tiny memory footprint", "Analytics dashboards"] },
    { title: "LSM trees", body: "Write-optimized storage structures used by databases like RocksDB, Cassandra, and LevelDB.", bullets: ["Memtables and SSTables", "Compaction", "Write/read amplification"] },
    { title: "Gossip protocols", body: "Peer-to-peer dissemination protocols for spreading membership and state updates.", bullets: ["Failure detection", "Eventual convergence", "Epidemic fanout"] },
    { title: "SWIM failure detection", body: "A scalable membership and failure-detection protocol using randomized probes.", bullets: ["Direct and indirect pings", "Suspicion periods", "Low per-node overhead"] },
  ];
}
