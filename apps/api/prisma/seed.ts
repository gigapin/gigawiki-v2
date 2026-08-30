import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

process.loadEnvFile(new URL('../../../.env', import.meta.url).pathname)

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const ARGON2_OPTIONS = { memoryCost: 65536, timeCost: 3, parallelism: 4 }

async function main() {
  const hashedPassword = await argon2.hash('Admin1234!', ARGON2_OPTIONS)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gigawiki.local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@gigawiki.local',
      password: hashedPassword,
      slug: 'admin',
      role: 'ADMIN',
      emailConfirmed: true,
      emailVerifiedAt: new Date(),
    },
  })

  await prisma.user.upsert({
    where: { email: 'editor@gigawiki.local' },
    update: {},
    create: {
      name: 'Editor',
      email: 'editor@gigawiki.local',
      password: hashedPassword,
      slug: 'editor',
      role: 'EDITOR',
      emailConfirmed: true,
      emailVerifiedAt: new Date(),
    },
  })

  const subject = await prisma.subject.upsert({
    where: { slug: 'engineering' },
    update: {},
    create: {
      name: 'Engineering',
      slug: 'engineering',
      visibility: 'PUBLIC',
      userId: admin.id,
    },
  })

  const project = await prisma.project.upsert({
    where: { slug: 'backend-architecture' },
    update: {},
    create: {
      name: 'Backend Architecture',
      slug: 'backend-architecture',
      visibility: 'PUBLIC',
      subjectId: subject.id,
      userId: admin.id,
    },
  })

  const section = await prisma.section.upsert({
    where: { slug: 'getting-started' },
    update: {},
    create: {
      title: 'Getting Started',
      slug: 'getting-started',
      position: 0,
      projectId: project.id,
    },
  })

  const tiptapContent = JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Welcome to GiGaWiki' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This is your new wiki. Start by creating subjects, projects, and pages to organise your knowledge.',
          },
        ],
      },
    ],
  })

  await prisma.page.upsert({
    where: { slug: 'welcome-to-gigawiki' },
    update: {},
    create: {
      title: 'Welcome to GiGaWiki',
      slug: 'welcome-to-gigawiki',
      content: tiptapContent,
      isDraft: false,
      publishedAt: new Date(),
      sectionId: section.id,
      projectId: project.id,
      createdById: admin.id,
      updatedById: admin.id,
      ownedById: admin.id,
    },
  })

  const settings = [
    { key: 'ALLOW_SELF_REGISTRATION', value: 'true' },
    { key: 'DEFAULT_USER_ROLE', value: 'GUEST' },
    { key: 'SITE_NAME', value: 'GiGaWiki' },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
