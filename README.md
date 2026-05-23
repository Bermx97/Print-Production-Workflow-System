# Order Management API

## Demo 

https://github.com/user-attachments/assets/12b51cc7-0f2b-46d2-ba57-60a6f008b8f2


## Overview

Backend REST API for managing production orders in manufacturing / print production workflows.

The system models production as a stateful workflow engine, where orders move through predefined steps with strict dependencies and role-based execution rules.

Each step is executed and tracked via event-driven records — there is no global mutable order state.

Everything is derived from execution history.

## Features

- User registration and authentication (login/logout)
- Create and manage production orders
- Workflow engine with step transitions (START / END)
- Event-based step tracking (`step_logs`)
- Role-based access control (RBAC per step)
- Step dependency validation
- Multi-part production support (`order_parts`)
- Fetch orders (filtered and full views)
- Single order detail view
- Order search by order number
- Integration tests
- Frontend UI with live step tracking
- Separation of business logic into services (controller/service split)

## Core Design
Execution-driven architecture

The system is based on:

step_execution → current execution state (active / done)
step_logs → immutable event history (audit trail)

No “order status” is stored — the system is fully event-sourced.

Each product type has its own dependency graph:

- hardcover_book:
  - printing → folding → (sewing | case_making) → hardcover_binding

- perfect_bound_book:
  - printing → folding_with_milling → binding

- saddle_stitching:
  - printing → folding → stitching

Step dependencies
export const workflow:   Record<ProductType, Partial<Record<OrderStatus, OrderStatus[]>>>

Each step defines which previous steps are required before it can start.

### Step scope model:
  - printing: 'per_part'
  - folding: 'per_part'
  - folding_with_milling: 'per_part'

  - sewing: 'aggregated'
  - case_making: 'aggregated'


  - hardcover_binding: 'per_order'
  - binding: 'per_order'
  - stitching: 'per_order

Scopes

per_part → each order part executes independently

aggregated → requires all parts to satisfy dependency

per_order → single execution per entire order

## Role-Based Access Control (RBAC)

Each role is mapped to specific workflow steps: 


## Operators:

- printer_operator → printing

- folding_operator → folding / folding_with_milling

- sewing_operator → sewing

- case_maker → case_making

- hardcover_binder_operator → hardcover_binding

- perfect_bound_operator → binding
 
- stitching_operator → stitching

- admin → full access to all workflow steps

- seller 

- technologist


## Execution Rules

A step can only start if:

- user role has access to the step

- dependencies are satisfied

- step is not already active or completed

- scope rules are respected (per_part / aggregated / per_order)
 

## Tech Stack:

- Node.js

- Express.js

- TypeScript

- Prisma ORM

- PostgreSQL (NeonDB)

- JWT authentication

- bcrypt

- express-validator

- Jest + Supertest

## Database Schema:


<img width="1557" height="880" alt="Untitled (1)" src="https://github.com/user-attachments/assets/3ed60985-4733-4dd9-a7d9-bf6b59f7ec23" />

<img width="299" height="879" alt="image" src="https://github.com/user-attachments/assets/762828d4-d287-47d8-ab42-12c3d5e2ed93" />
<img width="261" height="325" alt="image" src="https://github.com/user-attachments/assets/326886e1-120c-4f81-b9d9-3e94878ee1e2" />

## Seed Generator

The project includes a workflow-aware seed generator that creates random orders with:

- valid `order_parts`
- valid `step_execution`
- valid `step_logs`
- random `active`, `paused`, and `done` states
- workflow dependencies respected for every scope (`per_part`, `aggregated`, `per_order`)

Usage:

```bash
npm run seed:orders -- --count 25
```

Append 250 random orders:

```bash
npm run seed:orders -- --count 250
```

Reset orders and employees first, then seed 250 fresh orders:

```bash
npm run seed:orders -- --count 250 --reset
```


