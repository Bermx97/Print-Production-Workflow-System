# Order Management API

## Demo 

https://github.com/user-attachments/assets/12b51cc7-0f2b-46d2-ba57-60a6f008b8f2

## Status
Project in progress (WIP)

Core workflow system is functional, but still evolving and being refactored.

Current state:
- Workflow engine (start/end step logic) implemented
- Role-based access control integrated with workflow steps
- Step logging system active (event sourcing style)
- Initial integration tests for workflow transitions added
- Order UI expanded with step visualization in frontend views
- Order search endpoint added for direct lookup by order number

Known limitations:
- some workflow edge cases still require extended testing
- role-to-step mapping may still be adjusted
- step completion validation logic is being refined
- API structure is partially duplicated (v1/v2 transitional state)

Some parts of workflow logic are still being stabilized.

---

## Overview

Backend REST API for managing production orders in manufacturing / printing workflows.

The system models production as a **stateful workflow engine** where orders move through predefined steps.

Each step is executed and tracked via **event-driven execution records**, with no global mutable order state.

The system is designed for real-world production environments where:

- multiple roles operate on different steps
- production is split into multiple parts (variants/signatures)
- steps have dependencies
- execution must be auditable and traceable
  
### Execution-driven architecture

The system is based on:

- `step_execution` → **current state (source of truth)**
- `step_logs` → **event history (audit trail)**

---

## Features

- Create and manage orders
- Workflow engine with step transitions (START / END)
- Event-based step tracking (`step_logs`)
- Role-based access control (RBAC per step)
- Step dependency validation
- Fetch orders (filtered and full views)
- Single order detail view
- Single order detail view
- Order search by order number
- Step performance analytics (speed per step)
- Integration tests for workflow transitions and authorization
- Frontend UI for order tracking with live step status
- Separation of business logic into services (controller/service split)
- Scoped execution model:
  - per_part
  - aggregated
  - per_order

---
## Role-based access control (RBAC)
- Role → step mapping
- Step-level access enforcement
- Restricted execution based on operator role

## Multi-part production support
Orders contain `order_parts` representing production variants/signatures.

## Workflow

Each product type follows a predefined step graph.

Example:

hardcover_book:
printing → folding → (sewing || case_making) → hardcover_binding

perfect_bound_book:
printing → folding_with_milling → binding

saddle_stitching:
printing → folding → stitching

Each step can have dependencies defined in workflow configuration.

---

## Role Permissions

Each role has access to specific steps:

- printer_operator → printing
- folding_operator → folding / folding_with_milling
- sewing_operator → sewing
- case_maker → case_making
- hardcover_binder_operator → hardcover_binding
- perfect_bound_operator → binding
- stitching_operator → stitching

Admin / technologist / seller:
- full access to all steps

Invalid step access returns:
- 409 Conflict or 403 Forbidden (depending on validation layer)

---

## Architecture Notes

- `step_logs` → event history (START / END)
- `workflow config` → defines dependencies between steps
- `analytics service` → computes step duration and speed based on timestamps
- frontend derives UI state from backend logs (no hard state stored)

Current direction:
- moving from controller-heavy logic → service-based workflow engine
- increasing test coverage for transitions and role enforcement

---

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (NeonDB)
- JWT authentication
- bcrypt
- express-validator
- Supertest (integration testing)

## Database Schema:


<img width="1557" height="880" alt="Untitled (1)" src="https://github.com/user-attachments/assets/3ed60985-4733-4dd9-a7d9-bf6b59f7ec23" />

<img width="299" height="879" alt="image" src="https://github.com/user-attachments/assets/762828d4-d287-47d8-ab42-12c3d5e2ed93" />
<img width="261" height="325" alt="image" src="https://github.com/user-attachments/assets/326886e1-120c-4f81-b9d9-3e94878ee1e2" />


