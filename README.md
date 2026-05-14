# Order Management API

## Demo 

https://github.com/user-attachments/assets/74de255e-0d52-4dcf-a6a0-46cb25a3b142

## Status
Project in progress (WIP)

Core workflow system is functional, but still evolving and being refactored.

Current state:
- Workflow engine (start/end step logic) implemented
- Role-based access control integrated with workflow steps
- Step logging system active (event sourcing style)
- Order state builder (`buildState`) introduced for deriving current status
- Initial integration tests for workflow transitions added
- Step speed / analytics layer introduced (performance per step based on logs)
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

A backend REST API for managing production orders with a structured workflow engine and role-based access control.

The system is designed for production environments (e.g. printing / manufacturing pipelines), where orders move through predefined stages and only specific roles can execute or complete specific steps.

Workflow is event-driven and based on step logs rather than direct state mutation.

---

## Features

- Create and manage orders
- Workflow engine with step transitions (START / END)
- Event-based step tracking (`step_logs`)
- Derived order state (`buildState`)
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

---

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
- `buildState()` → derives current step state from logs
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


<img width="968" height="688" alt="Untitled" src="https://github.com/user-attachments/assets/3e38de31-46c1-4395-9cad-7ef25e174f7d" />
<img width="299" height="879" alt="image" src="https://github.com/user-attachments/assets/762828d4-d287-47d8-ab42-12c3d5e2ed93" />
<img width="261" height="325" alt="image" src="https://github.com/user-attachments/assets/326886e1-120c-4f81-b9d9-3e94878ee1e2" />


