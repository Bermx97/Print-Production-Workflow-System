import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const productTypes = [
  'hardcover_book',
  'perfect_bound_book',
  'saddle_stitching'
] as const;

/**
 * Poprawne workflow per produkt
 */
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

/**
 * Folding operator logika:
 * - hardcover + saddle => folding
 * - perfect bound => folding_with_milling
 */
function resolveFoldingStep(productType: typeof productTypes[number]) {
  return productType === 'perfect_bound_book'
    ? 'folding_with_milling'
    : 'folding';
}

/**
 * Generowanie progresu kroków zgodnego z workflow
 */
function getProgressiveSteps(productType: typeof productTypes[number]) {
  const steps = stepsByProduct[productType];

  const count = getRandomInt(0, steps.length);

  const selected = steps.slice(0, count);

  // zabezpieczenie logiczne folding vs milling
  return selected.map(step => {
    if (step === 'folding' && productType === 'perfect_bound_book') {
      return 'folding_with_milling';
    }
    return step;
  });
}

async function seedEmployees() {
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

async function seedOrders(employeeId: string) {
  const orders = Array.from({ length: 50 }).map((_, i) => {
    const productType =
      productTypes[getRandomInt(0, productTypes.length - 1)];

    return {
      order_number: i + 1,
      due_date: new Date(Date.now() + getRandomInt(1, 30) * 86400000),
      product_type: productType,
      completed_steps: getProgressiveSteps(productType),
      created_by: employeeId,
      quantity: getRandomQuantity(),
      customer: getRandomClient(),
      number_of_pages: getRandomEvenPages()
    };
  });

  await prisma.order.createMany({ data: orders });

  console.log('Seeded 50 orders');
}

async function main() {
  const employees = await seedEmployees();

  const admin = employees.find(e => e.role === 'admin');

  if (!admin) throw new Error('Admin not found');

  await seedOrders(admin.id);

  console.log('Seed completed');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });