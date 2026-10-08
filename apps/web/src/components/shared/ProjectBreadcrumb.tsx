import { Link } from '@tanstack/react-router'

interface Props {
  subject?: { name: string; slug: string }
  project: { name: string; slug: string }
  section?: { title: string; slug: string }
  current: string
  page?: { title: string; slug: string }
}

const linkClass =
  'rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ProjectBreadcrumb({ subject, project, section, current, page }: Props) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground [&>li]:min-w-0 [&>li]:break-words">
        <li>
          <Link className={linkClass} to="/">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link className={linkClass} to="/subjects">
            Subjects
          </Link>
        </li>
        {subject && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link className={linkClass} to="/subjects/$slug" params={{ slug: subject.slug }}>
                {subject.name}
              </Link>
            </li>
          </>
        )}
        {section && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                className={linkClass}
                to="/projects/$slug"
                params={{ slug: project.slug }}
                search={{ section: undefined }}
              >
                {project.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                className={linkClass}
                to="/projects/$slug"
                params={{ slug: project.slug }}
                search={{ section: section.slug }}
              >
                {section.title}
              </Link>
            </li>
          </>
        )}
        {page && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link className={linkClass} to="/pages/$slug" params={{ slug: page.slug }}>
                {page.title}
              </Link>
            </li>
          </>
        )}
        <li aria-hidden="true">/</li>
        <li className="text-foreground" aria-current="page">
          {current}
        </li>
      </ol>
    </nav>
  )
}
