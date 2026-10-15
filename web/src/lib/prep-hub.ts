export interface HubArea {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  accent: string;
  stats: string;
}

export interface LearningResource {
  slug: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  description: string;
  href: string;
  items: Array<{
    slug?: string;
    title: string;
    body: string;
    bullets: string[];
  }>;
}

export const HUB_AREAS: HubArea[] = [
  {
    slug: "dsa-fundamentals",
    title: "DSA Fundamentals",
    eyebrow: "Algorithms",
    description: "Pattern-based coding practice, Monaco editor, examples, solutions, and local judging.",
    href: "/coding",
    accent: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    stats: "121 problems · 17 patterns",
  },
  {
    slug: "system-design-fundamentals",
    title: "System Design Fundamentals",
    eyebrow: "HLD basics",
    description: "Scalability, APIs, data stores, caching, queues, consistency, reliability, and estimation.",
    href: "/system-design/fundamentals",
    accent: "bg-blue-600 text-white dark:bg-blue-400 dark:text-blue-950",
    stats: "36 HLD topics",
  },
  {
    slug: "engineering-problems",
    title: "Engineering Problems",
    eyebrow: "Case studies",
    description: "Interesting production problems: hot keys, p99 latency, idempotency, backfills, and schema evolution.",
    href: "/system-design/engineering-problems",
    accent: "bg-purple-600 text-white dark:bg-purple-400 dark:text-purple-950",
    stats: "6 real-world drills",
  },
  {
    slug: "complex-engineering-algorithms",
    title: "Complex Engineering Algorithms",
    eyebrow: "Distributed systems",
    description: "Paxos, Raft, H3, CRDTs, consistent hashing, Bloom filters, LSM trees, Merkle trees, and more.",
    href: "/system-design/complex-engineering-algorithms",
    accent: "bg-indigo-600 text-white dark:bg-indigo-400 dark:text-indigo-950",
    stats: "14 advanced algorithms",
  },
  {
    slug: "lld-principles",
    title: "LLD Principles",
    eyebrow: "Object design",
    description: "SOLID, boundaries, design patterns, state machines, concurrency, testing, and maintainability.",
    href: "/system-design/lld-principles",
    accent: "bg-amber-500 text-amber-950 dark:bg-amber-300 dark:text-amber-950",
    stats: "52 LLD topics",
  },
  {
    slug: "engineering-books",
    title: "Engineering Books",
    eyebrow: "Reading list",
    description: "A focused shelf for system design, databases, reliability, architecture, and software craft.",
    href: "/system-design/books",
    accent: "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-emerald-950",
    stats: "8 recommended books",
  },
];

