# Menu Planner

A web application that creates personalized meal plans based on grocery store sales and recipe websites.

## Overview

This personal project helps users save money and time by:
- Fetching current grocery deals from store APIs (starting with Kroger)
- Analyzing recipe data from popular recipe websites
- Generating optimal meal plans that maximize savings
- Providing shopping lists organized by store layout

## Features

### Phase 1: MVP
- [ ] Kroger API integration for fetching current sales
- [ ] Basic recipe scraping from popular websites
- [ ] Simple meal plan generation algorithm
- [ ] Web interface for viewing meal plans
- [ ] Shopping list generation

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **APIs**: 
  - Kroger API (starting point)
  - Recipe websites (web scraping)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (frontend) + Railway/Heroku (backend)

## Project Structure

```
MenuPlanner/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API calls
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   ├── public/
│   └── package.json
├── server/                # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Utility functions
│   └── package.json
├── shared/                # Shared types and utilities
├── docs/                  # Documentation
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL
- Kroger API credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MenuPlanner
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

3. Set up environment variables:
```bash
# In server/.env
KROGER_API_TOKEN=your_kroger_api_token
DATABASE_URL=your_postgresql_connection_string
```

4. Set up the database:
```bash
# Run migrations
npm run db:migrate
```

5. Start the development servers:
```bash
# Start both client and server
npm run dev
```

## API Integration

### Kroger API
The application will use the Kroger API to:
- Fetch current product prices and promotions
- Search for products by category or name
- Get store location information

### Recipe Websites
Initially focusing on:
- AllRecipes
- Food Network
- Bon Appétit
- Epicurious

## Contributing

This is a personal project, but feel free to fork and submit issues or suggestions!

## License

MIT License - see LICENSE file for details

## Contact

Created by Claire Weissman as a personal project to explore meal planning and cost-saving opportunities.

---

**Current Status**: Project setup and initial structure creation
