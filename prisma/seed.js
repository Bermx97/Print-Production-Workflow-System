import { PrismaClient, order_status } from '@prisma/client';
import 'dotenv/config';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {

  let employee = await prisma.employee.findFirst({
    where: { role: 'admin' },
  });

  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        login: 'seedAdmin',
        hashed_password: 'hashed',
        role: 'admin',
      },
    });
  }


  const statuses = [
    order_status.printing,
    order_status.cutting,
    order_status.gluing,
  ];

  const orders = Array.from({ length: 20 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);

    return prisma.order.create({
      data: {
        order_number: 145456 + i,
        status: statuses[i % statuses.length],
        due_date: date,
        created_by: employee.id,
      },
    });
  });

  await Promise.all(orders);

  console.log('🌱 Seed completed: 20 orders created');
};

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());