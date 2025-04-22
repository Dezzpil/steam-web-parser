# Steam Web Parser

A monorepo project for Steam web parsing with TypeScript and Docker Compose.

## Project Structure

```
steam-web-parser/
├── packages/
│   └── core/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml
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

## Database

The PostgreSQL database is configured with the following settings:

- **Host**: localhost
- **Port**: 5432
- **Username**: postgres
- **Password**: postgres
- **Database**: steam_parser

You can connect to the database using any PostgreSQL client with these credentials.

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
