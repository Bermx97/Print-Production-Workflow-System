import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const productTypes = [
  'hardcover_book',
  'perfect_bound_book',
  'saddle_stitching'
] as const;

const stepsByProduct: Record<typeof productTypes[number], string[]> = {
  hardcover_book: [
    'printing',
    'folding',
    'case_making',
    'sewing',
    'hardcover_binding'
  ],

  perfect_bound_book: [
    'printing',
    'folding_with_milling'
  ],

  saddle_stitching: [
    'printing',
    'folding',
    'stitching'
  ]
};

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomQuantity() {
  const min = 400;
  const max = 30000;

  const steps = (max - min) / 50;

  return (Math.floor(Math.random() * (steps + 1)) * 50) + min;
}

function getRandomEvenPages() {
  const min = 10;
  const max = 500;

  return Math.floor(Math.random() * ((max - min) / 2 + 1)) * 2 + min;
}

const clients = [
  'Oslo Publishing House',
  'Bergen Media Group',
  'Scandinavian Print Co',
  'Nordic Books Ltd',
  'Arctic Press',
  'Nova Publishing',
  'Capital Print Studio',
  'Blue Ocean Media'
];

function getRandomClient() {
  return clients[Math.floor(Math.random() * clients.length)];
}

async function seedEmployees() {
  await prisma.step_logs.deleteMany();
  await prisma.order.deleteMany();
  await prisma.employee.deleteMany();

  const roles = [
    ['admin', 'adminn'],
    ['printer_operator', 'printer'],
    ['folding_operator', 'folding'],
    ['sewing_operator', 'sewing'],
    ['case_maker', 'casemaker'],
    ['hardcover_binder_operator', 'hardcover'],
    ['perfect_bound_operator', 'perfect'],
    ['stitching_operator', 'stitching']
  ] as const;

  const employees = [];

  for (const [role, login] of roles) {
    const emp = await prisma.employee.create({
      data: {
        role,
        login,
        hashed_password: await bcrypt.hash(login, 10)
      }
    });

    employees.push(emp);
  }

  return employees;
}

async function seedOrders(employeeId: string) {

  const createdOrders = [];

  for (let i = 0; i < 50; i++) {

    const productType =
      productTypes[getRandomInt(0, productTypes.length - 1)];

    const order = await prisma.order.create({
      data: {
        order_number: i + 1,
        due_date: new Date(
          Date.now() + getRandomInt(1, 30) * 86400000
        ),
        product_type: productType,
        created_by: employeeId,
        quantity: getRandomQuantity(),
        customer: getRandomClient(),
        number_of_pages: getRandomEvenPages()
      }
    });

    createdOrders.push(order);
  }

  return createdOrders;
}

async function seedWorkflowLogs(
  orders: any[],
  employees: any[]
) {

  const roleMap: Record<string, string> = {
    printing: 'printer_operator',
    folding: 'folding_operator',
    folding_with_milling: 'folding_operator',
    sewing: 'sewing_operator',
    case_making: 'case_maker',
    hardcover_binding: 'hardcover_binder_operator',
    stitching: 'stitching_operator'
  };

for (const order of orders) {
  const productType = order.product_type as keyof typeof stepsByProduct;
  const workflow = stepsByProduct[productType];

  const progress = getRandomInt(0, workflow.length - 1);

  const stepQuantities: Record<string, number> = {};

  for (let i = 0; i < workflow.length; i++) {

    const step = workflow[i];

    const role = roleMap[step];
    const employee = employees.find(e => e.role === role);

    if (!employee) continue;

    const qty = getRandomInt(100, order.quantity);

    // ✔ DONE steps (before progress)
    if (i < progress) {
      const start = new Date()
      const end = new Date(
      start.getTime() + getRandomInt(30, 320) * 60000
    );

      await prisma.step_logs.create({
        data: {
          order_id: order.id,
          employee: employee.id,
          step_name: step as any,
          created_at: start,
          event_type: 'START'
        }
      });

      await prisma.step_logs.create({
        data: {
          order_id: order.id,
          employee: employee.id,
          step_name: step as any,
          created_at: end,
          event_type: 'END'
        }
      });

      stepQuantities[step] = qty;
      continue;
    }

    // 🟡 ACTIVE step
    if (i === progress) {

      await prisma.step_logs.create({
        data: {
          order_id: order.id,
          employee: employee.id,
          step_name: step as any,
          event_type: 'START'
        }
      });

      // ❌ brak END + brak quantity
      continue;
    }

    // ⏳ NOT STARTED → nic nie robimy
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      step_quantities: stepQuantities
    }
  });
}

  console.log('Workflow logs seeded');
}

async function main() {

  const employees = await seedEmployees();

  const admin = employees.find(
    e => e.role === 'admin'
  );

  if (!admin) {
    throw new Error('Admin not found');
  }

  const orders =
    await seedOrders(admin.id);

  await seedWorkflowLogs(
    orders,
    employees
  );

  console.log('Seed completed');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });