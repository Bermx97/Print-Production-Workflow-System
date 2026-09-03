# Print Production Workflow System

## Demo & Live Access

<video src="https://github.com/user-attachments/assets/cf8a944f-d32c-46a6-89de-0d063b5dbc2d"
  autoplay 
  loop 
  muted 
  playsinline 
  controls 
  width="100%">
</video>
**Full-quality demo is available here:** https://www.youtube.com/watch?v=XBatprMwN1U

 **Live Link (Hosted on Render):** [https://print-production-workflow-system.onrender.com](https://print-production-workflow-system.onrender.com)

> ⚠️ **Note on Live Demo:** The API is deployed on Render's free tier. If the initial page load takes 30-50 seconds, it is simply the server waking up from its spin-down state. Once awake, performance will return to normal.

### Demo Credentials (Test Accounts)

To explore the application from the perspective of different system roles, you can use the following test accounts:
<details>

| Employee Role | Login | Password |
| :--- | :--- | :--- |
| **Technologist (Can create order)** | `techno` | `techno`|
| **Worker (Printer)** | `printer` | `printer` |
| **Worker (Folding)** | `folding` | `folding` |
| **Worker (Sewing)** | `sewing` | `sewing` |
| **Worker (Casemaking)** | `casemaker` | `casemaker` |
| **Worker (Hardcover binding)** | `hardcover` | `hardcover` |
| **Worker (Perfect Binding)** | `perfect` | `perfect` |
| **Worker (Stitching)** | `stitching` | `stitching` |

</details>

## Overview

This repository contains the backend REST API for a Print Production Workflow System. It is designed to manage manufacturing and print production orders by modeling the process as a stateful, event-driven workflow engine. Orders transition through predefined steps governed by strict dependencies and role-based execution rules.

The system uses an event-driven workflow that records every transition in an append-only audit log while storing the current state of each step in `step_execution` for efficient querying. There is no single global order status; each workflow step is tracked independently.

## Why I Built This

I designed this project based on my 10 years of professional experience in print production. It models real production dependencies, parallel processing, operator responsibilities, multi-part orders, and the complete history of work performed on each production step.

## Engineering Highlights

- Atomic order creation using Prisma transactions.
- Row-level locking to prevent concurrent duplicate step starts.
- Append-only audit history combined with materialized execution state.
- Dependency-based workflow execution with overlapping production stages.
- Role-based access control for individual production operations.
- Integration tests covering workflow transitions, rollback, and concurrency.

## Features

-   Admin-managed employee registration and JWT-based authentication.
-   Role-Based Access Control (RBAC) specific to each workflow step.
-   Creation and management of multi-part production orders.
-   A stateful workflow engine that tracks step transitions (START, END, PAUSE, RESUME).
-   Append-only event logging (`step_logs`) providing a complete audit trail.
-   Step-dependency validation ensuring correct production sequence.
-   Order filtering, detailed views, and search functionality.
-   A simple frontend UI for creating orders and tracking their progress live.
-   Comprehensive integration test suite using Jest and Supertest.
-   Real-time production analytics.

## Core Design

### Execution-Driven Architecture

The system does not store a single mutable status for an entire order. Instead, it tracks every workflow step independently:
-   `step_execution`: Stores the current status of each step (`active`, `paused`, `done`).
-   `step_logs`: Stores an append-only history of all transitions (`START`, `PAUSE`, `RESUME`, `END`) for auditing.

### Step Dependencies

Each product type has a unique workflow defined as a dependency graph. A step can begin once its prerequisite steps are active, paused, or completed, allowing production stages to overlap. However, a step can only be completed after all of its dependencies are finished.

```typescript
// Example: src/modules/orders/orders.workflow.ts
export const workflow: Record<ProductType, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  hardcover_book: {
    printing: [],
    folding: ['printing'],
    sewing: ['folding'],
    case_making: ['folding', 'printing'],
    hardcover_binding: ['sewing', 'case_making', 'printing']
  },
  // ... other product types
};
```

### Step Scopes

Steps can operate at different levels of granularity:
-   **`per_part`**: The step is executed independently for each part of the order (e.g., `printing`, `folding`).
-   **`aggregated`**: The step requires all `per_part` dependencies to be satisfied before it can start (e.g., `sewing`).
-   **`per_order`**: The step is executed only once for the entire order (e.g., `hardcover_binding`).

### Product Variants & Workflow Routing

The system uses  **`per_part`** granularity to manage distinct production components, with specific routing rules enforced by variantExclusions:
- Granular Processing: Steps like printing and folding operate at the per_part level, meaning every component (e.g., V16, V32, V64) is tracked and processed individually.
- Variant-Specific Routing: While printing supports the full range of components including COVER, other per_part steps (such as folding or folding_with_milling) are configured with variantExclusions to restrict COVER from entering the assembly stream.
- Workflow Integrity: By combining per_part logic with explicit exclusions, the system ensures that each component—whether it is a book block or a cover—only participates in the workflow steps relevant to its physical manufacturing requirements.
  
### Role-Based Access Control (RBAC)

Access to execute each workflow step is restricted by user role.

-   **`printer_operator`**: `printing`
-   **`folding_operator`**: `folding`, `folding_with_milling`
-   **`sewing_operator`**: `sewing`
-   **`case_maker`**: `case_making`
-   **`hardcover_binder_operator`**: `hardcover_binding`
-   **`perfect_bound_operator`**: `binding`
-   **`stitching_operator`**: `stitching`

### Execution Rules

A user can start a step only if:
1.  Their role is authorized for that step.
2.  All dependency steps have been started, paused, or completed according to the workflow graph.
3.  The step is not already active or completed for the given scope.
4.  The scope rules (`per_part`, `aggregated`, `per_order`) are met.

## Tech Stack

- **Backend:** Node.js, Express.js, TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL (Designed for NeonDB)
- **Authentication:** JSON Web Tokens (JWT), bcrypt
- **Validation:** express-validator
- **Testing:** Jest, Supertest
- **Deployment & Cloud:** Render (API), Neon (Database)

## Database Schema

The schema is designed around orders, employees, append-only workflow logs, and the current execution state of individual production steps.

<img width="1557" height="850" alt="DB" src="https://github.com/user-attachments/assets/829e38ba-3471-48df-bb96-75c1c527484f" />

### Data Models & Enums
The system uses the following enumerations to maintain data integrity across the workflow engine:

<details>
<summary><strong>Click to view all System Enums</strong></summary>

#### Roles & Types
| Enum | Values |
| :--- | :--- |
| **Employee Role** | `printer_operator`, `folding_operator`, `sewing_operator`, `case_maker`, `hardcover_binder_operator`, `perfect_bound_operator`, `stitching_operator`, `seller`, `technologist`, `admin` |
| **Product Type** | `hardcover_book`, `perfect_bound_book`, `saddle_stitching` |

#### Workflow & Execution
| Enum | Values |
| :--- | :--- |
| **Step Name** | `printing`, `folding`, `sewing`, `case_making`, `folding_with_milling`, `hardcover_binding`, `binding`, `stitching` |
| **Step Event** | `START`, `END`, `PAUSE`, `RESUME` |
| **Execution Status** | `active`, `paused`, `done`, `cancelled` |

#### Configuration & Variants
| Enum | Values |
| :--- | :--- |
| **Step Scope** | `per_part`, `aggregated`, `per_order` |
| **Variant** | `COVER`, `V4`, `V8`, `V16`, `V24`, `V32`, `V64` |

</details>

## Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   PostgreSQL database

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/bermx97/print-production-workflow-system.git
    cd print-production-workflow-system
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables. Create a `.env` file in the root directory and add the following:
    ```env
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
    JWT_SECRET="your-super-secret-jwt-key"
    ```

4.  Generate Prisma Client:
    ```bash
    npx prisma generate
    ```

5.  Apply the committed database migrations:
    ```bash
    npx prisma migrate deploy
    ```

### Running the Application

-   **Development Mode (with hot-reloading):**
    ```bash
    npm run dev
    ```
    The server will be available at `http://localhost:3000`.

-   **Production Mode:**
    ```bash
    npm run build
    npm run start
    ```

### Seeding the Database

The project includes a powerful, workflow-aware seed generator that creates realistic, randomized order data with valid execution histories.

-   **Seed a specific number of orders (e.g., 25):**
    ```bash
    npm run seed:orders -- --count 25
    ```

-   **Reset the database and seed 100 new orders:**
    ```bash
    npm run seed:orders -- --count 100 --reset
    ```

### Running Tests

> ⚠️ **Important:** Integration tests truncate database tables. Always use a separate test database configured in `.env.test`. Never run the test suite against a development or production database.

Copy the example configuration:

```bash
cp .env.test.example .env.test
```

Update `DATABASE_URL` in `.env.test`, then run:

```bash
npm test
```

## API Endpoints

### Authentication (`/auth`)

-   `POST /auth/register`: Register a new employee (admin only).
-   `POST /auth/login`: Log in to receive a JWT token.

### Orders (`/orders`)

-   `GET /`: Get a list of all orders.
-   `GET /my`: Get orders visible to the authenticated user based on their role and step assignments.
-   `GET /my/active`: Retrieve the currently active workflow steps for the authenticated user.
-   `POST /`: Create a new order (requires `admin`, `seller`, or `technologist` role).
-   `GET /:orderNumber`: Get detailed information for a single order.
-   `GET /:orderNumber/parts`: Get the status of all parts for an order, relevant to the user's role.
-   `GET /:orderNumber/analytics`: Get performance analytics, like step speed.

### Workflow Actions (`/orders/:orderNumber`)

-   `POST /:orderNumber/start`: Start a workflow step.
-   `POST /:orderNumber/pause`: Pause an active step.
-   `POST /:orderNumber/resume`: Resume a paused step.
-   `POST /:orderNumber/end`: End a step and record the completed quantity.


