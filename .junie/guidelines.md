# Steam Web Parser

## Project Purpose
The Steam Web Parser is a web scraping application designed to collect and analyze data from the Steam store. It focuses on gathering information about games and software available on Steam, including their details, genres, tags, and relationships between similar products.

## Architecture and Components

### Overall Structure
- **Monorepo Structure**: The project uses a monorepo approach with pnpm workspaces
- **Core Package**: Contains the main functionality for parsing Steam web pages
- **Database**: PostgreSQL for data storage
- **ORM**: Prisma for database access and management

### Key Components
1. **Browser Automation**: Uses Puppeteer for headless browser automation to navigate and scrape Steam pages
2. **Workers**: Specialized components for different scraping tasks
   - `TopSellerGrabber`: Collects top-selling apps from Steam
   - `AppGrabber`: Extracts detailed information about individual apps
3. **Database Layer**: Prisma ORM for database operations
4. **Task Queue**: Async queue for managing concurrent scraping tasks

## Database Structure

### Models
1. **AppUrl**
   - `id`: Unique identifier (matches Steam app ID)
   - `path`: URL path to the app page
   - `fromAppId`: Optional reference to the app that led to this one
   - `createdAt`: Timestamp of when the URL was added
   - `grabbedAt`: Timestamp of when the app was scraped (null if not yet scraped)
   - Relation: One-to-one with App

2. **App**
   - `id`: Unique identifier (matches Steam app ID)
   - `title`: App title
   - `description`: App description
   - `genre`: Array of genres
   - `popularTags`: Array of popular tags
   - `linkToMoreLikeThis`: URL to "More Like This" page
   - `moreGrabbedAt`: Timestamp of when "More Like This" was scraped
   - `moreLen`: Number of similar apps found
   - Relations:
     - One-to-one with AppUrl
     - Many-to-many with other Apps through AppToApp

3. **AppToApp**
   - `leftId`: ID of the source app
   - `rightId`: ID of the related app
   - Represents relationships between apps based on "More Like This" recommendations

## Key Files and Their Roles

### Core Structure
- `packages/core/src/index.ts`: Main application entry point, sets up the scraping process
- `packages/core/src/prisma.ts`: Prisma client initialization

### Tools
- `packages/core/src/tools/browser.ts`: Browser setup and page management
- `packages/core/src/tools/db.ts`: Database operations
- `packages/core/src/tools/task.ts`: Task type definition
- `packages/core/src/tools/url.ts`: URL parsing utilities

### Workers
- `packages/core/src/workers/topsellerGrabber.ts`: Scrapes top seller listings
- `packages/core/src/workers/appGrabber.ts`: Scrapes individual app pages

### Database
- `packages/core/prisma/schema.prisma`: Database schema definition

### Deployment
- `docker-compose.yml`: Sets up PostgreSQL database container

## How the Application Works

1. **Initialization**:
   - Creates a browser instance with Puppeteer
   - Sets up an async queue for processing tasks

2. **Initial Data Collection**:
   - Checks for orphaned app URLs (URLs that were added but not yet scraped)
   - Uses TopSellerGrabber to collect URLs from Steam's top sellers page

3. **Processing Loop**:
   - For each app URL in the queue:
     - Uses AppGrabber to scrape the app's page
     - Extracts title, description, genres, and tags
     - Stores the data in the database
     - Navigates to the "More Like This" page
     - Collects URLs of similar apps
     - Updates the database with relationships
     - Adds new app URLs to the queue

4. **Continuous Operation**:
   - When the queue is empty, scrolls to load more top sellers
   - Adds new URLs to the queue
   - Continues until no more top sellers are found

## Dependencies

### Production Dependencies
- `@prisma/client`: Prisma ORM client
- `async`: Library for asynchronous patterns, used for the task queue
- `cheerio`: HTML parsing library
- `puppeteer`: Headless browser automation

### Development Dependencies
- `@types/async`: TypeScript types for async
- `@types/cheerio`: TypeScript types for cheerio
- `@types/node`: TypeScript types for Node.js
- `prisma`: Prisma ORM CLI and tools

## Deployment

The application uses Docker Compose for the database:
- PostgreSQL 14 container named "steam-parser-db"
- Database credentials: username: postgres, password: postgres, database: steam_parser
- Port mapping: 5436 (host) to 5432 (container)
- Persistent volume for database data

The application itself is not containerized in the current setup.