const RESOURCES: LearningResource[] = [
  {
    slug: "fundamentals",
    title: "System Design Fundamentals",
    subtitle: "The core HLD building blocks to use in every design interview.",
    eyebrow: "HLD fundamentals",
    description:
      "Use this as the checklist before jumping into a case study: clarify requirements, size the system, choose APIs and data models, then reason about bottlenecks.",
    href: "/system-design/fundamentals",
    items: [
      { title: "Requirements and constraints", body: "Turn a vague prompt into functional requirements, non-functional requirements, and explicit constraints.", bullets: ["User stories and core flows", "Latency, availability, durability", "Clarifying assumptions and out-of-scope items"] },
      { title: "Back-of-the-envelope estimation", body: "Estimate QPS, storage, bandwidth, fanout, and peak traffic so the design has realistic scale.", bullets: ["DAU/MAU to QPS", "Read/write ratio", "Storage growth and retention"] },
      { title: "API design", body: "Define clean service boundaries and request/response contracts before picking databases.", bullets: ["REST, RPC, GraphQL tradeoffs", "Pagination and filtering", "Versioning and backward compatibility"] },
      { title: "Data modeling", body: "Model entities around access patterns, ownership, and lifecycle.", bullets: ["Canonical entities", "Read models vs write models", "Indexes and query patterns"] },
      { title: "SQL database design", body: "Use relational modeling when joins, transactions, and constraints matter.", bullets: ["Normalization and denormalization", "Indexes and query plans", "Transactions and isolation levels"] },
      { title: "NoSQL database design", body: "Use KV, document, wide-column, and graph stores based on access pattern and scale needs.", bullets: ["Partition key design", "Single-table/access-pattern modeling", "Eventual consistency tradeoffs"] },
      { title: "Partitioning and sharding", body: "Split data across nodes while controlling hot shards, resharding, and routing complexity.", bullets: ["Hash/range/directory partitioning", "Virtual shards", "Rebalancing and split/merge operations"] },
      { title: "Replication", body: "Copy data for availability, durability, locality, and read scalability.", bullets: ["Leader-follower", "Multi-leader", "Quorum replication"] },
      { title: "Consistency models", body: "Choose the correctness guarantee the product actually needs.", bullets: ["Strong consistency", "Eventual consistency", "Read-your-writes and monotonic reads"] },
      { title: "CAP and PACELC", body: "Explain distributed tradeoffs under partitions and normal operation.", bullets: ["Consistency vs availability", "Latency vs consistency", "Feature-by-feature tradeoffs"] },
      { title: "Consensus and leader election", body: "Coordinate replicated systems that need a single agreed state or leader.", bullets: ["Raft/Paxos mental model", "Quorums and terms", "Split-brain prevention"] },
      { title: "Load balancing", body: "Distribute traffic across instances while preserving health, locality, and fairness.", bullets: ["L4 vs L7 load balancers", "Health checks", "Least connections, weighted routing, consistent hashing"] },
      { title: "Caching strategy", body: "Reduce latency and backend load while handling freshness and invalidation.", bullets: ["Cache-aside/write-through/write-back", "TTL and eviction", "Stampede and hot-key protection"] },
      { title: "CDN and edge delivery", body: "Serve static and cacheable content close to users.", bullets: ["Edge caching", "Cache keys and invalidation", "Origin shielding"] },
      { title: "Message queues", body: "Decouple services and move retryable work off the synchronous path.", bullets: ["At-least-once delivery", "Visibility timeouts", "Dead-letter queues"] },
      { title: "Pub/sub systems", body: "Broadcast events to many consumers without tight producer-consumer coupling.", bullets: ["Topics and subscriptions", "Fanout patterns", "Replay and consumer groups"] },
      { title: "Stream processing", body: "Process ordered event streams for analytics, indexing, fraud, and real-time products.", bullets: ["Kafka-style logs", "Windowing and watermarks", "Exactly-once vs effectively-once"] },
      { title: "Rate limiting", body: "Protect services and enforce quotas at user, IP, API key, or route granularity.", bullets: ["Token bucket", "Sliding window", "Distributed counters"] },
      { title: "Retries, timeouts, and idempotency", body: "Make unreliable networks safe by bounding waits and making operations retry-safe.", bullets: ["Client and server timeouts", "Exponential backoff with jitter", "Idempotency keys"] },
      { title: "Distributed transactions", body: "Coordinate multi-resource changes only when the correctness requirement justifies the cost.", bullets: ["2PC limitations", "Sagas", "Transactional outbox"] },
      { title: "Search architecture", body: "Design indexing and retrieval for text, filters, ranking, and freshness.", bullets: ["Inverted indexes", "Index pipelines", "Relevance and reindexing"] },
      { title: "Blob and object storage", body: "Store large immutable objects separately from metadata and serving indexes.", bullets: ["Pre-signed uploads", "Chunking and multipart upload", "Lifecycle and retention policies"] },
      { title: "Time-series systems", body: "Handle high-volume timestamped metrics and events efficiently.", bullets: ["Downsampling", "Retention tiers", "High-cardinality labels"] },
      { title: "Geospatial systems", body: "Index and query locations for nearby search, delivery, mobility, and maps.", bullets: ["Geohash/S2/H3", "Radius and bounding-box queries", "Precision vs fanout"] },
      { title: "Authentication and authorization", body: "Protect identity, sessions, permissions, and service-to-service access.", bullets: ["OAuth/OIDC/JWT", "RBAC/ABAC", "Token rotation and revocation"] },
      { title: "Multi-tenancy", body: "Share infrastructure safely across customers or organizations.", bullets: ["Tenant isolation", "Noisy-neighbor control", "Per-tenant quotas and encryption"] },
      { title: "Observability", body: "Design metrics, logs, and traces as first-class production requirements.", bullets: ["Golden signals", "Distributed tracing", "Structured logs"] },
      { title: "SLOs and error budgets", body: "Translate reliability goals into measurable targets and operational decisions.", bullets: ["Availability and latency SLOs", "Burn-rate alerts", "Release vs reliability tradeoff"] },
      { title: "Failure handling", body: "Assume dependencies fail and design graceful degradation.", bullets: ["Circuit breakers", "Bulkheads", "Fallbacks and brownouts"] },
      { title: "Backpressure and overload control", body: "Prevent one slow component from collapsing the whole system.", bullets: ["Queue limits", "Load shedding", "Admission control"] },
      { title: "Data migration and backfills", body: "Change large datasets safely without taking down production.", bullets: ["Expand-and-contract", "Dual reads/writes", "Checkpointed backfills"] },
      { title: "Schema evolution", body: "Let old and new code coexist through compatible data changes.", bullets: ["Backward-compatible fields", "Reader/writer compatibility", "Rolling deploy safety"] },
      { title: "Multi-region architecture", body: "Design for global users, regional isolation, and disaster scenarios.", bullets: ["Active-active vs active-passive", "Data residency", "Traffic steering"] },
      { title: "Disaster recovery", body: "Plan for restore, failover, and business continuity before incidents happen.", bullets: ["RPO and RTO", "Backups and restore drills", "Runbooks"] },
      { title: "Security and privacy", body: "Include encryption, secrets, audit logs, and data minimization in the architecture.", bullets: ["Encryption at rest/in transit", "Secret management", "PII retention and auditability"] },
      { title: "Cost and capacity planning", body: "Make the design economically viable at steady state and peak.", bullets: ["Capacity buffers", "Autoscaling limits", "Storage and egress costs"] },
    ],
  },
  {
    slug: "engineering-problems",
    title: "Interesting Engineering Problems",
    subtitle: "Production case studies that sharpen tradeoff thinking.",
    eyebrow: "Engineering case studies",
    description:
      "These are the problems behind real systems: skew, migrations, retries, latency spikes, and operational safety.",
    href: "/system-design/engineering-problems",
    items: [
      { title: "Hot partitions and celebrity users", body: "A small number of keys or users can dominate traffic and break naive sharding.", bullets: ["Detect skew with per-key metrics", "Split hot keys or use virtual shards", "Use hybrid fanout for celebrity accounts"] },
      { title: "Idempotency in payments and jobs", body: "Retries are mandatory in distributed systems; duplicate side effects are not.", bullets: ["Client-generated idempotency key", "Dedupe table with expiry", "Make workers safe to replay"] },
      { title: "P99 latency debugging", body: "Average latency hides the user pain. Design for the tail.", bullets: ["Trace each downstream dependency", "Add timeouts and hedged requests carefully", "Watch queue depth and GC pauses"] },
      { title: "Backfills and reprocessing", body: "Large data corrections should not take down the serving path.", bullets: ["Rate-limit backfills", "Checkpoint progress", "Run shadow validation before cutover"] },
      { title: "Schema evolution", body: "Deploy changes in phases so old and new code can coexist.", bullets: ["Expand-and-contract migration", "Dual writes when necessary", "Backfill before enforcing constraints"] },
      { title: "Multi-region failover", body: "Be explicit about active-active vs active-passive and the consistency cost.", bullets: ["Regional health checks", "DNS/global load balancer behavior", "Conflict resolution for writes"] },
    ],
  },
  {
    slug: "lld-principles",
    title: "LLD Principles",
    subtitle: "Object-oriented and component-level design for maintainable systems.",
    eyebrow: "Low-level design",
    description:
      "Use these when converting requirements into classes, interfaces, modules, and testable behavior.",
    href: "/system-design/lld-principles",
    items: [
      { title: "Object-oriented analysis", body: "Convert requirements into objects, responsibilities, relationships, and behavior.", bullets: ["Nouns as candidate entities", "Verbs as behavior", "Collaborations between objects"] },
      { title: "Class and interface design", body: "Define clear types with focused responsibilities and stable contracts.", bullets: ["Public API vs internals", "Interface segregation", "Constructor invariants"] },
      { title: "Encapsulation", body: "Hide mutable state and expose behavior instead of raw data structures.", bullets: ["Private fields", "Intent-revealing methods", "Invariant protection"] },
      { title: "Abstraction", body: "Expose the essential behavior while hiding implementation details.", bullets: ["Stable interfaces", "Implementation swapping", "Avoid leaky abstractions"] },
      { title: "Single Responsibility Principle", body: "A class or module should have one primary reason to change.", bullets: ["Separate policy from plumbing", "Avoid god classes", "Cohesive methods"] },
      { title: "Open/Closed Principle", body: "Prefer designs that add behavior without modifying stable code.", bullets: ["Strategy and polymorphism", "Plugin-style extension", "Avoid switch explosions"] },
      { title: "Liskov Substitution Principle", body: "Subtypes must preserve the promises of their base type.", bullets: ["No surprising overrides", "Respect pre/postconditions", "Prefer composition when inheritance lies"] },
      { title: "Interface Segregation Principle", body: "Clients should not depend on methods they do not use.", bullets: ["Small interfaces", "Role-based contracts", "Avoid fat service interfaces"] },
      { title: "Dependency Inversion Principle", body: "High-level policy should depend on abstractions, not concrete infrastructure.", bullets: ["Ports and adapters", "Dependency injection", "Mockable boundaries"] },
      { title: "Composition over inheritance", body: "Build behavior from collaborating objects instead of rigid class hierarchies.", bullets: ["Delegation", "Reusable components", "Avoid fragile base classes"] },
      { title: "Strategy pattern", body: "Encapsulate interchangeable algorithms behind a common interface.", bullets: ["Pricing rules", "Routing policies", "Validation strategies"] },
      { title: "Factory pattern", body: "Centralize object creation when construction logic is conditional or complex.", bullets: ["Simple factory", "Factory method", "Abstract factory"] },
      { title: "Builder pattern", body: "Construct complex objects step by step while keeping them valid.", bullets: ["Readable construction", "Optional fields", "Immutable target objects"] },
      { title: "Adapter pattern", body: "Wrap incompatible APIs behind a domain-friendly interface.", bullets: ["Third-party gateways", "Legacy integrations", "Test-friendly wrappers"] },
      { title: "Decorator pattern", body: "Add behavior around an object without changing its core implementation.", bullets: ["Logging", "Retries", "Caching and authorization layers"] },
      { title: "Observer pattern", body: "Notify interested components when an event happens.", bullets: ["Event listeners", "UI updates", "Domain events"] },
      { title: "Command pattern", body: "Represent an action as an object so it can be queued, retried, logged, or undone.", bullets: ["Undo/redo", "Job queues", "Audit trails"] },
      { title: "State pattern", body: "Move state-specific behavior into explicit state objects.", bullets: ["Order lifecycle", "Workflow engines", "Avoid giant conditional logic"] },
      { title: "Repository pattern", body: "Isolate domain logic from persistence details.", bullets: ["Query abstraction", "Mockable persistence", "Transaction boundaries"] },
      { title: "Unit of Work", body: "Track a group of changes and commit them atomically.", bullets: ["Transactional consistency", "Change tracking", "Commit/rollback boundary"] },
      { title: "Domain entities", body: "Model objects with identity and lifecycle.", bullets: ["Stable identity", "Mutable lifecycle", "Business behavior lives with data"] },
      { title: "Value objects", body: "Model immutable concepts identified by their value rather than identity.", bullets: ["Money", "Address", "Date ranges"] },
      { title: "Aggregates", body: "Group entities around consistency boundaries and invariant ownership.", bullets: ["Aggregate root", "Invariant enforcement", "Transactional boundary"] },
      { title: "Domain services", body: "Place domain behavior that does not naturally belong to one entity.", bullets: ["Pure business operation", "No infrastructure leakage", "Coordinates entities"] },
      { title: "Application services", body: "Orchestrate use cases without hiding business rules in controllers.", bullets: ["Input/output DTOs", "Transaction boundary", "Calls domain and gateways"] },
      { title: "DTOs and mappers", body: "Separate external API shapes from internal domain models.", bullets: ["Request/response DTOs", "Mapping layer", "Avoid exposing internals"] },
      { title: "Validation design", body: "Separate syntactic validation, business validation, and authorization checks.", bullets: ["Field-level validation", "Cross-field rules", "Domain invariant checks"] },
      { title: "Error handling", body: "Design clear recoverable errors, programmer errors, and user-facing messages.", bullets: ["Typed/domain errors", "Exception boundaries", "Retryable vs non-retryable"] },
      { title: "State machines", body: "Represent lifecycle transitions explicitly when objects move through known states.", bullets: ["Allowed transitions", "Invalid state protection", "Transition side effects"] },
      { title: "Idempotent operations", body: "Make commands safe to repeat after retries or duplicate requests.", bullets: ["Idempotency keys", "Deduplication records", "Safe replays"] },
      { title: "Concurrency and thread safety", body: "Protect shared mutable state in multi-threaded or async systems.", bullets: ["Locks and synchronization", "Immutable data", "Race condition prevention"] },
      { title: "Immutability", body: "Use immutable objects to simplify reasoning and concurrent behavior.", bullets: ["Value objects", "Copy-on-write", "Defensive copies"] },
      { title: "Event-driven LLD", body: "Model local events and handlers without making the domain depend on infrastructure.", bullets: ["Domain events", "Event handlers", "Outbox boundary"] },
      { title: "Dependency injection", body: "Supply collaborators from the outside to keep code configurable and testable.", bullets: ["Constructor injection", "Interface-based dependencies", "Avoid service locator abuse"] },
      { title: "Layered architecture", body: "Organize code into presentation, application, domain, and infrastructure layers.", bullets: ["Dependency direction", "Layer responsibilities", "Avoid business logic in controllers"] },
      { title: "Hexagonal architecture", body: "Keep the domain at the center with ports for external systems.", bullets: ["Driving adapters", "Driven adapters", "Infrastructure as plugin"] },
      { title: "MVC and MVVM", body: "Structure UI-facing systems by separating presentation state, view, and business logic.", bullets: ["Controllers/view models", "View updates", "Testable presentation logic"] },
      { title: "API design at class level", body: "Make method names, parameters, and return types clear and hard to misuse.", bullets: ["Intent-revealing names", "Small parameter lists", "Avoid boolean traps"] },
      { title: "Extensibility design", body: "Plan where variation is expected and keep the rest simple.", bullets: ["Extension points", "Plugin registry", "Configuration vs code"] },
      { title: "Configuration design", body: "Represent feature flags, limits, and runtime behavior safely.", bullets: ["Typed config", "Defaults and validation", "Dynamic reload risks"] },
      { title: "Persistence mapping", body: "Map domain objects to relational or document storage without coupling everything to the database.", bullets: ["ORM boundaries", "Lazy loading hazards", "Schema-domain mismatch"] },
      { title: "Transaction boundaries", body: "Choose where a use case starts and commits data changes.", bullets: ["Atomic use cases", "Avoid long transactions", "External calls outside transactions"] },
      { title: "Caching in LLD", body: "Add local or service-level caches without polluting business logic.", bullets: ["Cache decorator", "Invalidation ownership", "Staleness policy"] },
      { title: "Logging and auditability", body: "Design logs and audit events as part of important workflows.", bullets: ["Structured logs", "Audit event model", "Correlation IDs"] },
      { title: "Unit testing", body: "Test domain behavior quickly without external infrastructure.", bullets: ["Arrange-act-assert", "Behavior-focused tests", "No brittle implementation tests"] },
      { title: "Mocks, fakes, and stubs", body: "Use test doubles intentionally based on what you need to verify.", bullets: ["Mocks for interactions", "Fakes for realistic behavior", "Stubs for fixed responses"] },
      { title: "Integration and contract tests", body: "Verify boundaries between modules, services, databases, and external APIs.", bullets: ["Consumer-driven contracts", "Database integration tests", "API compatibility"] },
      { title: "Refactoring principles", body: "Improve design safely through small behavior-preserving steps.", bullets: ["Extract class/method", "Replace conditional with polymorphism", "Characterization tests"] },
      { title: "Code smells", body: "Recognize design pressure before it becomes expensive to change.", bullets: ["God object", "Feature envy", "Shotgun surgery"] },
      { title: "UML and design diagrams", body: "Use diagrams to communicate relationships, not to decorate the answer.", bullets: ["Class diagrams", "Sequence diagrams", "State diagrams"] },
      { title: "LLD interview classics", body: "Practice common object-design prompts that combine state, extensibility, and constraints.", bullets: ["Parking lot, elevator, library", "Chess, snake and ladder, vending machine", "Logger, cache, rate limiter"] },
      { title: "Maintainability tradeoffs", body: "Balance simplicity, extensibility, performance, and team comprehension.", bullets: ["YAGNI vs future-proofing", "Cognitive load", "Clear ownership"] },
    ],
  },
  {
    slug: "complex-engineering-algorithms",
    title: "Complex Engineering Algorithms",
    subtitle: "Real-world algorithms and data structures behind distributed systems, databases, maps, and observability.",
    eyebrow: "Distributed systems algorithms",
    description:
      "These are the heavy hitters that show up inside Kafka, Dynamo-style stores, Kubernetes, databases, search engines, map systems, caches, and global-scale services.",
    href: "/system-design/complex-engineering-algorithms",
    items: [
      {
        title: "Paxos",
        body: "A family of consensus algorithms for getting distributed nodes to agree on a value despite failures.",
        bullets: ["Used to reason about replicated state machines", "Hard to explain cleanly, but foundational", "Core ideas: proposers, acceptors, quorums, ballots"],
      },
      {
        title: "Raft",
        body: "A more understandable consensus algorithm used for replicated logs and leader-based coordination.",
        bullets: ["Leader election", "Log replication", "Safety through terms, majorities, and committed entries"],
      },
      {
        title: "Consistent hashing",
        body: "A partitioning algorithm that minimizes key movement when nodes join or leave a cluster.",
        bullets: ["Popular in caches and distributed KV stores", "Virtual nodes reduce imbalance", "Alternative: rendezvous hashing"],
      },
      {
        title: "Rendezvous hashing",
        body: "A simple placement algorithm that picks the highest-scoring node for a key.",
        bullets: ["Great for shard assignment", "Minimal disruption on membership changes", "Often simpler than hash rings"],
      },
      {
        title: "H3 geospatial indexing",
        body: "Uber's hexagonal hierarchical spatial index for representing locations and regions at multiple resolutions.",
        bullets: ["Useful for maps, delivery, mobility, and local search", "Neighbor traversal and radius queries", "Hierarchical cells make aggregation easier"],
      },
      {
        title: "Geohash and S2 cells",
        body: "Spatial indexing approaches for converting latitude/longitude into searchable cell IDs.",
        bullets: ["Prefix/range queries for nearby places", "S2 uses cells on a sphere", "Trade precision, boundary behavior, and query fanout"],
      },
      {
        title: "CRDTs",
        body: "Conflict-free replicated data types allow independent replicas to merge updates without coordination.",
        bullets: ["Used in collaborative editing and offline-first systems", "Convergent merge semantics", "Examples: G-Counter, OR-Set, LWW registers"],
      },
      {
        title: "Vector clocks",
        body: "A logical clock structure that captures causal relationships between distributed events.",
        bullets: ["Detect concurrent writes", "Used in Dynamo-style systems", "More expressive than single timestamps"],
      },
      {
        title: "Merkle trees",
        body: "Hash trees that efficiently compare large replicated datasets and identify differences.",
        bullets: ["Anti-entropy repair", "Git/blockchain/storage verification", "Compare roots, then recurse only into mismatched branches"],
      },
      {
        title: "Bloom filters",
        body: "Probabilistic membership structures with no false negatives and configurable false positives.",
        bullets: ["Avoid unnecessary disk/network lookups", "Used in LSM databases and caches", "Trade memory for false-positive rate"],
      },
      {
        title: "HyperLogLog",
        body: "A probabilistic algorithm for approximate distinct counts at massive scale.",
        bullets: ["Used for analytics cardinality", "Tiny memory footprint", "Great for dashboards, not exact billing"],
      },
      {
        title: "Count-Min Sketch",
        body: "A probabilistic frequency table for approximate heavy-hitter and stream-count queries.",
        bullets: ["Useful for abuse detection and trending items", "Overestimates counts", "Memory efficient for large streams"],
      },
      {
        title: "LSM trees",
        body: "Write-optimized storage structures behind databases like RocksDB, Cassandra, LevelDB, and many KV stores.",
        bullets: ["Memtable plus immutable sorted files", "Compaction trades write amplification for read efficiency", "Bloom filters help skip files"],
      },
      {
        title: "B+ trees",
        body: "Read-optimized index structures widely used in relational databases and filesystems.",
        bullets: ["High fanout keeps tree shallow", "Range scans are efficient", "Great for ordered indexes and OLTP workloads"],
      },
    ],
  },
  {
    slug: "books",
    title: "Engineering Books",
    subtitle: "A compact reading shelf for software and systems interviews.",
    eyebrow: "Books and references",
    description:
      "Read selectively: one systems book, one reliability book, one architecture book, and one software-craft book is enough to level up fast.",
    href: "/system-design/books",
    items: [
      { title: "Designing Data-Intensive Applications", body: "The best foundation for storage, replication, partitioning, consistency, and streams.", bullets: ["Data models", "Distributed systems", "Batch and stream processing"] },
      { title: "System Design Interview", body: "Practical interview-style examples and solution framing.", bullets: ["Common prompts", "Back-of-envelope estimation", "Tradeoff language"] },
      { title: "Database Internals", body: "A deeper look at how storage engines and distributed databases work.", bullets: ["B-trees and LSM trees", "Transactions", "Distributed storage"] },
      { title: "Site Reliability Engineering", body: "Operational thinking for reliability, SLOs, incident response, and automation.", bullets: ["SLOs and error budgets", "Monitoring", "Postmortems"] },
      { title: "Release It!", body: "Patterns for building systems that survive real production failures.", bullets: ["Stability patterns", "Timeouts and circuit breakers", "Capacity planning"] },
      { title: "Clean Architecture", body: "A useful mental model for boundaries and dependency direction.", bullets: ["Entities and use cases", "Dependency rule", "Testable architecture"] },
      { title: "Refactoring", body: "Improves your ability to discuss maintainable code and incremental design improvement.", bullets: ["Code smells", "Small transformations", "Safer redesign"] },
      { title: "Effective Java", body: "Excellent LLD and API design lessons, even if your interview language is different.", bullets: ["Immutability", "Generics", "Concurrency practices"] },
    ],
  },
];

export function getLearningResources(): LearningResource[] {
  return RESOURCES;
}

export function getLearningResource(slug: string): LearningResource | null {
  return RESOURCES.find((resource) => resource.slug === slug) ?? null;
}

export function learningItemSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function learningItemHref(resourceSlug: string, itemTitle: string): string {
  return `/system-design/topics/${resourceSlug}/${learningItemSlug(itemTitle)}`;
}

export function getLearningResourceItem(resourceSlug: string, itemSlug: string) {
  const resource = getLearningResource(resourceSlug);
  if (!resource) return null;
  const item = resource.items.find((entry) => (entry.slug ?? learningItemSlug(entry.title)) === itemSlug);
  return item ? { resource, item } : null;
}
