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

## Files

```
immobilienscout24/
├── src/
│   ├── scraper.ts
│   └── index.ts
└── docs/
    └── API.md
```
