require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.employee.create({
    data: {
      login: "admin",
      hashed_password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Admin created");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());