# Order Management API

## Demo 

https://github.com/user-attachments/assets/447788ae-b8c0-4cfb-8464-60384f85ad4d

## Overview

This repository contains the backend REST API for a Print Production Workflow System. It is designed to manage manufacturing and print production orders by modeling the process as a stateful, event-driven workflow engine. Orders transition through predefined steps governed by strict dependencies and role-based execution rules.

The system's core principle is an execution-driven architecture where the current state is derived entirely from the history of events. There is no global, mutable order state; instead, every action is recorded as an immutable event, providing a complete audit trail.

## Features

-   User registration and authentication (JWT-based).
-   Role-Based Access Control (RBAC) specific to each workflow step.
-   Creation and management of multi-part production orders.
-   A stateful workflow engine that tracks step transitions (START, END, PAUSE, RESUME).
-   Event-sourced step tracking (`step_logs`) for a complete audit trail.
-   Step-dependency validation ensuring correct production sequence.
-   Order filtering, detailed views, and search functionality.
-   A simple frontend UI for creating orders and tracking their progress live.
-   Comprehensive integration test suite using Jest and Supertest.

## Core Design

### Execution-Driven Architecture

The system avoids storing a mutable "order status." Instead, the state is derived from two primary sources:
-   `step_execution`: Represents the current status of a step (active, paused, done).
-   `step_logs`: An immutable history of all events (START, PAUSE, END), serving as an audit trail.

### Step Dependencies

Each product type has a unique workflow defined as a dependency graph. A step can only begin after its prerequisite steps are completed.

```typescript
// Example: src/modules/orders/orders.workflow.ts
export const workflow: Record<ProductType, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  hardcover_book: {
    printing: [],
    folding: ['printing'],
    sewing: ['folding'],
    case_making: ['folding'],
    hardcover_binding: ['sewing', 'case_making']
  },
  // ... other product types
};
```

### Step Scopes

Steps can operate at different levels of granularity:
-   **`per_part`**: The step is executed independently for each part of the order (e.g., `printing`, `folding`).
-   **`aggregated`**: The step requires all `per_part` dependencies to be satisfied before it can start (e.g., `sewing`).
-   **`per_order`**: The step is executed only once for the entire order (e.g., `hardcover_binding`).

### Role-Based Access Control (RBAC)

Access to execute each workflow step is restricted by user role.

-   **`printer_operator`**: `printing`
-   **`folding_operator`**: `folding`, `folding_with_milling`
-   **`sewing_operator`**: `sewing`
-   **`case_maker`**: `case_making`
-   **`hardcover_binder_operator`**: `hardcover_binding`
-   **`perfect_bound_operator`**: `binding`
-   **`stitching_operator`**: `stitching`
-   **`admin`**, **`seller`**, **`technologist`**: Full access to all workflow steps.

### Execution Rules

A user can start a step only if:
1.  Their role is authorized for that step.
2.  All dependency steps are satisfied according to the workflow graph.
3.  The step is not already active or completed for the given scope.
4.  The scope rules (`per_part`, `aggregated`, `per_order`) are met.

## Tech Stack

-   **Backend**: Node.js, Express.js, TypeScript
-   **ORM**: Prisma
-   **Database**: PostgreSQL (Designed for NeonDB)
-   **Authentication**: JSON Web Tokens (JWT), bcrypt
-   **Validation**: express-validator
-   **Testing**: Jest, Supertest

## Database Schema

The schema is designed around the core concepts of orders, employees, and the event-sourcing tables `step_logs` and `step_execution`.

<img width="1557" height="880" alt="Full Database Schema" src="https://github.com/user-attachments/assets/3ed60985-4733-4dd9-a7d9-bf6b59f7ec23" />

<img width="299" height="879" alt="Enums and Relations" src="https://github.com/user-attachments/assets/762828d4-d287-47d8-ab42-12c3d5e2ed93" />
<img width="261" height="325" alt="Enums" src="https://github.com/user-attachments/assets/326886e1-120c-4f81-b9d9-3e94878ee1e2" />

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

4.  Apply database migrations:
    ```bash
    npx prisma migrate dev
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

Execute the integration test suite:
```bash
npm test
```

## API Endpoints

### Authentication (`/auth`)

-   `POST /auth/register`: Register a new employee.
-   `POST /auth/login`: Log in to receive a JWT token.

### Orders (`/orders`)

-   `GET /`: Get a list of all orders.
-   `GET /my`: Get orders visible to the authenticated user based on their role and step assignments.
-   `POST /`: Create a new order (requires `admin`, `seller`, or `technologist` role).
-   `GET /:orderNumber`: Get detailed information for a single order.
-   `GET /:orderNumber/parts`: Get the status of all parts for an order, relevant to the user's role.
-   `GET /:orderNumber/analytics`: Get performance analytics, like step speed.

### Workflow Actions (`/orders/:orderNumber`)

-   `POST /:orderNumber/start`: Start a workflow step.
-   `POST /:orderNumber/pause`: Pause an active step.
-   `POST /:orderNumber/resume`: Resume a paused step.
-   `POST /:orderNumber/end`: End a step and record the completed quantity.


