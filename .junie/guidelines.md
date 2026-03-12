# Steam Web Parser

## Project Purpose

The Steam Web Parser is a web scraping application designed to collect and analyze data from the Steam store. It focuses on gathering information about games and software available on Steam, including their details, genres, tags, and relationships between similar products.

## Architecture and Components

### Overall Structure

- **Monorepo Structure**: The project uses a monorepo approach with pnpm workspaces
- **Core Package**: Contains the main functionality for parsing Steam web pages
- **Database**: PostgreSQL for data storage
- **ORM**: Prisma for database access and management

### Project Structure

```
steam-web-parser/
├── packages/
│   ├── core/                       # Steam store parser
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Database schema for Steam data
│   │   ├── src/
│   │   │   ├── api/                # API server and endpoints
│   │   │   ├── crawler/
│   │   │   │   └── base.ts         # Base crawler logic and queue management
│   │   │   ├── tools/              # Shared utilities (DB, Browser, Prisma, etc.)
│   │   │   ├── workers/            # Specialized scrapers (App, TopSeller, Search)
│   │   │   ├── crawl.ts            # Entry point for general app crawling
│   │   │   ├── crawl_top.ts        # Entry point for top sellers crawling
│   │   │   └── online_n_price.ts   # Collector for player counts and pricing
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/                         # React-based web interface
│   │   ├── src/                    # React components and pages
│   │   ├── index.html              # Main HTML entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── gb/                         # GB store parser (GameBuy or similar)
│       ├── prisma/
│       │   └── schema.prisma       # Database schema for GB data
│       ├── src/
│       │   ├── workers/            # GB-specific scrapers
│       │   └── index.ts            # GB parser entry point
│       └── package.json
├── docker-compose.yml              # Database container setup (PostgreSQL)
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

### Key Components

1. **Browser Automation**: Uses Puppeteer for headless browser automation to navigate and scrape web pages.
2. **Workers**: Specialized components for different scraping tasks:
   - `AppGrabber`: Extracts detailed information about individual Steam apps.
   - `TopSellerGrabber`: Collects top-selling apps from Steam.
   - `SearchGrabber`: Searches for apps on Steam by title.
   - `CatalogGrabber` (in `gb`): Scrapes product catalogs from the GB store.
3. **Crawler Logic**:
   - `BaseCrawler`: Manages the task queue (using `async` library) and coordinates workers to scrape and persist data.
4. **Database Layer**: Prisma ORM for database operations.
5. **Data Collection**:
   - `online_n_price.ts`: Periodically updates player counts (via Steam API) and prices for tracked apps.

## Database Structure (Steam Parser)

### Models

1. **AppUrl**

   - `id`: Unique identifier (matches Steam app ID)
   - `path`: URL path to the app page
   - `fromAppId`: Optional reference to the app that led to this one
   - `createdAt`: Timestamp of when the URL was added
   - `grabbedAt`: Timestamp of when the app was scraped
   - `forMainLoop`: Boolean flag for the main processing loop
   - `error`: Error message if scraping failed

2. **App**

   - `id`: Unique identifier (matches Steam app ID)
   - `title`: App title
   - `description`: Full app description
   - `descriptionMini`: Short description
   - `releaseDate`: App release date string
   - `developers`: Array of developers
   - `genre`: Array of genres
   - `popularTags`: Array of popular tags
   - `categories`: Array of categories (Single-player, Multi-player, etc.)
   - `linkToMoreLikeThis`: URL to "More Like This" page
   - `isDownloadableContent`: Boolean flag for DLCs
   - `lastOnline`: Latest player count
   - `lastPrice`: Latest price (final value)
   - Relations:
     - `Online`: History of player counts (`AppOnline` model)
     - `Price`: History of prices (`AppPrice` model)
     - `Related`: Many-to-many with other Apps through `AppToApp`

3. **AppOnline / AppPrice**
   - Store historical data for player counts and pricing (currency, initial, final, discount).

## Key Files and Their Roles

### Core Package (Steam)

- `packages/core/src/crawl.ts`: Main entry point for crawling orphaned URLs.
- `packages/core/src/crawl_top.ts`: Specialized entry point for crawling Steam Top Sellers.
- `packages/core/src/crawler/base.ts`: Contains `BaseCrawler` class with core queue logic.
- `packages/core/src/online_n_price.ts`: Script for updating real-time data (online/prices).
- `packages/core/src/tools/prisma.ts`: Prisma client singleton.

### GB Package

- `packages/gb/src/index.ts`: Main entry point for the GB store parser.
- `packages/gb/src/workers/catalogGrabber.ts`: Scrapes the product catalog.

## How the Application Works (Steam)

1. **Initialization**:
   - Creates a browser instance with Puppeteer.
   - `BaseCrawler` sets up an async queue for processing `TaskType` objects.

2. **Data Collection Strategies**:
   - **Orphaned URLs**: `crawl.ts` picks up `AppUrl` records that haven't been grabbed yet.
   - **Top Sellers**: `crawl_top.ts` uses `TopSellerGrabber` to find new apps from the Steam charts.
   - **Real-time Data**: `online_n_price.ts` updates player counts and prices for existing apps.

3. **Processing Loop**:
   - For each task in the queue:
     - `AppGrabber` scrapes the app's main page and the "More Like This" page.
     - Extracted data (title, genres, tags, etc.) is stored in the `App` model.
     - Relationships between apps are created via `AppToApp`.
     - New discovered app URLs are added to the `AppUrl` table and pushed to the queue if `deep` crawling is enabled.

## Dependencies

### Production Dependencies

- `@prisma/client`: Prisma ORM client
- `async`: Library for asynchronous patterns, used for the task queue
- `cheerio`: HTML parsing library
- `puppeteer`: Headless browser automation
- `axios`: HTTP client for API requests
- `express` / `fastify`: Web server frameworks for the API

### Development Dependencies

- `tsx`: TypeScript execution environment
- `typescript`: Programming language
- `eslint` / `prettier`: Linting and formatting tools
- `prisma`: Prisma ORM CLI and tools

## Deployment

The application uses Docker Compose for the database:

- PostgreSQL 14 container named "steam-parser-db"
- Database credentials: username: postgres, password: postgres, database: steam_parser
- Port mapping: 5436 (host) to 5432 (container)
- Persistent volume for database data

The application itself is not containerized in the current setup.

## Code Style and Linting

This project uses ESLint and Prettier to enforce code style and catch potential issues:

- **ESLint**: Static code analysis tool that identifies problematic patterns
- **Prettier**: Code formatter that ensures consistent code style

### Configuration Files

- `.eslintrc.js`: ESLint configuration
- `.prettierrc`: Prettier configuration
- `.eslintignore`: Files to be ignored by ESLint
- `.prettierignore`: Files to be ignored by Prettier

### Available Scripts

- `pnpm run lint`: Runs ESLint on all TypeScript files and fixes auto-fixable issues
- `pnpm run format`: Runs Prettier on all TypeScript, JSON, and Markdown files
