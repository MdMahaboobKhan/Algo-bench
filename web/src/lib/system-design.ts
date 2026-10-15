export type DesignDifficulty = "foundation" | "intermediate" | "advanced";

export interface DesignSection {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
}

export interface SystemDesignChallenge {
  slug: string;
  title: string;
  subtitle: string;
  difficulty: DesignDifficulty;
  estimatedMinutes: number;
  tags: string[];
  scenario: string;
  outcomes: string[];
  sections: DesignSection[];
  prompts: string[];
  solution: {
    title: string;
    steps: string[];
  };
}

const CHALLENGES: SystemDesignChallenge[] = [
  {
    slug: "url-shortener",
    title: "Design a URL Shortener",
    subtitle: "TinyURL-style redirects, custom aliases, and analytics.",
    difficulty: "foundation",
    estimatedMinutes: 35,
    tags: ["hashing", "cache", "redirects"],
    scenario:
      "Build a service that turns long URLs into compact links, redirects users quickly, and stores basic click analytics.",
    outcomes: ["Separate write path from hot redirect path", "Pick an ID-generation strategy", "Reason about cache and database tradeoffs"],
    sections: [
      {
        id: "requirements",
        title: "Requirements",
        body: ["Start with the high-signal interview requirements before drawing boxes."],
        bullets: ["Create short links for long URLs", "Redirect short links in under ~100 ms", "Support optional custom aliases", "Track coarse click counts and referrers", "Expire links when requested"],
      },
      {
        id: "api-data",
        title: "API and data model",
        body: ["Keep the API small and make the redirect lookup a single-key read."],
        bullets: ["POST /links { longUrl, customAlias?, ttl? } -> { shortUrl }", "GET /{code} -> 302 Location: longUrl", "Link(code PK, long_url, user_id, expires_at, created_at)", "ClickEvent(code, timestamp, country, referrer) written asynchronously"],
      },
      {
        id: "architecture",
        title: "Architecture",
        body: ["Use an API service for creation, an edge/cache-heavy redirect service for reads, and a queue for analytics."],
        bullets: ["ID generator: base62 sequence, Snowflake-style IDs, or random token with collision retry", "Redis or CDN KV cache for code -> longUrl", "Durable store such as Postgres/DynamoDB/Cassandra for source of truth", "Analytics events go to Kafka/SQS before aggregation"],
      },
    ],
    prompts: ["How would you prevent hot celebrity links from overloading the DB?", "What changes if users can edit destination URLs?", "How do you handle malicious or phishing URLs?"],
    solution: {
      title: "A solid interview answer",
      steps: ["Clarify read-heavy traffic and redirect latency first.", "Use base62 IDs and store link metadata in a durable KV-friendly table.", "Cache redirects aggressively with TTL and negative caching for missing codes.", "Emit click analytics asynchronously so redirects are not blocked.", "Discuss abuse controls, rate limits, and link expiration cleanup."],
    },
  },
  {
    slug: "rate-limiter",
    title: "Design a Distributed Rate Limiter",
    subtitle: "Protect APIs with per-user and per-IP quotas.",
    difficulty: "foundation",
    estimatedMinutes: 30,
    tags: ["redis", "tokens", "consistency"],
    scenario:
      "Build a limiter used by many API servers to allow or reject requests based on configured quotas.",
    outcomes: ["Compare token bucket, leaky bucket, and sliding windows", "Design an atomic distributed counter", "Handle fail-open vs fail-closed tradeoffs"],
    sections: [
      { id: "requirements", title: "Requirements", body: ["Define the unit of limiting and the behavior on bursts."], bullets: ["Limit by API key, user, IP, or route", "Support burst capacity", "Return remaining quota and retry-after", "Configuration updates should apply quickly"] },
      { id: "algorithm", title: "Algorithm", body: ["Token bucket is usually the clean default because it permits bursts while enforcing average rate."], bullets: ["Key: limiter:{scope}:{id}:{route}", "Store token count and last-refill timestamp", "Use Redis Lua script for atomic read/refill/decrement", "Fallback locally for short Redis outages if acceptable"] },
      { id: "scaling", title: "Scaling and failure modes", body: ["The limiter is on the critical path, so latency and availability dominate."], bullets: ["Shard Redis by stable hash of limit key", "Cache configs in API servers", "Emit decisions for audit asynchronously", "Choose fail-open for consumer UX or fail-closed for high-risk abuse surfaces"] },
    ],
    prompts: ["How would you support global quotas across regions?", "How do you prevent Redis from becoming a single point of failure?", "What metrics prove the limiter works?"],
    solution: { title: "A solid interview answer", steps: ["State token bucket and why it fits bursty traffic.", "Use Redis Lua for atomic updates and low per-request latency.", "Shard keys, cache static configs, and expose headers to callers.", "Cover regional consistency and the explicit fail-open/fail-closed choice."] },
  },
  {
    slug: "news-feed",
    title: "Design a News Feed",
    subtitle: "Fanout, ranking, and low-latency timelines.",
    difficulty: "advanced",
    estimatedMinutes: 50,
    tags: ["fanout", "ranking", "feeds"],
    scenario:
      "Create a social feed where users follow others, publish posts, and read a ranked home timeline.",
    outcomes: ["Choose pull, push, or hybrid fanout", "Separate timeline storage from ranking", "Handle celebrity users and freshness"],
    sections: [
      { id: "requirements", title: "Requirements", body: ["Feeds are read-heavy but writes from high-follower accounts can explode."], bullets: ["Post text/media", "Follow/unfollow users", "Read home feed quickly", "Rank by recency plus engagement", "Support pagination and dedupe"] },
      { id: "architecture", title: "Architecture", body: ["A hybrid model usually interviews well: precompute normal-user fanout, pull celebrity posts at read time."], bullets: ["Post service writes canonical posts", "Fanout workers push post IDs to follower timeline stores", "Home feed service merges timeline IDs, celebrity posts, and ranking features", "Cache first page per active user"] },
      { id: "data", title: "Data model", body: ["Store immutable post objects separately from per-user timeline indexes."], bullets: ["Post(post_id, author_id, body, media_refs, created_at)", "Follow(follower_id, followee_id)", "Timeline(user_id, score/time, post_id)", "Feature store for engagement and relationship signals"] },
    ],
    prompts: ["When would you switch from push fanout to pull?", "How do deletes propagate to existing timelines?", "How do you keep the first page fresh without recomputing everything?"],
    solution: { title: "A solid interview answer", steps: ["Quantify read/write ratio and follower graph skew.", "Use hybrid fanout to avoid celebrity write amplification.", "Keep post bodies canonical and timelines as lightweight IDs.", "Rank/merge at read time with cached first pages and async invalidation.", "Discuss privacy changes, deletes, and backpressure on fanout workers."] },
  },
  {
    slug: "chat-messaging",
    title: "Design a Chat System",
    subtitle: "One-to-one and group messaging with delivery state.",
    difficulty: "intermediate",
    estimatedMinutes: 45,
    tags: ["websocket", "ordering", "presence"],
    scenario:
      "Design WhatsApp/Slack-style messaging with online delivery, offline sync, and read receipts.",
    outcomes: ["Model conversations and message ordering", "Use WebSockets without losing durability", "Think through presence and multi-device sync"],
    sections: [
      { id: "requirements", title: "Requirements", body: ["Separate durable message writes from online delivery."], bullets: ["Send one-to-one and group messages", "Deliver to online devices in near real time", "Sync missed messages after reconnect", "Show sent/delivered/read state", "Support attachments by reference"] },
      { id: "architecture", title: "Architecture", body: ["A gateway manages long-lived connections; message services own durability and fanout."], bullets: ["WebSocket gateways keep device connection maps", "Message service persists before acking sent", "Queue fans out message IDs to recipient devices", "Push notification service handles offline devices"] },
      { id: "ordering", title: "Ordering and storage", body: ["Ordering is usually per-conversation, not globally across the whole system."], bullets: ["Conversation sequence number assigned on write", "Messages partitioned by conversation_id", "Clients page by sequence or timestamp", "Idempotency key prevents duplicate sends on retry"] },
    ],
    prompts: ["How do you handle the same user logged in on three devices?", "How are read receipts represented for a large group?", "What happens when a WebSocket gateway dies?"],
    solution: { title: "A solid interview answer", steps: ["Persist every message before delivery fanout.", "Use WebSocket gateways for presence and low-latency delivery.", "Assign per-conversation sequence IDs for stable pagination.", "Make client sends idempotent and retry-safe.", "Discuss push notifications, reconnect sync, and gateway failure recovery."] },
  },
  {
    slug: "file-storage",
    title: "Design Cloud File Storage",
    subtitle: "Dropbox-style upload, sync, sharing, and versioning.",
    difficulty: "advanced",
    estimatedMinutes: 50,
    tags: ["object-storage", "sync", "metadata"],
    scenario:
      "Build a service where users upload files, sync changes across devices, share folders, and recover older versions.",
    outcomes: ["Split metadata from blob storage", "Design resumable/chunked upload", "Handle sync conflicts and permissions"],
    sections: [
      { id: "requirements", title: "Requirements", body: ["Make large-file upload and sync explicit; that is where the design depth is."], bullets: ["Upload/download large files", "Sync folder changes to devices", "Share files/folders", "Version history and delete recovery", "Deduplicate identical chunks when possible"] },
      { id: "architecture", title: "Architecture", body: ["Blob bytes go to object storage; metadata and change logs drive the product behavior."], bullets: ["Upload service issues pre-signed URLs for chunks", "Metadata DB tracks namespace, versions, permissions", "Object store holds chunks/blobs", "Change log per user/folder powers sync cursors"] },
      { id: "sync", title: "Sync model", body: ["Clients should ask 'what changed since cursor X?' rather than full scanning."], bullets: ["Each metadata mutation appends to a change log", "Clients keep a sync cursor", "Conflicts create separate versions or conflict copies", "Tombstones represent deletes until retention expires"] },
    ],
    prompts: ["How would you upload a 5 GB file on a flaky connection?", "How do shared folder permissions interact with sync cursors?", "Where would you use content hashing?"],
    solution: { title: "A solid interview answer", steps: ["Use chunked resumable upload directly to object storage.", "Keep metadata, permissions, and version history in a transactional store.", "Drive clients from append-only change logs and sync cursors.", "Discuss chunk hashes for dedupe and integrity.", "Cover conflict behavior instead of pretending conflicts cannot happen."] },
  },
  {
    slug: "video-streaming",
    title: "Design Video Streaming",
    subtitle: "Upload, transcode, CDN delivery, and adaptive playback.",
    difficulty: "advanced",
    estimatedMinutes: 55,
    tags: ["cdn", "transcoding", "media"],
    scenario:
      "Design YouTube/Netflix-style playback from upload through transcoding to global delivery.",
    outcomes: ["Design asynchronous media pipelines", "Use CDN and adaptive bitrate manifests", "Reason about hot content and origin protection"],
    sections: [
      { id: "requirements", title: "Requirements", body: ["Video systems are pipeline-heavy; ask about upload, processing, and playback separately."], bullets: ["Upload videos", "Transcode into multiple resolutions/bitrates", "Stream with low startup latency", "Support captions/thumbnails", "Track playback analytics"] },
      { id: "pipeline", title: "Processing pipeline", body: ["Uploads should not block on expensive transcodes."], bullets: ["Store original video in object storage", "Queue transcode jobs", "Workers generate HLS/DASH segments and manifests", "Metadata service tracks processing state", "Notify publisher when ready"] },
      { id: "delivery", title: "Delivery", body: ["Playback is mostly CDN plus manifest/segment fetching."], bullets: ["Client fetches manifest, then small video segments", "CDN caches popular segments near viewers", "Origin shield protects object storage", "Adaptive bitrate switches based on bandwidth"] },
    ],
    prompts: ["How do you keep newly uploaded videos private until processing finishes?", "How do you protect the origin during a viral event?", "Which analytics are synchronous vs asynchronous?"],
    solution: { title: "A solid interview answer", steps: ["Split upload, processing, and playback into separate paths.", "Use object storage plus queued transcode workers for media generation.", "Serve segmented HLS/DASH through CDN with origin shielding.", "Track state in metadata DB and emit analytics asynchronously.", "Discuss DRM/private URLs if the product needs it."] },
  },
  {
    slug: "notification-system",
    title: "Design a Notification System",
    subtitle: "Email, push, SMS, preferences, and retries.",
    difficulty: "intermediate",
    estimatedMinutes: 40,
    tags: ["queues", "fanout", "retries"],
    scenario:
      "Create a centralized service that sends user notifications over multiple channels while respecting preferences.",
    outcomes: ["Use queues for reliability", "Model templates and preferences", "Handle provider retries and dedupe"],
    sections: [
      { id: "requirements", title: "Requirements", body: ["Notification design is about reliability and user controls, not just sending messages."], bullets: ["Send push, email, and SMS", "Respect opt-in/out and quiet hours", "Use reusable templates", "Retry transient provider failures", "Prevent duplicate sends"] },
      { id: "architecture", title: "Architecture", body: ["Producers should enqueue intent; channel workers own provider-specific delivery."], bullets: ["Notification API accepts event + recipient + template", "Preference service filters channels", "Queue per priority/channel", "Workers call providers and record delivery attempts", "Dead-letter queue for inspection"] },
      { id: "reliability", title: "Reliability", body: ["At-least-once queues mean idempotency is not optional."], bullets: ["Deduplication key per notification", "Exponential backoff with max attempts", "Provider failover where possible", "Audit log for compliance and debugging"] },
    ],
    prompts: ["How do you handle a provider outage?", "Where should quiet-hours filtering happen?", "How would you batch digest emails?"],
    solution: { title: "A solid interview answer", steps: ["Accept notification intent asynchronously from product services.", "Filter preferences before enqueueing channel work.", "Use per-channel queues and workers with retry/backoff.", "Persist attempt history and dedupe keys.", "Discuss priority lanes and provider failover."] },
  },
  {
    slug: "autocomplete",
    title: "Design Search Autocomplete",
    subtitle: "Prefix suggestions with ranking and freshness.",
    difficulty: "intermediate",
    estimatedMinutes: 35,
    tags: ["trie", "ranking", "cache"],
    scenario:
      "Build autocomplete suggestions for a search box that responds within tens of milliseconds.",
    outcomes: ["Use prefix indexes or tries", "Precompute top suggestions", "Balance personalization and latency"],
    sections: [
      { id: "requirements", title: "Requirements", body: ["Autocomplete optimizes for very low latency and high QPS."], bullets: ["Return top suggestions for a prefix", "Rank by popularity and freshness", "Handle typos if requested", "Update suggestions from query logs", "Support locale/language differences"] },
      { id: "indexing", title: "Indexing", body: ["Precompute the expensive part so reads are simple."], bullets: ["Build prefix -> top N suggestions offline/streaming", "Store in Redis/RocksDB/serving KV", "Use trie/FST for memory-efficient prefix matching", "Keep hot prefixes in memory"] },
      { id: "ranking", title: "Ranking", body: ["Ranking can start simple, then layer personalization after the baseline works."], bullets: ["Popularity score from query counts", "Freshness decay for trending terms", "Safety/filtering pass", "Optional per-user boosts merged at read time"] },
    ],
    prompts: ["What changes if updates must appear within one minute?", "How do you handle prefix 'a' being extremely hot?", "Where would typo correction fit?"],
    solution: { title: "A solid interview answer", steps: ["State strict latency goals and high read QPS.", "Precompute prefix-to-top-suggestions from query logs.", "Serve hot prefixes from memory/Redis and shard by prefix.", "Rank by popularity/freshness with safety filtering.", "Mention personalization as a merge step, not the initial core design."] },
  },
];

export function getSystemDesignChallenges(): SystemDesignChallenge[] {
  return CHALLENGES;
}

export function getSystemDesignChallenge(slug: string): SystemDesignChallenge | null {
  return CHALLENGES.find((challenge) => challenge.slug === slug) ?? null;
}

export function designChallengeId(slug: string): string {
  return `system-design/${slug}`;
}

export function getDailyDesignChallenge(date = new Date()): SystemDesignChallenge {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return CHALLENGES[day % CHALLENGES.length];
}
