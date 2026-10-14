/* eslint-disable no-console */
import { prisma } from '../lib/prisma.js'

// Read-only inventory: do not activate policies or change content/ownership.
try {
  const [subjects, projects, sections, pages] = await Promise.all([
    prisma.subject.findMany({
      select: { id: true, slug: true, userId: true, visibility: true, deletedAt: true },
    }),
    prisma.project.findMany({
      select: {
        id: true,
        slug: true,
        userId: true,
        subjectId: true,
        visibility: true,
        deletedAt: true,
      },
    }),
    prisma.section.findMany({
      select: { id: true, slug: true, projectId: true, visibility: true, deletedAt: true },
    }),
    prisma.page.findMany({
      select: {
        id: true,
        slug: true,
        projectId: true,
        sectionId: true,
        ownedById: true,
        visibility: true,
        restricted: true,
        isDraft: true,
        deletedAt: true,
      },
    }),
  ])
  const affectedSubjects = subjects.filter(
    (item) => item.visibility === 'PRIVATE' || item.deletedAt,
  )
  const subjectIds = new Set(affectedSubjects.map((item) => item.id))
  const affectedProjects = projects.filter(
    (item) => item.visibility === 'PRIVATE' || item.deletedAt || subjectIds.has(item.subjectId),
  )
  const projectIds = new Set(affectedProjects.map((item) => item.id))
  const affectedSections = sections.filter(
    (item) => item.visibility === 'PRIVATE' || item.deletedAt || projectIds.has(item.projectId),
  )
  const sectionIds = new Set(affectedSections.map((item) => item.id))
  const affectedPages = pages.filter(
    (item) =>
      item.visibility === 'PRIVATE' ||
      item.deletedAt ||
      item.restricted ||
      item.isDraft ||
      projectIds.has(item.projectId) ||
      sectionIds.has(item.sectionId),
  )
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        policyEnabled: process.env.ENFORCE_CONTENT_ACCESS === 'true',
        totals: {
          subjects: subjects.length,
          projects: projects.length,
          sections: sections.length,
          pages: pages.length,
        },
        affected: {
          subjects: affectedSubjects,
          projects: affectedProjects,
          sections: affectedSections,
          pages: affectedPages,
        },
      },
      null,
      2,
    ),
  )
} finally {
  await prisma.$disconnect()
}
