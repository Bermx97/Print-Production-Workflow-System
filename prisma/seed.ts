import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const productTypes = [
  'hardcover_book',
  'perfect_bound_book',
  'saddle_stitching'
] as const;

const stepsPool = [
  'printing',
  'folding',
  'case_making',
  'sewing',
  'hardcover_binding',
  'folding_with_milling'
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomSteps() {
  const count = getRandomInt(0, 3);
  const shuffled = [...stepsPool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function seedEmployee() {
  await prisma.employee.deleteMany();

  const employee = await prisma.employee.create({
    data: {
      role: 'admin',
      login: 'admin',
      hashed_password: 'admin'
    }
  });

  return employee;
}

async function seedOrders(employeeId: string) {
  await prisma.order.deleteMany();

  const orders = Array.from({ length: 50 }).map((_, i) => {
    const productType =
      productTypes[getRandomInt(0, productTypes.length - 1)];

    return {
      order_number: i + 1,
      due_date: new Date(Date.now() + getRandomInt(1, 30) * 86400000),
      product_type: productType,
      completed_steps: getRandomSteps(),
      created_by: employeeId
    };
  });

  await prisma.order.createMany({
    data: orders
  });

  console.log('Seeded 50 orders');
}

async function main() {
  const employee = await seedEmployee();
  await seedOrders(employee.id);

  console.log('Seed completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());