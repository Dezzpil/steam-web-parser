# Steam Web Parser

A monorepo project for Steam web parsing with TypeScript and Docker Compose. The application collects and analyzes data from the Steam store, including game details, genres, tags, pricing, online player counts, and relationships between similar products.

## Project Purpose

The Steam Web Parser is designed to:
- Scrape game and software information from the Steam store
- Track online player counts using the Steam API
- Monitor pricing information and discounts
- Analyze relationships between similar products
- Provide a web interface for browsing and visualizing the collected data

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- pnpm (v6 or later)
- Docker and Docker Compose

### Installation
```bash
corepack use
corepack enable pnpm
```

### Development

Build all packages:
```bash
pnpm run build
```

Start the PostgreSQL database:
```bash
docker compose up db
```

### Running the Application Components

The application consists of several components that can be run separately:

#### Core Package

Run the main crawler to collect app data from Steam:

```bash
cd packages/core
pnpm run crawler
```

Collect online player counts and price information:

```bash
cd packages/core
pnpm run online_n_price
```

Start the API server:

```bash
cd packages/core
pnpm run api
```

#### UI Package

Start the UI development server:
```bash
cd packages/ui
pnpm run dev
```


## API Server

The application includes a REST API server that provides access to the collected data. The API server is built with Express.js and provides the following endpoints:

- **GET /api/queue/length**: Get the current length of the processing queue
- **GET /api/apps**: Get a paginated list of apps
  - Query parameters:
    - `limit`: Number of apps to return (default: 20)
    - `offset`: Number of apps to skip (default: 0)
  - Returns: `{ apps: App[], total: number }`
- **GET /api/apps/:id**: Get details for a specific app
  - Returns: App object with all its properties
- **GET /api/apps/:id/related**: Get apps related to a specific app
  - Returns: Array of related App objects

## UI Application

The project includes a web-based user interface for browsing and visualizing the collected data. The UI is built with:

- **React**: Frontend library for building user interfaces
- **React Router**: For navigation between different views
- **React Query**: For data fetching and caching
- **Bootstrap & Reactstrap**: For styling and UI components

The UI connects to the API server to fetch and display data about Steam apps, including their details, online player counts, pricing information, and relationships with other apps.

## Database

The PostgreSQL database is configured with the following settings:

- **Host**: localhost
- **Port**: 5436 (mapped to 5432 in the container)
- **Username**: postgres
- **Password**: postgres
- **Database**: steam_parser

You can connect to the database using any PostgreSQL client with these credentials.


### Database Management

The project uses Prisma ORM for database management. You can use the following commands:

```bash
# Generate Prisma client
pnpm run prisma:generate

# Run database migrations
pnpm run prisma:migrate

# Open Prisma Studio (database GUI)
pnpm run prisma:studio
```

## License

ISC
