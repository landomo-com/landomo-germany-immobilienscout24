# ImmobilienScout24.de (Germany)

> Germany's largest real estate portal

| | |
|---|---|
| Website | https://www.immobilienscout24.de |
| Listings | ~1,000,000 |
| Scraper | ✅ Working |
| Approach | HTML + API (protected) |

## Quick Start

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
