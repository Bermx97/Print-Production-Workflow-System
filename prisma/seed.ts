import { PrismaClient, Variant, employee_role, product_type } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { getWorkflow, stepScope, workflow, } from '../src/modules/orders/orders.workflow';
import { OrderStatus } from '../src/types/orderStatus';


const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DEFAULT_COUNT = 25;
const MAX_COUNT = 5000;

const PRODUCT_TYPES = Object.values(product_type);
const VARIANTS = Object.values(Variant).filter((variant) => variant !== 'COVER');
const READY_STATUSES = new Set<SeedExecutionStatus>(['active', 'paused', 'done']);

const LOGIN_MAP: Record<employee_role, string> = {
  admin: 'adminn',
  printer_operator: 'printer',
  folding_operator: 'folding',
  sewing_operator: 'sewing',
  case_maker: 'casemaker',
  hardcover_binder_operator: 'hardcover',
  perfect_bound_operator: 'perfect',
  stitching_operator: 'stitching',
  seller: 'seller',
  technologist: 'techno',
};

const STEP_ROLE_MAP: Record<OrderStatus, employee_role> = {
  printing: 'printer_operator',
  folding: 'folding_operator',
  folding_with_milling: 'folding_operator',
  sewing: 'sewing_operator',
  case_making: 'case_maker',
  hardcover_binding: 'hardcover_binder_operator',
  binding: 'perfect_bound_operator',
  stitching: 'stitching_operator',
};

const CLIENTS = [
  'Oslo Publishing House',
  'Bergen Media Group',
  'Nordic Books Ltd',
  'Scandinavian Print Co',
  'Arctic Press',
  'Nova Publishing',
  'Blue Ocean Media',
  'Capital Print Studio',
];

type SeedMode = 'append' | 'reset';
type WorkflowScope = 'per_part' | 'aggregated' | 'per_order';
type SeedExecutionStatus = 'not_started' | 'active' | 'paused' | 'done';

type SeedOptions = {
  count: number;
  mode: SeedMode;
};

type SeedEmployee = {
  id: string;
  role: employee_role;
  login: string;
};

type OrderPartSeed = {
  id: string;
  order_id: string;
  variant: Variant;
  runs: number;
  part_quantity: number;
};

