import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clear existing data
  await prisma.forecastEntry.deleteMany()
  await prisma.clientBudget.deleteMany()
  await prisma.leave.deleteMany()
  await prisma.employeeContract.deleteMany()
  await prisma.user.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.client.deleteMany()
  await prisma.publicHoliday.deleteMany()
  await prisma.salesTarget.deleteMany()

  // Create employees
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        name: 'Jan de Vries',
        email: 'jan@yourfellow.nl',
        hourlyRate: 125,
        contracts: {
          create: {
            hoursPerWeek: 40,
            billableTarget: 0.8,
            startDate: new Date('2024-01-01'),
          },
        },
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Lisa Bakker',
        email: 'lisa@yourfellow.nl',
        hourlyRate: 125,
        contracts: {
          create: {
            hoursPerWeek: 32,
            billableTarget: 0.8,
            startDate: new Date('2024-01-01'),
          },
        },
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Pieter Jansen',
        email: 'pieter@yourfellow.nl',
        hourlyRate: 125,
        contracts: {
          create: {
            hoursPerWeek: 40,
            billableTarget: 0.8,
            startDate: new Date('2024-03-01'),
          },
        },
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Emma van Dijk',
        email: 'emma@yourfellow.nl',
        hourlyRate: 125,
        contracts: {
          create: {
            hoursPerWeek: 40,
            billableTarget: 0.8,
            startDate: new Date('2024-01-01'),
          },
        },
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Thomas Visser',
        email: 'thomas@yourfellow.nl',
        hourlyRate: 125,
        contracts: {
          create: {
            hoursPerWeek: 24,
            billableTarget: 0.8,
            startDate: new Date('2024-06-01'),
          },
        },
      },
    }),
  ])

  console.log(`Created ${employees.length} employees`)

  // Create users with hashed passwords
  const hashedAdminPassword = await bcrypt.hash('admin123', 10)
  const hashedPlannerPassword = await bcrypt.hash('planner123', 10)
  const hashedConsultantPassword = await bcrypt.hash('consultant123', 10)

  await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@yourfellow.nl',
        name: 'Admin User',
        password: hashedAdminPassword,
        role: 'ADMIN',
        employeeId: employees[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'planner@yourfellow.nl',
        name: 'Planner User',
        password: hashedPlannerPassword,
        role: 'PLANNER',
        employeeId: employees[1].id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'consultant@yourfellow.nl',
        name: 'Consultant User',
        password: hashedConsultantPassword,
        role: 'CONSULTANT',
        employeeId: employees[2].id,
      },
    }),
  ])

  console.log('Created users')

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'TechCorp BV',
        clientType: 'B2B',
        classification: 'A',
        hourlyRate: 120,
        contractStart: new Date('2024-01-01'),
      },
    }),
    prisma.client.create({
      data: {
        name: 'Marketing Solutions',
        clientType: 'B2B',
        classification: 'A',
        hourlyRate: 115,
        contractStart: new Date('2023-06-01'),
      },
    }),
    prisma.client.create({
      data: {
        name: 'E-Commerce Plus',
        clientType: 'B2B',
        classification: 'B',
        hourlyRate: 110,
        contractStart: new Date('2024-03-01'),
      },
    }),
    prisma.client.create({
      data: {
        name: 'StartupXYZ',
        clientType: 'B2B',
        classification: 'C',
        hourlyRate: 100,
        contractStart: new Date('2024-06-01'),
      },
    }),
    prisma.client.create({
      data: {
        name: 'Fashion Brand NL',
        clientType: 'B2C',
        classification: 'B',
        hourlyRate: 105,
        contractStart: new Date('2024-01-01'),
      },
    }),
    prisma.client.create({
      data: {
        name: 'Local Restaurant Group',
        clientType: 'B2C',
        classification: 'C',
        hourlyRate: 95,
        contractStart: new Date('2024-04-01'),
      },
    }),
    prisma.client.create({
      data: {
        name: 'New Prospect Co',
        clientType: 'B2B',
        classification: 'B',
        hourlyRate: 110,
      },
    }),
  ])

  console.log(`Created ${clients.length} clients`)

  // Current month for budgets
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Create client budgets for current month
  const budgets = await Promise.all([
    // TechCorp - Large subscription
    prisma.clientBudget.create({
      data: {
        clientId: clients[0].id,
        year: currentYear,
        month: currentMonth,
        totalBudget: 15000,
        budgetType: 'SUBSCRIPTION',
      },
    }),
    // Marketing Solutions - Project + Subscription
    prisma.clientBudget.create({
      data: {
        clientId: clients[1].id,
        year: currentYear,
        month: currentMonth,
        totalBudget: 8000,
        budgetType: 'SUBSCRIPTION',
      },
    }),
    prisma.clientBudget.create({
      data: {
        clientId: clients[1].id,
        year: currentYear,
        month: currentMonth,
        totalBudget: 5000,
        budgetType: 'PROJECT',
      },
    }),
    // E-Commerce Plus
    prisma.clientBudget.create({
      data: {
        clientId: clients[2].id,
        year: currentYear,
        month: currentMonth,
        totalBudget: 6000,
        budgetType: 'SUBSCRIPTION',
      },
    }),
    // StartupXYZ
    prisma.clientBudget.create({
      data: {
        clientId: clients[3].id,
        year: currentYear,
        month: currentMonth,
        totalBudget: 3500,
        budgetType: 'PROJECT',
      },
    }),
    // Fashion Brand NL
    prisma.clientBudget.create({
      data: {
        clientId: clients[4].id,
        year: currentYear,
        month: currentMonth,
        totalBudget: 4500,
        budgetType: 'SUBSCRIPTION',
      },
    }),
    // Local Restaurant Group
    prisma.clientBudget.create({
      data: {
        clientId: clients[5].id,
        year: currentYear,
        month: currentMonth,
        totalBudget: 2500,
        budgetType: 'SUBSCRIPTION',
      },
    }),
    // Prospect
    prisma.clientBudget.create({
      data: {
        clientId: clients[6].id,
        year: currentYear,
        month: currentMonth,
        totalBudget: 8000,
        budgetType: 'PROSPECT',
        prospectProbability: 0.6,
      },
    }),
    // Tooling (not in net revenue)
    prisma.clientBudget.create({
      data: {
        clientId: clients[0].id,
        year: currentYear,
        month: currentMonth,
        totalBudget: 1500,
        budgetType: 'TOOLING',
      },
    }),
  ])

  console.log(`Created ${budgets.length} budgets`)

  // Create forecast entries
  await Promise.all([
    // TechCorp tasks
    prisma.forecastEntry.create({
      data: {
        clientBudgetId: budgets[0].id,
        employeeId: employees[0].id,
        taskDescription: 'SEO Strategie & Uitvoering',
        budgetAmount: 6000,
      },
    }),
    prisma.forecastEntry.create({
      data: {
        clientBudgetId: budgets[0].id,
        employeeId: employees[1].id,
        taskDescription: 'Social Media Management',
        budgetAmount: 4000,
      },
    }),
    prisma.forecastEntry.create({
      data: {
        clientBudgetId: budgets[0].id,
        employeeId: employees[2].id,
        taskDescription: 'Content Creatie',
        budgetAmount: 3000,
      },
    }),
    // Marketing Solutions tasks
    prisma.forecastEntry.create({
      data: {
        clientBudgetId: budgets[1].id,
        employeeId: employees[0].id,
        taskDescription: 'Marketing Automation',
        budgetAmount: 5000,
      },
    }),
    prisma.forecastEntry.create({
      data: {
        clientBudgetId: budgets[1].id,
        employeeId: employees[3].id,
        taskDescription: 'Email Campagnes',
        budgetAmount: 3000,
      },
    }),
    // E-Commerce Plus tasks
    prisma.forecastEntry.create({
      data: {
        clientBudgetId: budgets[3].id,
        employeeId: employees[2].id,
        taskDescription: 'Webshop Optimalisatie',
        budgetAmount: 4000,
      },
    }),
    // StartupXYZ tasks
    prisma.forecastEntry.create({
      data: {
        clientBudgetId: budgets[4].id,
        employeeId: employees[4].id,
        taskDescription: 'Brand Development',
        budgetAmount: 3500,
      },
    }),
    // Fashion Brand tasks
    prisma.forecastEntry.create({
      data: {
        clientBudgetId: budgets[5].id,
        employeeId: employees[1].id,
        taskDescription: 'Instagram Marketing',
        budgetAmount: 2500,
      },
    }),
    prisma.forecastEntry.create({
      data: {
        clientBudgetId: budgets[5].id,
        employeeId: employees[3].id,
        taskDescription: 'Influencer Campagne',
        budgetAmount: 2000,
      },
    }),
  ])

  console.log('Created forecast entries')

  // Create public holidays for 2026
  const holidays2026 = [
    { date: new Date('2026-01-01'), name: 'Nieuwjaarsdag' },
    { date: new Date('2026-04-05'), name: 'Goede Vrijdag' },
    { date: new Date('2026-04-06'), name: 'Pasen (1e dag)' },
    { date: new Date('2026-04-07'), name: 'Pasen (2e dag)' },
    { date: new Date('2026-04-27'), name: 'Koningsdag' },
    { date: new Date('2026-05-05'), name: 'Bevrijdingsdag' },
    { date: new Date('2026-05-14'), name: 'Hemelvaartsdag' },
    { date: new Date('2026-05-24'), name: 'Pinksteren (1e dag)' },
    { date: new Date('2026-05-25'), name: 'Pinksteren (2e dag)' },
    { date: new Date('2026-12-25'), name: 'Kerst (1e dag)' },
    { date: new Date('2026-12-26'), name: 'Kerst (2e dag)' },
  ]

  await Promise.all(
    holidays2026.map((holiday) =>
      prisma.publicHoliday.create({
        data: {
          date: holiday.date,
          name: holiday.name,
          year: 2026,
        },
      })
    )
  )

  console.log('Created public holidays')

  // Create sales targets
  for (let month = 1; month <= 12; month++) {
    await prisma.salesTarget.create({
      data: {
        year: currentYear,
        month,
        targetAmount: 50000,
        avgClientValue: 5000,
      },
    })
  }

  console.log('Created sales targets')

  // Create some leave entries
  await prisma.leave.create({
    data: {
      employeeId: employees[0].id,
      startDate: new Date(currentYear, currentMonth, 10),
      endDate: new Date(currentYear, currentMonth, 12),
      hours: 24,
      type: 'VACATION',
      status: 'APPROVED',
      notes: 'Korte vakantie',
    },
  })

  console.log('Created leave entries')

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
