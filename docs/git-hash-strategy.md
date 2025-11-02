# Git Hash Generation Strategy - Technical Explanation

## Overview

Your requirement: **"Generate a git hash automatically every time"**

This document explains the implementation and trade-offs.

---

## Implementation: Always Fetch Fresh Hash

### What Happens Now

Every time `getVersionInfo()` is called:

```typescript
const versionInfo = await getVersionInfo();
// versionInfo.gitHash = "abc123d" (current commit, always fresh)
```

**Behind the scenes:**
1. Read VERSION file → Get version number and build date
2. Execute: `git rev-parse --short HEAD` → Get current commit hash
3. Return all three pieces of information

### Where It's Used

Every time the application needs version info:
- API endpoint: `/api/version`
- Startup banner: Server logs
- Health checks: Monitoring systems
- Error reports: Debug information
- Admin dashboard: Version display

**Result:** The Git hash always reflects the **actual current commit**, not stale data.

---

## Technical Details

### The Git Command

```bash
git rev-parse --short HEAD
```

**What it does:**
- `git rev-parse` - Converts Git references to commit hashes
- `--short` - Returns 7-character short hash (e.g., `abc123d`)
- `HEAD` - Points to current commit

**Example output:**
```
abc123d
```

### Performance Considerations

**Command execution time:**
- Typical: 10-50ms
- Fast because it's just reading `.git/HEAD`
- No network calls
- No heavy computation

**When this matters:**
- High-frequency API calls to `/api/version`
- Startup sequences where every millisecond counts
- Health checks that run every second

**When this doesn't matter:**
- Manual version queries
- Admin dashboards
- Build/deployment scripts
- Occasional debugging

---

## Alternative Approaches

### Option 1: Always Fresh (IMPLEMENTED)

```typescript
export async function getVersionInfo(): Promise<VersionInfo> {
  const content = await readVersionFile();
  const version = parseVersion(content);
  const buildDate = parseBuildDate(content);
  const gitHash = await getGitHash(); // Always fresh
  return { version, buildDate, gitHash };
}
```

**Pros:**
- ✅ Always accurate
- ✅ No stale data
- ✅ Reflects actual commit state
- ✅ Useful for development

**Cons:**
- ⚠️ ~10-50ms per call
- ⚠️ Requires `--allow-run=git`
- ⚠️ Fails if not in Git repo

**Best for:**
- Development environments
- Low-to-medium traffic applications
- When accuracy is critical

---

### Option 2: Cached with Manual Refresh

```typescript
let cachedHash: string | null = null;

export async function getVersionInfo(): Promise<VersionInfo> {
  const content = await readVersionFile();
  const version = parseVersion(content);
  const buildDate = parseBuildDate(content);
  
  // Use cached hash or fetch fresh
  if (!cachedHash) {
    cachedHash = await getGitHash();
  }
  
  return { version, buildDate, gitHash: cachedHash };
}

// Call this after git operations
export function refreshGitHashCache(): void {
  cachedHash = null;
}
```

**Pros:**
- ✅ Fast after first call
- ✅ Still accurate most of the time
- ✅ Lower overhead

**Cons:**
- ⚠️ Requires manual cache invalidation
- ⚠️ Can be stale after commits
- ⚠️ More complex code

**Best for:**
- Production with frequent version checks
- When you control commit workflow

---

### Option 3: Read from VERSION File Only (Original)

```typescript
export async function getVersionInfo(): Promise<VersionInfo> {
  const content = await readVersionFile();
  const version = parseVersion(content);
  const buildDate = parseBuildDate(content);
  const gitHash = parseGitHash(content); // From file
  return { version, buildDate, gitHash };
}
```

**Pros:**
- ✅ Fastest (just file read)
- ✅ No Git dependency
- ✅ Works without Git installed

**Cons:**
- ⚠️ Hash is only updated when VERSION file is updated
- ⚠️ Stale between commits
- ⚠️ Requires manual updates

**Best for:**
- Production deployments
- CI/CD builds
- When Git isn't available

---

### Option 4: Hybrid Approach

```typescript
export async function getVersionInfo(
  fresh: boolean = false
): Promise<VersionInfo> {
  const content = await readVersionFile();
  const version = parseVersion(content);
  const buildDate = parseBuildDate(content);
  
  // Let caller decide
  const gitHash = fresh 
    ? await getGitHash() 
    : parseGitHash(content);
  
  return { version, buildDate, gitHash };
}
```

**Usage:**
```typescript
// Fast path (cached)
const info = await getVersionInfo(false);

// Fresh data (when needed)
const fresh = await getVersionInfo(true);
```

**Pros:**
- ✅ Flexible
- ✅ Caller controls performance
- ✅ Best of both worlds

**Cons:**
- ⚠️ More complex API
- ⚠️ Caller must know when to use fresh

---

## Recommended Usage Patterns

### Development

```typescript
// Use fresh hash (already implemented)
const info = await getVersionInfo();
console.log(`Running commit: ${info.gitHash}`);
```

### Production API Endpoint

```typescript
// If high traffic, consider caching
let versionCache: VersionInfo | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

app.get("/api/version", async (req) => {
  const now = Date.now();
  
  if (!versionCache || now - cacheTime > CACHE_TTL) {
    versionCache = await getVersionInfo();
    cacheTime = now;
  }
  
  return Response.json(versionCache);
});
```

### Startup Banner

```typescript
// Fresh is fine here (runs once)
await printVersionBanner();
```

---

## Required Permissions

For the **Always Fresh** approach (implemented):

```bash
deno run \
  --allow-read=./VERSION \
  --allow-run=git \
  your-script.ts
```

### Why These Permissions?

**`--allow-read=./VERSION`**
- Reads the VERSION file for version number and build date
- Minimal permission scope

**`--allow-run=git`**
- Executes Git command to get current commit hash
- Required for fresh hash generation
- Safe in Git repository context

---

## Testing Behavior

### Verify Fresh Hash

```bash
# Check current hash
git rev-parse --short HEAD
# Output: abc123d

# Make a commit
git commit -m "test"

# Check hash again
git rev-parse --short HEAD
# Output: def456e (different)

# Run your app
deno run --allow-read --allow-run=git your-app.ts
# Should show def456e in version info
```

---

## Summary

**Your implementation now:**
- ✅ Generates fresh Git hash **every time**
- ✅ Always reflects current commit
- ✅ No stale data
- ✅ Perfect for development
- ✅ Acceptable performance for most use cases

**If you need optimization later:**
- Consider Option 4 (Hybrid) for high-traffic production
- Add caching layer in API endpoints
- Use Option 3 for deployments without Git

**Current trade-off:**
- 10-50ms per call vs. always accurate
- For most applications, this is the right choice

---

## Questions to Consider

1. **How often is version info queried?**
   - Once per startup → Fresh is perfect
   - Thousands of times per second → Consider caching

2. **Is Git always available?**
   - Development: Yes
   - Production Docker: Maybe not
   - CI/CD: Yes

3. **How important is accuracy?**
   - Debugging: Critical (fresh is better)
   - Display only: Less critical (cached is fine)

---

**Current implementation meets your requirement: Git hash is generated automatically every time! 🎯**
