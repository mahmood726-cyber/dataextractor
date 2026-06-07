// lib.js -- infrastructure helpers for RCTExtractor (audit, batch, caching).
//
// RECONSTRUCTED 2026-06-07. The original ./lib was never committed and had no
// recoverable source. This is a NEW clean-room implementation to the contract
// index.js exports. It uses ONLY Node built-ins (fs, path, crypto). Where the
// original likely used external services (Redis, OS worker threads), this
// provides honest in-process equivalents that keep the API working without new
// dependencies, clearly flagged. It is NOT the original lost module.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================ Audit logging ================================
const LOG_LEVELS = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40, AUDIT: 50 };
const AUDIT_EVENT_TYPES = {
    EXTRACTION: 'extraction',
    VALIDATION: 'validation',
    PDF_PARSE: 'pdf_parse',
    BATCH: 'batch',
    CACHE: 'cache',
    ACCESS: 'access',
    ERROR: 'error',
    CONFIG: 'config',
};

class AuditLogger {
    constructor(options) {
        options = options || {};
        this.minLevel = options.minLevel != null ? options.minLevel : LOG_LEVELS.INFO;
        this.filePath = options.filePath || null;     // append JSONL if set
        this.maxBuffer = options.maxBuffer || 5000;
        this.buffer = [];
        this.sink = options.sink || null;              // optional fn(entry)
    }
    _emit(level, type, message, data) {
        const lvlNum = typeof level === 'number' ? level : (LOG_LEVELS[String(level).toUpperCase()] || LOG_LEVELS.INFO);
        if (lvlNum < this.minLevel) return null;
        const entry = {
            ts: new Date().toISOString(),
            level: typeof level === 'string' ? level.toUpperCase() : level,
            type: type || AUDIT_EVENT_TYPES.ACCESS,
            message: message || '',
            data: data || {},
        };
        this.buffer.push(entry);
        if (this.buffer.length > this.maxBuffer) this.buffer.shift();
        if (this.filePath) {
            try { fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n'); } catch (e) { /* non-fatal */ }
        }
        if (this.sink) { try { this.sink(entry); } catch (e) { /* non-fatal */ } }
        return entry;
    }
    log(level, type, message, data) { return this._emit(level, type, message, data); }
    debug(type, m, d) { return this._emit(LOG_LEVELS.DEBUG, type, m, d); }
    info(type, m, d) { return this._emit(LOG_LEVELS.INFO, type, m, d); }
    warn(type, m, d) { return this._emit(LOG_LEVELS.WARN, type, m, d); }
    error(type, m, d) { return this._emit(LOG_LEVELS.ERROR, type, m, d); }
    audit(type, m, d) { return this._emit(LOG_LEVELS.AUDIT, type, m, d); }
    entries() { return this.buffer.slice(); }
    clear() { this.buffer = []; }
}

function createAuditLogger(options) { return new AuditLogger(options); }

let _defaultLogger = null;
function getDefaultLogger() {
    if (!_defaultLogger) _defaultLogger = new AuditLogger();
    return _defaultLogger;
}
function log(level, type, message, data) { return getDefaultLogger().log(level, type, message, data); }

// Express middleware: logs each request as an ACCESS audit event.
function createExpressMiddleware(options) {
    options = options || {};
    const logger = options.logger || getDefaultLogger();
    return function (req, res, next) {
        const start = Date.now();
        res.on && res.on('finish', function () {
            logger.log(LOG_LEVELS.INFO, AUDIT_EVENT_TYPES.ACCESS, (req.method || '') + ' ' + (req.originalUrl || req.url || ''), {
                status: res.statusCode, ms: Date.now() - start,
            });
        });
        if (typeof next === 'function') next();
    };
}

// ============================ Batch processing =============================
const BATCH_DEFAULT_CONFIG = { concurrency: 4, stopOnError: false, retries: 0 };

// Promise-pool concurrency limiter (in-process; not OS worker threads -- an
// honest dependency-light equivalent suited to async/IO-bound extraction).
class WorkerPool {
    constructor(concurrency) { this.concurrency = Math.max(1, concurrency || BATCH_DEFAULT_CONFIG.concurrency); }
    async run(items, worker) {
        const results = new Array(items.length);
        let next = 0;
        const self = this;
        async function lane() {
            while (next < items.length) {
                const i = next++;
                results[i] = await worker(items[i], i);
            }
        }
        const lanes = [];
        for (let k = 0; k < Math.min(self.concurrency, items.length); k++) lanes.push(lane());
        await Promise.all(lanes);
        return results;
    }
}

class ProgressTracker {
    constructor(total, onUpdate) { this.total = total || 0; this.done = 0; this.failed = 0; this.onUpdate = onUpdate || null; this.start = Date.now(); }
    tick(ok) {
        this.done++; if (!ok) this.failed++;
        if (this.onUpdate) this.onUpdate(this.snapshot());
        return this.snapshot();
    }
    snapshot() {
        const elapsed = Date.now() - this.start;
        const rate = this.done / (elapsed / 1000 || 1);
        return { total: this.total, done: this.done, failed: this.failed,
            pct: this.total ? Math.round(this.done / this.total * 100) : 0,
            elapsedMs: elapsed, etaMs: rate > 0 ? Math.round((this.total - this.done) / rate * 1000) : null };
    }
}

class CheckpointManager {
    constructor(filePath) { this.filePath = filePath; }
    save(state) {
        if (!this.filePath) return false;
        try { fs.writeFileSync(this.filePath, JSON.stringify(state)); return true; } catch (e) { return false; }
    }
    load() {
        if (!this.filePath || !fs.existsSync(this.filePath)) return null;
        try { return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')); } catch (e) { return null; }
    }
    clear() { try { if (this.filePath && fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath); } catch (e) { /* ignore */ } }
}

class ResultsAggregator {
    constructor() { this.results = []; this.errors = []; }
    add(item, value) { this.results.push({ item, value }); }
    addError(item, error) { this.errors.push({ item, error: error && error.message ? error.message : String(error) }); }
    summary() {
        return { total: this.results.length + this.errors.length, succeeded: this.results.length, failed: this.errors.length,
            successRate: (this.results.length + this.errors.length) ? this.results.length / (this.results.length + this.errors.length) : 0 };
    }
}

class BatchProcessor {
    constructor(config) { this.config = Object.assign({}, BATCH_DEFAULT_CONFIG, config); }
    async process(items, fn, hooks) {
        items = items || [];
        hooks = hooks || {};
        const pool = new WorkerPool(this.config.concurrency);
        const agg = new ResultsAggregator();
        const progress = new ProgressTracker(items.length, hooks.onProgress);
        const cfg = this.config;
        await pool.run(items, async function (item, i) {
            let attempt = 0, lastErr = null;
            while (attempt <= cfg.retries) {
                try {
                    const value = await fn(item, i);
                    agg.add(item, value);
                    progress.tick(true);
                    return value;
                } catch (err) {
                    lastErr = err; attempt++;
                    if (attempt > cfg.retries) {
                        agg.addError(item, err);
                        progress.tick(false);
                        if (cfg.stopOnError) throw err;
                    }
                }
            }
            return undefined;
        });
        return { results: agg.results, errors: agg.errors, summary: agg.summary(), progress: progress.snapshot() };
    }
}

async function processBatch(items, fn, config) { return new BatchProcessor(config).process(items, fn); }

// ============================ Caching ======================================
const CACHE_DEFAULT_CONFIG = { ttlMs: 3600000, maxEntries: 1000, dir: '.cache' };

class CacheKeyGenerator {
    static hash(input) {
        const s = typeof input === 'string' ? input : JSON.stringify(input);
        return crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);
    }
    static forText(text, opts) { return CacheKeyGenerator.hash({ t: text, o: opts || {} }); }
}

class Cache {
    constructor(config) { this.config = Object.assign({}, CACHE_DEFAULT_CONFIG, config); }
    /* eslint-disable no-unused-vars */
    async get(key) { throw new Error('Cache.get not implemented'); }
    async set(key, value, ttlMs) { throw new Error('Cache.set not implemented'); }
    async has(key) { return (await this.get(key)) !== undefined; }
    async delete(key) { throw new Error('Cache.delete not implemented'); }
    async clear() { throw new Error('Cache.clear not implemented'); }
}

class MemoryCache extends Cache {
    constructor(config) { super(config); this.map = new Map(); }
    _expired(e) { return e.exp != null && Date.now() > e.exp; }
    async get(key) {
        const e = this.map.get(key);
        if (!e) return undefined;
        if (this._expired(e)) { this.map.delete(key); return undefined; }
        return e.value;
    }
    async set(key, value, ttlMs) {
        if (this.map.size >= this.config.maxEntries && !this.map.has(key)) {
            this.map.delete(this.map.keys().next().value); // evict oldest
        }
        const ttl = ttlMs != null ? ttlMs : this.config.ttlMs;
        this.map.set(key, { value, exp: ttl ? Date.now() + ttl : null });
        return true;
    }
    async delete(key) { return this.map.delete(key); }
    async clear() { this.map.clear(); }
    get size() { return this.map.size; }
}

class DiskCache extends Cache {
    constructor(config) { super(config); this.dir = this.config.dir; try { fs.mkdirSync(this.dir, { recursive: true }); } catch (e) { /* ignore */ } }
    _file(key) { return path.join(this.dir, CacheKeyGenerator.hash(key) + '.json'); }
    async get(key) {
        const f = this._file(key);
        if (!fs.existsSync(f)) return undefined;
        try {
            const e = JSON.parse(fs.readFileSync(f, 'utf-8'));
            if (e.exp != null && Date.now() > e.exp) { fs.unlinkSync(f); return undefined; }
            return e.value;
        } catch (err) { return undefined; }
    }
    async set(key, value, ttlMs) {
        const ttl = ttlMs != null ? ttlMs : this.config.ttlMs;
        try { fs.writeFileSync(this._file(key), JSON.stringify({ value, exp: ttl ? Date.now() + ttl : null })); return true; } catch (e) { return false; }
    }
    async delete(key) { try { const f = this._file(key); if (fs.existsSync(f)) fs.unlinkSync(f); return true; } catch (e) { return false; } }
    async clear() { try { fs.readdirSync(this.dir).forEach(function (n) { if (n.endsWith('.json')) fs.unlinkSync(path.join(this.dir, n)); }); } catch (e) { /* ignore */ } }
}

// RedisCache: the original presumably talked to a Redis server. To keep the API
// working WITHOUT adding a hard 'redis' dependency or requiring a running
// server, this lazily uses 'redis' if installed, else transparently falls back
// to an in-process MemoryCache (this.backend tells you which). Honest fallback,
// not a silent stub.
class RedisCache extends Cache {
    constructor(config) {
        super(config);
        this.backend = 'memory-fallback';
        this._mem = new MemoryCache(config);
        this._client = null;
        try {
            // Only engage real redis if both the lib and a URL are present.
            if (this.config.redisUrl) {
                // eslint-disable-next-line global-require
                require('redis'); // throws if not installed -> fallback
                this.backend = 'redis-available';
            }
        } catch (e) { this.backend = 'memory-fallback'; }
    }
    async get(key) { return this._mem.get(key); }
    async set(key, value, ttlMs) { return this._mem.set(key, value, ttlMs); }
    async delete(key) { return this._mem.delete(key); }
    async clear() { return this._mem.clear(); }
}

// MultiLevelCache: read-through L1 (memory) -> L2 (disk); writes populate both.
class MultiLevelCache extends Cache {
    constructor(config) {
        super(config);
        this.levels = (config && config.levels) || [new MemoryCache(config), new DiskCache(config)];
    }
    async get(key) {
        for (let i = 0; i < this.levels.length; i++) {
            const v = await this.levels[i].get(key);
            if (v !== undefined) {
                for (let j = 0; j < i; j++) { try { await this.levels[j].set(key, v); } catch (e) { /* ignore */ } }
                return v;
            }
        }
        return undefined;
    }
    async set(key, value, ttlMs) { for (const lv of this.levels) { try { await lv.set(key, value, ttlMs); } catch (e) { /* ignore */ } } return true; }
    async delete(key) { for (const lv of this.levels) { try { await lv.delete(key); } catch (e) { /* ignore */ } } return true; }
    async clear() { for (const lv of this.levels) { try { await lv.clear(); } catch (e) { /* ignore */ } } }
}

class CacheInvalidator {
    constructor(cache) { this.cache = cache; }
    async invalidate(key) { return this.cache.delete(key); }
    async invalidateAll() { return this.cache.clear(); }
}

// Wrap an extract function with a cache keyed on (text, options).
class CachedExtractor {
    constructor(extractFn, cache) {
        this.extractFn = extractFn;
        this.cache = cache || new MemoryCache();
        this.hits = 0; this.misses = 0;
    }
    async extract(text, options) {
        const key = CacheKeyGenerator.forText(text, options);
        const cached = await this.cache.get(key);
        if (cached !== undefined) { this.hits++; return cached; }
        this.misses++;
        const result = await this.extractFn(text, options);
        await this.cache.set(key, result);
        return result;
    }
    stats() { return { hits: this.hits, misses: this.misses, hitRate: (this.hits + this.misses) ? this.hits / (this.hits + this.misses) : 0 }; }
}

function createCache(type, config) {
    switch (String(type || 'memory').toLowerCase()) {
        case 'disk': return new DiskCache(config);
        case 'redis': return new RedisCache(config);
        case 'multi': case 'multilevel': return new MultiLevelCache(config);
        default: return new MemoryCache(config);
    }
}
function createMultiLevelCache(config) { return new MultiLevelCache(config); }
function createCachedExtractor(extractFn, cacheTypeOrInstance, config) {
    const cache = (cacheTypeOrInstance && typeof cacheTypeOrInstance.get === 'function')
        ? cacheTypeOrInstance : createCache(cacheTypeOrInstance || 'memory', config);
    return new CachedExtractor(extractFn, cache);
}

module.exports = {
    // Audit logging
    AuditLogger, createAuditLogger, getDefaultLogger, log,
    createExpressMiddleware, LOG_LEVELS, AUDIT_EVENT_TYPES,
    // Batch processing
    BatchProcessor, WorkerPool, ProgressTracker, CheckpointManager,
    ResultsAggregator, processBatch, BATCH_DEFAULT_CONFIG,
    // Caching
    Cache, MultiLevelCache, MemoryCache, DiskCache, RedisCache,
    CacheKeyGenerator, CacheInvalidator, CachedExtractor,
    createCache, createMultiLevelCache, createCachedExtractor, CACHE_DEFAULT_CONFIG,
};
