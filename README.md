# GSTIN Business Contact Discovery API

A production-quality B2B business-contact discovery service for India. Accepts an Indian GSTIN and attempts to identify the corresponding business and find publicly available business contact information.

**Important**: This system only uses legally accessible/public business information. It does NOT scrape, infer, or bypass private taxpayer data.

## Architecture

```
Client → POST /api/v1/lookup → Express API → Validation → BullMQ Queue → Worker
                                                                              ↓
                                                                     GSTIN Lookup
                                                                              ↓
                                                                Business Discovery
                                                                              ↓
                                                               Website Crawling
                                                                              ↓
                                                              Contact Extraction
                                                                              ↓
                                                               Confidence Scoring
                                                                              ↓
                                                               PostgreSQL + Redis
```

## Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- npm

### Using Docker (Recommended)

```bash
docker compose up --build
```

This starts:
- API server on `http://localhost:3000`
- Worker for async processing
- PostgreSQL
- Redis

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start API (terminal 1)
npm run dev

# Start worker (terminal 2)
npm run dev:worker
```

## Environment Variables

See `.env.example` for all available options:

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://...` |
| `REDIS_URL` | Redis connection URL | `redis://...` |
| `GST_PROVIDER` | GST data provider (`mock`, `official`, `authorized_api`) | `mock` |
| `SEARCH_PROVIDER` | Business search provider (`mock`, `google`, `serpapi`) | `mock` |
| `RATE_LIMIT_WINDOW` | Rate limit window in seconds | `3600` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `LOOKUP_CACHE_TTL` | Cache TTL for lookups in seconds | `86400` |

## API Endpoints

### POST /api/v1/lookup

Start a business contact discovery lookup.

```bash
curl -X POST http://localhost:3000/api/v1/lookup \
  -H "Content-Type: application/json" \
  -d '{"gstin":"27ABCDE1234F1Z5"}'
```

Response:

```json
{
  "lookupId": "uuid",
  "status": "pending"
}
```

### GET /api/v1/lookup/:lookupId

Poll for lookup results.

```bash
curl http://localhost:3000/api/v1/lookup/{lookupId}
```

Response:

```json
{
  "status": "completed",
  "business": {
    "gstin": "27ABCDE1234F1Z5",
    "legalName": "ABC Technologies Pvt Ltd",
    "tradeName": "ABC Tech",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400093"
  },
  "contacts": {
    "phones": [
      {
        "number": "+919876543210",
        "confidence": 0.96,
        "sources": [
          { "type": "official_website", "url": "https://example.com/contact" }
        ]
      }
    ],
    "emails": [
      {
        "email": "info@abctechnologies.com",
        "confidence": 0.95,
        "sources": [
          { "type": "official_website", "url": "https://example.com" }
        ]
      }
    ],
    "website": "https://www.abctechnologies.com"
  }
}
```

### GET /api/v1/business/:gstin

Get cached business data.

```bash
curl http://localhost:3000/api/v1/business/27ABCDE1234F1Z5
```

## Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## Mock Providers

The system works in development mode using mock providers. Mock GSTINs:

| GSTIN | Business |
|---|---|
| `27ABCDE1234F1Z5` | ABC Technologies Pvt Ltd (Mumbai) |
| `24ABCDE1234F1Z5` | Gujarat Industrial Solutions Ltd (Ahmedabad) |
| `29ABCDE1234F1Z5` | Bangalore Software Innovations Pvt Ltd (Bangalore) |
| `07ABCDE1234F1Z5` | Delhi Trading Co (Delhi) |

## Adding a GST Provider

1. Implement `GSTProvider` interface in `src/modules/gst/providers/`
2. Add your provider to `src/modules/gst/providers/gst.provider.ts`
3. Set `GST_PROVIDER=your_provider` in `.env`

## Adding a Business Search Provider

1. Implement `BusinessDiscoveryProvider` in `src/modules/discovery/providers/`
2. Add your provider to `src/modules/discovery/providers/provider.ts`
3. Set `SEARCH_PROVIDER=your_provider` in `.env`

## Security

- Helmet for HTTP headers
- CORS configuration
- Rate limiting (configurable)
- SSRF protection (blocks private IPs/localhost)
- Input validation via Zod
- Request timeouts
- No private data logging

## Data Source Compliance

- Only uses officially documented APIs
- Only crawls public business website pages
- Does not scrape authenticated pages
- Does not bypass rate limits or CAPTCHAs
- All contacts retain provenance (source tracking)

## Production Considerations

1. Replace mock providers with real API credentials
2. Configure CORS origin for your domain
3. Set up database backups
4. Add monitoring and alerting
5. Configure proper logging level
6. Use a reverse proxy (nginx) in production
7. Set up CI/CD pipeline
8. Configure proper Redis persistence
9. Add health check monitoring