type StepInstanceState = {
  step: OrderStatus;
  scope: WorkflowScope;
  status: SeedExecutionStatus;
  orderPartId: string | null;
  employeeId: string;
  progressQty: number;
  doneQty: number | null;
  startedAt: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  finishedAt?: Date;
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(items: T[]) {
  return items[randInt(0, items.length - 1)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundTo50(value: number) {
  return Math.max(50, Math.round(value / 50) * 50);
}

function randomQuantity() {
  return roundTo50(randInt(400, 30000));
}

function randomEvenPages() {
  return randInt(8, 250) * 2;
}

function randomDueDate() {
  return new Date(Date.now() + randInt(2, 30) * DAY_MS);
}

function parseArgs(argv: string[]): SeedOptions {
  let count = DEFAULT_COUNT;
  let mode: SeedMode = 'append';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (/^\d+$/.test(arg)) {
      count = Number(arg);
      continue;
    }

    if (arg === '--count' && argv[index + 1]) {
      count = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--count=')) {
      count = Number(arg.split('=')[1]);
      continue;
    }

    if (arg === '--reset') {
      mode = 'reset';
      continue;
    }

    if (arg === '--append') {
      mode = 'append';
      continue;
    }
  }

  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    throw new Error(`Count must be an integer between 1 and ${MAX_COUNT}`);
  }

  return { count, mode };
}

async function resetData() {
  await prisma.step_execution.deleteMany();
  await prisma.step_logs.deleteMany();
  await prisma.order_parts.deleteMany();
  await prisma.order.deleteMany();
  await prisma.employee.deleteMany();
}

async function seedEmployees() {
  const employeesByRole = new Map<employee_role, SeedEmployee>();

  for (const role of Object.keys(LOGIN_MAP) as employee_role[]) {
    const login = LOGIN_MAP[role];
    const hashedPassword = await bcrypt.hash(login, 10);

    const employee = await prisma.employee.upsert({
      where: { login },
      update: {
        role,
        hashed_password: hashedPassword,
      },
      create: {
        login,
        role,
        hashed_password: hashedPassword,
      },
    });

    employeesByRole.set(role, {
      id: employee.id,
      role: employee.role,
      login: employee.login,
    });
  }

  return employeesByRole;
}

async function getNextOrderNumberStart() {
  const current = await prisma.order.aggregate({
    _max: {
      order_number: true,
    },
  });

  return (current._max.order_number ?? 0) + 1;
}

function buildOrderParts(orderId: string, orderQuantity: number) {
  const partCount = randInt(1, 6);
  const basePartQuantity = clamp(
    roundTo50(orderQuantity + randInt(0, Math.max(50, Math.round(orderQuantity * 0.05)))),
    50,
    1000000
  );

  const parts: OrderPartSeed[] = [];

  for (let index = 0; index < partCount; index += 1) {
    parts.push({
      id: randomUUID(),
      order_id: orderId,
      variant: pick(VARIANTS),
      runs: randInt(1, 12),
      part_quantity: basePartQuantity,
    });
  }

  return parts;
}

function getStateKey(step: OrderStatus, orderPartId: string | null) {
  return `${step}:${orderPartId ?? '__order__'}`;
}

function chooseStatus(ctx: {
  canStart: boolean;
  canFinish: boolean;
  depthRatio: number;
  progressTarget: number;
}) {
  const { canStart, canFinish, depthRatio, progressTarget } = ctx;

  if (!canStart) {
    return 'not_started' as const;
  }

  const drift = progressTarget - depthRatio + randFloat(-0.15, 0.15);

  if (canFinish && drift > 0.45) {
    return weightedPick<SeedExecutionStatus>([
      ['done', 0.62],
      ['active', 0.18],
      ['paused', 0.12],
      ['not_started', 0.08],
    ]);
  }

  if (drift > 0.15) {
    return canFinish
      ? weightedPick<SeedExecutionStatus>([
        ['done', 0.28],
        ['active', 0.34],
        ['paused', 0.2],
        ['not_started', 0.18],
      ])
      : weightedPick<SeedExecutionStatus>([
        ['active', 0.48],
        ['paused', 0.26],
        ['not_started', 0.26],
      ]);
  }

  if (drift > -0.15) {
    return canFinish
      ? weightedPick<SeedExecutionStatus>([
        ['done', 0.12],
        ['active', 0.34],
        ['paused', 0.2],
        ['not_started', 0.34],
      ])
      : weightedPick<SeedExecutionStatus>([
        ['active', 0.34],
        ['paused', 0.2],
        ['not_started', 0.46],
      ]);
  }

  return weightedPick<SeedExecutionStatus>([
    ['not_started', 0.76],
    ['active', 0.18],
    ['paused', 0.06],
  ]);
}

function weightedPick<T>(items: Array<[T, number]>) {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = Math.random() * total;

  for (const [value, weight] of items) {
    threshold -= weight;
    if (threshold <= 0) {
      return value;
    }
  }

  return items[items.length - 1][0];
}

function computeProgressQty(status: SeedExecutionStatus, inputQty: number) {
  if (status === 'done') {
    return clamp(
      Math.floor(inputQty * randFloat(0.94, 0.995)),
      1,
      inputQty
    );
  }

  if (status === 'paused') {
    return clamp(
      Math.floor(inputQty * randFloat(0.15, 0.8)),
      1,
      inputQty
    );
  }

  return clamp(
    Math.floor(inputQty * randFloat(0.2, 0.88)),
    1,
    inputQty
  );
}

function buildTimeline(ctx: {
  status: SeedExecutionStatus;
  readyAtMinMs: number;
  doneAtMinMs: number;
  inputQty: number;
}) {
  const { status, readyAtMinMs, doneAtMinMs, inputQty } = ctx;
  const startedAtMs = readyAtMinMs + randInt(10, 240) * MINUTE_MS;

  if (status === 'paused') {
    return {
      startedAtMs,
      pausedAtMs: startedAtMs + randInt(20, 180) * MINUTE_MS,
    };
  }

  if (status === 'active') {
    if (Math.random() < 0.3) {
      const pausedAtMs = startedAtMs + randInt(20, 160) * MINUTE_MS;
      return {
        startedAtMs,
        pausedAtMs,
        resumedAtMs: pausedAtMs + randInt(10, 120) * MINUTE_MS,
      };
    }

    return { startedAtMs };
  }

  const durationMinutes = clamp(
    Math.round(inputQty / randFloat(25, 120)),
    30,
    16 * 60
  );

  if (Math.random() < 0.35) {
    const pausedAtMs =
      startedAtMs +
      Math.max(15, Math.floor(durationMinutes * randFloat(0.2, 0.5))) * MINUTE_MS;
    const resumedAtMs = pausedAtMs + randInt(10, 120) * MINUTE_MS;
    const finishedAtMs = Math.max(
      resumedAtMs +
      Math.max(20, Math.floor(durationMinutes * randFloat(0.35, 0.85))) * MINUTE_MS,
      doneAtMinMs + randInt(10, 90) * MINUTE_MS
    );

    return {
      startedAtMs,
      pausedAtMs,
      resumedAtMs,
      finishedAtMs,
    };
  }

  return {
    startedAtMs,
    finishedAtMs: Math.max(
      startedAtMs + durationMinutes * MINUTE_MS,
      doneAtMinMs + randInt(10, 90) * MINUTE_MS
    ),
  };
}

async function seedOrder(ctx: {
  orderNumber: number;
  adminId: string;
  employeesByRole: Map<employee_role, SeedEmployee>;
}) {
  const { orderNumber, adminId, employeesByRole } = ctx;
  const productType = pick(PRODUCT_TYPES);
  const orderId = randomUUID();
  const orderQuantity = randomQuantity();
  const workflowSteps = getWorkflow(productType);
  const workflowMap = workflow[productType];
  const orderParts = buildOrderParts(orderId, orderQuantity);
  const orderPartById = new Map(orderParts.map((part) => [part.id, part]));
  const stepStates = new Map<string, StepInstanceState>();
  const stepExecutions: any[] = [];
  const stepLogs: any[] = [];
  const stepQuantities: Partial<Record<OrderStatus, number>> = {};
  const orderBaseStartMs = Date.now() - randInt(2, 21) * DAY_MS;
  const progressTarget = randFloat(0.15, 1.15);

  const resolveDependencyStates = (step: OrderStatus, orderPartId: string | null) => {
    const currentScope = stepScope[step] as WorkflowScope;
    const dependencies = workflowMap[step] ?? [];

    return dependencies.flatMap((dependencyStep) => {
      const dependencyScope = stepScope[dependencyStep] as WorkflowScope;

      if (currentScope === 'per_part') {
        return [
          stepStates.get(getStateKey(dependencyStep, orderPartId)) ?? undefined,
        ];
      }

      if (dependencyScope === 'per_part') {
        return orderParts.map((part) =>
          stepStates.get(getStateKey(dependencyStep, part.id))
        );
      }

      return [stepStates.get(getStateKey(dependencyStep, null)) ?? undefined];
    });
  };

  const getInputQty = (step: OrderStatus, orderPartId: string | null, dependencyStates: Array<StepInstanceState | undefined>) => {
    const scope = stepScope[step] as WorkflowScope;

    if (dependencyStates.length === 0) {
      return scope === 'per_part'
        ? orderPartById.get(orderPartId as string)?.part_quantity ?? orderQuantity
        : orderQuantity;
    }

    const quantities = dependencyStates
      .map((state) => state?.progressQty ?? 0)
      .filter((qty) => qty > 0);

    if (quantities.length === 0) {
      return scope === 'per_part'
        ? orderPartById.get(orderPartId as string)?.part_quantity ?? orderQuantity
        : orderQuantity;
    }

    return Math.max(1, Math.floor(Math.min(...quantities)));
  };

  const getReadyAtMinMs = (dependencyStates: Array<StepInstanceState | undefined>) => {
    if (dependencyStates.length === 0) {
      return orderBaseStartMs;
    }

    return dependencyStates.reduce((max, state) => {
      const startedAt = state?.startedAt?.getTime() ?? orderBaseStartMs;
      return Math.max(max, startedAt);
    }, orderBaseStartMs);
  };

  const getDoneAtMinMs = (dependencyStates: Array<StepInstanceState | undefined>, fallbackMs: number) => {
    if (dependencyStates.length === 0) {
      return fallbackMs;
    }

    return dependencyStates.reduce((max, state) => {
      const finishedAt = state?.finishedAt?.getTime() ?? fallbackMs;
      return Math.max(max, finishedAt);
    }, fallbackMs);
  };

  for (let stepIndex = 0; stepIndex < workflowSteps.length; stepIndex += 1) {
    const step = workflowSteps[stepIndex];
    const scope = stepScope[step] as WorkflowScope;
    const depthRatio =
      workflowSteps.length === 1 ? 1 : stepIndex / (workflowSteps.length - 1);
    const instanceIds =
      scope === 'per_part'
        ? orderParts.map((part) => part.id)
        : [null];

    for (const orderPartId of instanceIds) {
      const dependencyStates = resolveDependencyStates(step, orderPartId);
      const canStart = dependencyStates.every(
        (state) => state && READY_STATUSES.has(state.status)
      );
      const canFinish =
        dependencyStates.length === 0 ||
        dependencyStates.every((state) => state?.status === 'done');

      const status = chooseStatus({
        canStart,
        canFinish,
        depthRatio,
        progressTarget:
          progressTarget +
          (scope === 'per_part' ? randFloat(-0.12, 0.12) : randFloat(-0.06, 0.06)),
      });

      if (status === 'not_started') {
        continue;
      }

      const employee = employeesByRole.get(STEP_ROLE_MAP[step]);

      if (!employee) {
        throw new Error(`Missing employee for step ${step}`);
      }

      const inputQty = getInputQty(step, orderPartId, dependencyStates);
      const progressQty = computeProgressQty(status, inputQty);
      const readyAtMinMs = getReadyAtMinMs(dependencyStates);
      const doneAtMinMs = getDoneAtMinMs(dependencyStates, readyAtMinMs);
      const timeline = buildTimeline({
        status,
        readyAtMinMs,
        doneAtMinMs,
        inputQty: progressQty,
      });

      const state: StepInstanceState = {
        step,
        scope,
        status,
        orderPartId,
        employeeId: employee.id,
        progressQty,
        doneQty: status === 'done' ? progressQty : null,
        startedAt: new Date(timeline.startedAtMs),
        pausedAt:
          timeline.pausedAtMs !== undefined
            ? new Date(timeline.pausedAtMs)
            : undefined,
        resumedAt:
          timeline.resumedAtMs !== undefined
            ? new Date(timeline.resumedAtMs)
            : undefined,
        finishedAt:
          timeline.finishedAtMs !== undefined
            ? new Date(timeline.finishedAtMs)
            : undefined,
      };

      stepStates.set(getStateKey(step, orderPartId), state);

      stepExecutions.push({
        id: randomUUID(),
        order_id: orderId,
        order_part_id: scope === 'per_part' ? orderPartId : null,
        step_type: step,
        step_scope: scope,
        status,
        started_at: state.startedAt,
        finished_at: state.finishedAt ?? null,
        done_quantity: state.doneQty,
      });

      stepLogs.push({
        id: randomUUID(),
        order_id: orderId,
        order_part_id: scope === 'per_part' ? orderPartId : null,
        step_name: step,
        event_type: 'START',
        created_at: state.startedAt,
        employee: state.employeeId,
      });

      if (state.pausedAt) {
        stepLogs.push({
          id: randomUUID(),
          order_id: orderId,
          order_part_id: scope === 'per_part' ? orderPartId : null,
          step_name: step,
          event_type: 'PAUSE',
          created_at: state.pausedAt,
          employee: state.employeeId,
        });
      }

      if (state.resumedAt) {
        stepLogs.push({
          id: randomUUID(),
          order_id: orderId,
          order_part_id: scope === 'per_part' ? orderPartId : null,
          step_name: step,
          event_type: 'RESUME',
          created_at: state.resumedAt,
          employee: state.employeeId,
        });
      }

      if (state.finishedAt) {
        stepLogs.push({
          id: randomUUID(),
          order_id: orderId,
          order_part_id: scope === 'per_part' ? orderPartId : null,
          step_name: step,
          event_type: 'END',
          created_at: state.finishedAt,
          employee: state.employeeId,
        });
      }
    }
  }

  for (const step of workflowSteps) {
    const scope = stepScope[step] as WorkflowScope;

    if (scope === 'per_part') {
      const totalQty = orderParts.reduce((sum, part) => {
        const state = stepStates.get(getStateKey(step, part.id));
        return sum + (state?.progressQty ?? 0);
      }, 0);

      if (totalQty > 0) {
        stepQuantities[step] = totalQty;
      }

      continue;
    }

    const state = stepStates.get(getStateKey(step, null));
    if (state?.progressQty) {
      stepQuantities[step] = state.progressQty;
    }
  }

  stepLogs.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        id: orderId,
        order_number: orderNumber,
        due_date: randomDueDate(),
        created_by: adminId,
        product_type: productType,
        quantity: orderQuantity,
        customer: pick(CLIENTS),
        number_of_pages: randomEvenPages(),
        //step_quantities: stepQuantities,
      },
    });

    await tx.order_parts.createMany({
      data: orderParts,
    });

    if (stepExecutions.length > 0) {
      await tx.step_execution.createMany({
        data: stepExecutions,
      });
    }

    if (stepLogs.length > 0) {
      await tx.step_logs.createMany({
        data: stepLogs,
      });
    }
  });

  return {
    orderNumber,
    productType,
    parts: orderParts.length,
    startedSteps: stepExecutions.length,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.mode === 'reset') {
    await resetData();
  }

  const employeesByRole = await seedEmployees();
  const admin = employeesByRole.get('admin');

  if (!admin) {
    throw new Error('Admin user not found');
  }

  let nextOrderNumber = await getNextOrderNumberStart();
  const seededOrders = [];

  for (let index = 0; index < options.count; index += 1) {
    const seededOrder = await seedOrder({
      orderNumber: nextOrderNumber,
      adminId: admin.id,
      employeesByRole,
    });

    seededOrders.push(seededOrder);
    nextOrderNumber += 1;

    if ((index + 1) % 25 === 0 || index === options.count - 1) {
      console.log(`Seeded ${index + 1}/${options.count} orders`);
    }
  }

  const byProduct = seededOrders.reduce<Record<string, number>>((acc, order) => {
    acc[order.productType] = (acc[order.productType] ?? 0) + 1;
    return acc;
  }, {});

  console.log('Seed completed');
  console.log(`Mode: ${options.mode}`);
  console.log(`Orders added: ${seededOrders.length}`);
  console.log(`By product: ${JSON.stringify(byProduct)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
