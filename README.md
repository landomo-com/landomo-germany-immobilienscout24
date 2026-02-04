# ImmobilienScout24.de (Germany)

> Germany's largest real estate portal

| | |
|---|---|
| Website | https://www.immobilienscout24.de |
| Listings | ~1,000,000 |
| Scraper | ✅ Working |
| Approach | HTML + API (protected) |

## Architecture

**Redis Queue-Based (Distributed Processing):**
- Phase 1 (Coordinator): Discovers property IDs from search API, pushes to Redis queue
- Phase 2 (Workers): Consume IDs, process properties, send to Core Service
- Supports multiple parallel workers for horizontal scaling
- Persistent queue survives crashes, fully resumable

## Quick Start

### Option 1: Redis Queue Architecture (Recommended)

```bash
# Install dependencies
npm install

# Start Redis
docker-compose up -d redis

# Run coordinator to discover properties (run on schedule)
npm run coordinator

# Start workers to process queue (run multiple for parallel processing)
npm run worker &
npm run worker &
npm run worker &

# Monitor progress
npm run queue:stats

# Retry failed properties
npm run queue:retry-failed
```

### Option 2: Traditional Scraping (Legacy)

```bash
# Install dependencies
npm install

# Scrape Berlin apartments
npm run scrape -- -c berlin -t rent --limit 100

# Scrape Munich for sale
npm run scrape -- -c muenchen -t sale

# Dry run
npm run scrape -- --dryRun
```

## API Endpoints

### Search API
```
GET /Suche/de/{location}/wohnung-{type}
```

### Results API
```
GET /api/search/realty
```

## URL Structure

**Search:**
```
https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten
https://www.immobilienscout24.de/Suche/de/muenchen/muenchen/wohnung-kaufen
```

**Pagination:**
```
?pagenumber=2
```

## Data Fields

| Field | Available |
|-------|:---------:|
| ID | ✅ |
| Title | ✅ |
| Price | ✅ |
| Price Type | ✅ (warm/kalt) |
| Size (m²) | ✅ |
| Rooms | ✅ |
| Floor | ✅ |
| Location | ✅ |
| Coordinates | ✅ |
| Images | ✅ |
| Description | ✅ |
| Agency | ✅ |
| Available From | ✅ |

## Notes

- May require authentication for some features
- Rate limiting applies
- Consider using official API for commercial use

## Redis Queue Architecture

### Overview

Production-grade distributed scraping using Redis queues:

**Phase 1 - Coordinator:**
- Discovers property IDs from ImmobilienScout24 search API
- Pushes to Redis queue with global deduplication
- Runs on schedule (every 6 hours)

**Phase 2 - Workers:**
- Consume property IDs from queue
- Process properties (fetch details, transform, send to Core)
- Support multiple workers for parallel processing
- Automatic retry with exponential backoff

### Benefits

✅ **Persistence** - Queue survives crashes, no data loss
✅ **Resumability** - Stop/resume anytime
✅ **Distributed** - Multiple workers process in parallel
✅ **Scalability** - Horizontal scaling with worker replicas
✅ **Observability** - Real-time stats, progress %, ETA

### Commands

```bash
# Coordinator (discovery)
npm run coordinator        # Discover all German cities

# Workers (processing)
npm run worker             # Start worker (run multiple)

# Queue management
npm run queue:stats        # View statistics
npm run queue:show-failed  # List failed properties
npm run queue:retry-failed # Re-queue failed
npm run queue:clear        # Clear all data
```

### Docker Deployment

```bash
# Start full stack
docker-compose up -d

# Run coordinator (schedule with cron/k8s every 6 hours)
docker-compose run coordinator

# Workers auto-scale (3 replicas by default)
docker-compose logs -f worker

# Check stats
docker-compose run --rm stats
```

## Core Service Integration

This scraper includes full integration with the Landomo Core Service API for standardized data ingestion.

### Configuration

Set up Core Service credentials in `.env`:

```bash
CORE_SERVICE_URL=https://core.landomo.com/api/v1
CORE_SERVICE_API_KEY=your_api_key_here
ENABLE_CORE_SERVICE=true
```

### Data Transformation

Properties are transformed from ImmobilienScout24 format to StandardProperty format:

```typescript
import { transformToStandard } from './transformer';
import { sendToCoreService } from './core-service-client';

// Transform property
const standardized = transformToStandard(property);

// Send to Core Service
await sendToCoreService(portalId, standardized, property);
```

### Germany-Specific Fields

The transformer includes German market conventions in `country_specific`:

- `energieausweis` - Energy efficiency class (A+ to H)
- `heizungsart` - Heating type
- `baujahr` - Construction year
- `etage` - Floor number
- `anzahl_etagen` - Total floors
- `verfuegbar_ab` - Available from date
- `stellplatz_typ` - Parking type
- `plz` - Postal code
- `stadtteil` - District/Quarter
- `zustand` - Property condition

### Examples

Run the included examples:

```bash
# Example 1: Individual property ingestion
npm run example 1

# Example 2: Bulk property ingestion
npm run example 2

# Example 3: With health check
npm run example 3

# Example 4: Transform single property (testing)
npm run example 4
```

## Files

```
immobilienscout24/
├── src/
│   ├── scraper.ts              # Main scraper implementation
│   ├── parser.ts               # Parse API responses
│   ├── transformer.ts          # Transform to StandardProperty
│   ├── core-service-client.ts  # Core Service API client
│   ├── config.ts               # Configuration
│   ├── example-core-integration.ts  # Integration examples
│   └── index.ts
├── .env.example
└── README.md
```
