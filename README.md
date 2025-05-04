# Steam Web Parser

A monorepo project for Steam web parsing with TypeScript and Docker Compose. The application collects and analyzes data from the Steam store, including game details, genres, tags, pricing, online player counts, and relationships between similar products.

## Project Purpose

The Steam Web Parser is designed to:
- Scrape game and software information from the Steam store
- Track online player counts using the Steam API
- Monitor pricing information and discounts
- Analyze relationships between similar products
- Provide a web interface for browsing and visualizing the collected data

## Project Structure

```
steam-web-parser/
├── packages/
│   ├── core/
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema
│   │   │   └── migrations/         # Database migrations
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   └── server.ts       # API server
│   │   │   ├── tools/
│   │   │   │   ├── browser.ts      # Browser setup
│   │   │   │   ├── db.ts           # Database operations
│   │   │   │   ├── task.ts         # Task definitions
│   │   │   │   ├── url.ts          # URL utilities
│   │   │   │   └── time.ts         # Time utilities
│   │   │   ├── workers/
│   │   │   │   ├── topsellerGrabber.ts  # Top seller scraper
│   │   │   │   └── appGrabber.ts        # App details scraper
│   │   │   ├── crawler.ts          # Main scraping process
│   │   │   └── online_n_price.ts   # Online player and price data collection
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── ui/                         # React-based web interface
│       ├── src/                    # React components and pages
│       ├── index.html              # Main HTML entry point
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml              # Database container setup
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── .eslintignore
├── .prettierignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- pnpm (v6 or later)
- Docker and Docker Compose

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

### Development

Build all packages:

```bash
pnpm run build
```

Lint your code with ESLint:

```bash
pnpm run lint
```

Format your code with Prettier:

```bash
pnpm run format
```

Start the PostgreSQL database:

```bash
pnpm run docker:up
```

Stop the PostgreSQL database:

```bash
pnpm run docker:down
```

View logs from the PostgreSQL database:

```bash
pnpm run docker:logs
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

Build the UI for production:

```bash
cd packages/ui
pnpm run build
```

Preview the production build:

```bash
cd packages/ui
pnpm run preview
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

### Database Models

The application uses the following data models:

1. **AppUrl**
   - Stores URLs to Steam app pages
   - Contains information about when the URL was added and when it was scraped
   - Tracks errors that occurred during scraping

2. **App**
   - Stores detailed information about Steam apps (games, software, etc.)
   - Includes title, description, genres, tags, categories, and more
   - Tracks relationships with other apps through the "More Like This" feature
   - Flags downloadable content (DLC)

3. **AppToApp**
   - Represents relationships between apps based on Steam's recommendations
   - Links apps that are similar or related to each other

4. **AppOnline**
   - Tracks the number of online players for each app over time
   - Data is collected from the Steam API

5. **AppPrice**
   - Tracks pricing information for each app over time
   - Includes initial price, final price, discount percentage, and formatted price strings
   - Supports multiple currencies

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

## License

ISC
