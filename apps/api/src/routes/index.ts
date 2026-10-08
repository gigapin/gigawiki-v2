import type { FastifyInstance } from 'fastify'

import {
  fetchProjectsBySubject,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  fetchProjectActivity,
} from './projects/projectsRoute.js'
import {
  createSubject,
  fetchSubject,
  fetchAllSubjects,
  updateSubject,
  deleteSubject,
} from './subjects/subjectsRoute.js'
import {
  fetchSectionsByProject,
  fetchSection,
  createSection,
  updateSection,
  reorderSections,
  deleteSection,
} from './sections/sectionsRoute.js'
import {
  fetchUser,
  updateUser,
  deleteUser,
  fetchAllUsers,
  uploadAvatar,
  inviteUser,
} from './users/usersRoutes.js'
import {
  fetchPagesBySection,
  fetchPage,
  createPage,
  replacePage,
  updatePage,
  deletePage,
  searchPages,
} from './pages/pagesRoute.js'
import { fetchRevisions, fetchRevision, restoreRevision } from './revisions/revisionsRoute.js'
import {
  fetchPageComments,
  fetchProjectComments,
  fetchSectionComments,
  createComment,
  updateComment,
  deleteComment,
} from './comments/commentsRoute.js'
import { fetchTags, createTag, deleteTag } from './tags/tagsRoute.js'
import { fetchFavorites, toggleFavorite } from './favorites/favoritesRoute.js'
import { fetchPageViews } from './views/viewsRoute.js'
import { fetchActivities, fetchUserActivities } from './activities/activitiesRoute.js'
import { uploadImage, deleteImage, serveUploadedImage } from './images/imagesRoute.js'
import { fetchSettings, updateSetting } from './settings/settingsRoute.js'
import {
  login,
  logout,
  refresh,
  register,
  resendVerification,
  forgotPassword,
  resetPassword,
  verifyEmail,
  acceptInvite,
  me,
} from './auth/authRoutes.js'

export function registerRoutes(app: FastifyInstance) {
  app.register(serveUploadedImage)
  // Auth routes (unprotected, under /api/v2)
  app.register(
    (instance, _, done) => {
      instance.register(login)
      instance.register(logout)
      instance.register(refresh)
      instance.register(register)
      instance.register(resendVerification)
      instance.register(forgotPassword)
      instance.register(resetPassword)
      instance.register(verifyEmail)
      instance.register(acceptInvite)
      instance.register(me)

      // Public: the frontend needs these before a session exists
      instance.register(fetchSettings)

      done()
    },
    { prefix: '/api/v2' },
  )

  // Public routes
  /* app.register(
    (instance, _, done) => {
      instance.register(fetchAllSubjects)
      instance.register(fetchSubject)
      instance.register(fetchProjectsBySubject)
      instance.register(fetchProject)
      instance.register(fetchSectionsByProject)
      instance.register(fetchSection)
      instance.register(fetchPagesBySection)
      instance.register(fetchPage)
      instance.register(fetchRevisions)
      instance.register(fetchRevision)
      instance.register(fetchPageComments)
      instance.register(fetchProjectComments)
      instance.register(fetchSectionComments)
      instance.register(fetchTags)
      instance.register(fetchPageViews)

      done()
    },
    { prefix: '/api/v2' },
  )
*/
  // Protected routes
  app.register(
    (instance, _, done) => {
      instance.addHook('preHandler', instance.authenticate)

      instance.register(fetchAllSubjects)
      instance.register(fetchSubject)
      instance.register(fetchProjectsBySubject)
      instance.register(fetchProject)
      instance.register(fetchSectionsByProject)
      instance.register(fetchSection)
      instance.register(fetchPagesBySection)
      instance.register(fetchPage)
      instance.register(fetchRevisions)
      instance.register(fetchRevision)
      instance.register(fetchPageComments)
      instance.register(fetchProjectComments)
      instance.register(fetchSectionComments)
      instance.register(fetchTags)
      instance.register(fetchPageViews)

      instance.register(createProject)
      instance.register(updateProject)
      instance.register(deleteProject)
      instance.register(fetchProjectActivity)

      instance.register(createSubject)
      instance.register(updateSubject)
      instance.register(deleteSubject)

      instance.register(createSection)
      instance.register(updateSection)
      instance.register(reorderSections)
      instance.register(deleteSection)

      instance.register(createPage)
      instance.register(replacePage)
      instance.register(updatePage)
      instance.register(deletePage)
      instance.register(searchPages)

      instance.register(restoreRevision)

      instance.register(createComment)
      instance.register(updateComment)
      instance.register(deleteComment)

      instance.register(fetchAllUsers)
      instance.register(fetchUser)
      instance.register(updateUser)
      instance.register(deleteUser)
      instance.register(uploadAvatar)
      instance.register(inviteUser)

      instance.register(createTag)
      instance.register(deleteTag)

      instance.register(fetchFavorites)
      instance.register(toggleFavorite)

      instance.register(fetchActivities)
      instance.register(fetchUserActivities)

      instance.register(uploadImage)
      instance.register(deleteImage)

      instance.register(updateSetting)

      done()
    },
    { prefix: '/api/v2' },
  )
}
