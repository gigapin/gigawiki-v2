# API Endpoint Test Results

**Date:** 2026-05-27  
**Base URL:** `http://localhost:3001`  
**Auth:** JWT Bearer token (admin@gigawiki.local / Admin1234!)  
**Tool:** curl

---

## Summary

| Category | Total | ✅ Pass (2xx) | ⚠️ Expected Error | ❌ Fail |
|----------|-------|--------------|-------------------|---------|
| Health | 1 | 1 | 0 | 0 |
| Auth | 9 | 6 | 3 | 0 |
| Users | 5 | 5 | 0 | 0 |
| Images | 2 | 2 | 0 | 0 |
| Subjects | 5 | 5 | 0 | 0 |
| Projects | 6 | 6 | 0 | 0 |
| Sections | 6 | 6 | 0 | 0 |
| Pages | 6 | 6 | 0 | 0 |
| Revisions | 3 | 3 | 0 | 0 |
| Comments | 9 | 9 | 0 | 0 |
| Tags | 3 | 3 | 0 | 0 |
| Favorites | 2 | 2 | 0 | 0 |
| Views | 1 | 1 | 0 | 0 |
| Activities | 2 | 2 | 0 | 0 |
| **Search** | **1** | **0** | **0** | **1** |
| **Total** | **61** | **57** | **3** | **1** |

> ⚠️ **Expected errors** = endpoints tested with invalid tokens (proper 400/404 responses, correct behavior).  
> ❌ **Fail** = `GET /api/v2/search` returns 500 — Meilisearch is not running (not in docker-compose, optional service).

---

## 1. Health

### `GET /health`
```bash
curl http://localhost:3001/health
```
**Status:** `200 OK`  
**Response:**
```json
{"status":"ok","uptime":32.965032823}
```

---

## 2. Auth

### `POST /api/v2/auth/register`
```bash
curl -X POST http://localhost:3001/api/v2/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"testuser@example.com","password":"Test@12345!"}'
```
**Status:** `201 Created`  
**Response:**
```json
{"message":"Registration successful. Please verify your email."}
```

---

### `POST /api/v2/auth/login`
```bash
curl -X POST http://localhost:3001/api/v2/auth/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gigawiki.local","password":"Admin1234!"}'
```
**Status:** `200 OK`  
**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
> Sets `refreshToken` HTTP-only cookie. `accessToken` used in all subsequent requests.

---

### `GET /api/v2/auth/me`
```bash
curl http://localhost:3001/api/v2/auth/me \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{
  "user": {
    "id": "cmpnsn1d2000085c8eg8ifta9",
    "name": "Admin",
    "email": "admin@gigawiki.local",
    "emailVerifiedAt": "2026-05-27T08:19:54.472Z",
    "emailConfirmed": true,
    "slug": "admin",
    "role": "ADMIN",
    "avatarId": null,
    "createdAt": "2026-05-27T08:19:54.662Z",
    "updatedAt": "2026-05-27T08:19:54.662Z",
    "avatar": null
  }
}
```

---

### `POST /api/v2/auth/forgot-password`
```bash
curl -X POST http://localhost:3001/api/v2/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gigawiki.local"}'
```
**Status:** `200 OK`  
**Response:**
```json
{"message":"If that email is registered, a reset link has been sent."}
```

---

### `POST /api/v2/auth/verify-email` _(invalid token — expected error)_
```bash
curl -X POST http://localhost:3001/api/v2/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"fake-token"}'
```
**Status:** `400 Bad Request` ✅ _(correct behavior)_  
**Response:**
```json
{"error":"Invalid or expired verification token"}
```

---

### `POST /api/v2/auth/reset-password` _(invalid token — expected error)_
```bash
curl -X POST http://localhost:3001/api/v2/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"fake-token","newPassword":"NewPass123!"}'
```
**Status:** `400 Bad Request` ✅ _(correct behavior)_  
**Response:**
```json
{"error":"Invalid or expired reset token"}
```

---

### `POST /api/v2/auth/accept-invite` _(invalid token — expected error)_
```bash
curl -X POST http://localhost:3001/api/v2/auth/accept-invite \
  -H "Content-Type: application/json" \
  -d '{"token":"fake-token","name":"Test","password":"Pass123!"}'
```
**Status:** `404 Not Found` ✅ _(correct behavior)_  
**Response:**
```json
{"error":"Invite not found"}
```

---

### `POST /api/v2/auth/refresh`
```bash
curl -X POST http://localhost:3001/api/v2/auth/refresh \
  -b cookies.txt
```
**Status:** `200 OK`  
**Response:**
```json
{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

---

### `POST /api/v2/auth/logout`
```bash
curl -X POST http://localhost:3001/api/v2/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -b cookies.txt
```
**Status:** `204 No Content`

---

## 3. Users

### `GET /api/v2/users`
```bash
curl http://localhost:3001/api/v2/users \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{
  "users": [
    {"id":"cmpnsn1d2000085c8eg8ifta9","name":"Admin","email":"admin@gigawiki.local","slug":"admin","role":"ADMIN",...},
    {"id":"cmpnsn1dm000185c84gcok4er","name":"Editor","email":"editor@gigawiki.local","slug":"editor","role":"EDITOR",...}
  ],
  "total": 6,
  "page": 1,
  "limit": 20
}
```

---

### `GET /api/v2/users/:id`
```bash
curl http://localhost:3001/api/v2/users/cmpnsn1d2000085c8eg8ifta9 \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{
  "id": "cmpnsn1d2000085c8eg8ifta9",
  "name": "Admin",
  "email": "admin@gigawiki.local",
  "slug": "admin",
  "role": "ADMIN",
  "emailConfirmed": true
}
```

---

### `PATCH /api/v2/users/:id`
```bash
curl -X PATCH http://localhost:3001/api/v2/users/cmpnsn1d2000085c8eg8ifta9 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin Updated"}'
```
**Status:** `200 OK`  
**Response:**
```json
{"id":"cmpnsn1d2000085c8eg8ifta9","name":"Admin Updated","slug":"admin","role":"ADMIN",...}
```

---

### `POST /api/v2/users/invite`
```bash
curl -X POST http://localhost:3001/api/v2/users/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","name":"Invited User","role":"EDITOR"}'
```
**Status:** `201 Created`  
**Response:**
```json
{
  "invite": {
    "id": "cmpnwa2sj0003ilf73he663re",
    "email": "invite_1779876108@example.com",
    "name": "Invited User",
    "role": "EDITOR",
    "sentById": "cmpnsn1d2000085c8eg8ifta9",
    "acceptedAt": null,
    "expiresAt": "2026-06-03T10:01:48.449Z",
    "token": "cmpnwa2sj0004ilf7grn0w3sx"
  }
}
```

---

### `POST /api/v2/users/:id/avatar`
```bash
curl -X POST http://localhost:3001/api/v2/users/cmpnsn1d2000085c8eg8ifta9/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@avatar.png;type=image/png"
```
**Status:** `200 OK`  
**Response:**
```json
{
  "id": "cmpnsn1d2000085c8eg8ifta9",
  "name": "Admin",
  "avatarId": "cmpnwcv3r000jilf7bu8tgkeb",
  ...
}
```

---

## 4. Images

### `POST /api/v2/images`
```bash
curl -X POST "http://localhost:3001/api/v2/images?type=INLINE" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@image.png;type=image/png"
```
**Status:** `201 Created`  
**Response:**
```json
{
  "id": "cmpnwa2xj0005ilf7hyzr10vt",
  "url": "http://localhost:3001/uploads/uploads/cmpnsn1d.../2026/05/4HJBbBzZFB.webp"
}
```

---

### `DELETE /api/v2/images/:id`
```bash
curl -X DELETE http://localhost:3001/api/v2/images/cmpnwa2xj0005ilf7hyzr10vt \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"message":"Image deleted successfully"}
```

---

## 5. Subjects

### `POST /api/v2/subjects`
```bash
curl -X POST http://localhost:3001/api/v2/subjects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Subject","description":"A test subject","visibility":"PUBLIC"}'
```
**Status:** `201 Created`  
**Response:**
```json
{
  "id": "cmpnwaf9d0006ilf7ses42t14",
  "name": "Test Subject",
  "slug": "test-subject",
  "description": "A test subject",
  "visibility": "PUBLIC",
  "userId": "cmpnsn1d2000085c8eg8ifta9"
}
```

---

### `GET /api/v2/subjects`
```bash
curl http://localhost:3001/api/v2/subjects \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"subjects": [...], "total": 6, "page": 1, "limit": 20}
```

---

### `GET /api/v2/subjects/:slug`
```bash
curl http://localhost:3001/api/v2/subjects/test-subject \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"id":"cmpnwaf9d0006ilf7ses42t14","name":"Test Subject","slug":"test-subject","projects":[]}
```

---

### `PATCH /api/v2/subjects/:slug`
```bash
curl -X PATCH http://localhost:3001/api/v2/subjects/test-subject \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description"}'
```
**Status:** `200 OK`  
**Response:**
```json
{"id":"cmpnwaf9d0006ilf7ses42t14","description":"Updated description",...}
```

---

### `DELETE /api/v2/subjects/:slug`
```bash
curl -X DELETE http://localhost:3001/api/v2/subjects/test-subject \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"message":"Subject deleted successfully"}
```

---

## 6. Projects

### `POST /api/v2/projects`
```bash
curl -X POST http://localhost:3001/api/v2/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","subjectId":"<subjectId>","description":"A test project","visibility":"PUBLIC"}'
```
**Status:** `201 Created`  
**Response:**
```json
{
  "id": "cmpnwafgb0007ilf7xhusqqxz",
  "name": "Test Project",
  "slug": "test-project",
  "subjectId": "cmpnwaf9d0006ilf7ses42t14",
  "visibility": "PUBLIC"
}
```

---

### `GET /api/v2/subjects/:subjectSlug/projects`
```bash
curl http://localhost:3001/api/v2/subjects/test-subject/projects \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"projects":[{"id":"cmpnwafgb0007ilf7xhusqqxz","name":"Test Project","slug":"test-project",...}],"total":1}
```

---

### `GET /api/v2/projects/:slug`
```bash
curl http://localhost:3001/api/v2/projects/test-project \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"id":"cmpnwafgb0007ilf7xhusqqxz","name":"Test Project","slug":"test-project","sections":[],"tags":[],"_count":{"favorites":0}}
```

---

### `PATCH /api/v2/projects/:slug`
```bash
curl -X PATCH http://localhost:3001/api/v2/projects/test-project \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated project description"}'
```
**Status:** `200 OK`

---

### `GET /api/v2/projects/:slug/activity`
```bash
curl http://localhost:3001/api/v2/projects/test-project/activity \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"activities":[],"total":0,"page":1,"limit":20}
```

---

### `DELETE /api/v2/projects/:slug`
```bash
curl -X DELETE http://localhost:3001/api/v2/projects/test-project \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"message":"Project deleted successfully"}
```

---

## 7. Sections

### `POST /api/v2/sections`
```bash
curl -X POST http://localhost:3001/api/v2/sections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<projectId>","title":"Test Section","description":"A test section","visibility":"PUBLIC"}'
```
**Status:** `201 Created`  
**Response:**
```json
{
  "id": "cmpnwap550009ilf70dsixtuh",
  "title": "Test Section",
  "slug": "test-section",
  "position": 0,
  "visibility": "PUBLIC"
}
```

---

### `GET /api/v2/projects/:projectSlug/sections`
```bash
curl http://localhost:3001/api/v2/projects/test-project/sections \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"sections":[{"id":"cmpnwap550009ilf70dsixtuh","title":"Test Section","slug":"test-section","position":0,...}]}
```

---

### `GET /api/v2/sections/:slug`
```bash
curl http://localhost:3001/api/v2/sections/test-section \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`

---

### `PATCH /api/v2/sections/:slug`
```bash
curl -X PATCH http://localhost:3001/api/v2/sections/test-section \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated section"}'
```
**Status:** `200 OK`

---

### `PATCH /api/v2/sections/:slug/position`
```bash
curl -X PATCH http://localhost:3001/api/v2/sections/test-section/position \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"positions":[{"id":"<sectionId>","position":0}]}'
```
**Status:** `200 OK`  
**Response:**
```json
{"message":"Positions updated"}
```

---

### `DELETE /api/v2/sections/:slug`
```bash
curl -X DELETE http://localhost:3001/api/v2/sections/test-section \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"message":"Section deleted successfully"}
```

---

## 8. Pages

### `POST /api/v2/pages`
```bash
curl -X POST http://localhost:3001/api/v2/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Page","content":"Hello world content","sectionId":"<sectionId>","isDraft":false,"visibility":"PUBLIC"}'
```
**Status:** `201 Created`  
**Response:**
```json
{
  "id": "cmpnwaygw000ailf7voe3n2kb",
  "title": "Test Page",
  "slug": "test-page",
  "currentRevision": 0,
  "visibility": "PUBLIC",
  "isDraft": false
}
```

---

### `GET /api/v2/sections/:sectionSlug/pages`
```bash
curl http://localhost:3001/api/v2/sections/test-section/pages \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"pages":[{"id":"...","title":"Test Page","slug":"test-page","isDraft":false,...}],"total":1}
```

---

### `GET /api/v2/pages/:slug`
```bash
curl http://localhost:3001/api/v2/pages/test-page \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{
  "id": "cmpnwaygw000ailf7voe3n2kb",
  "title": "Test Page",
  "slug": "test-page",
  "content": "Hello world content",
  "currentRevision": 0,
  "tags": [],
  "_count": {"comments": 0, "favorites": 0}
}
```

---

### `PUT /api/v2/pages/:slug`
```bash
curl -X PUT http://localhost:3001/api/v2/pages/test-page \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Page Title","content":"Updated content here"}'
```
**Status:** `200 OK`  
**Response:**
```json
{"id":"...","title":"Updated Page Title","slug":"updated-page-title","currentRevision":1,...}
```
> **Note:** PUT regenerates the slug from the new title.

---

### `PATCH /api/v2/pages/:slug`
```bash
curl -X PATCH http://localhost:3001/api/v2/pages/updated-page-title \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isDraft":false,"visibility":"PUBLIC"}'
```
**Status:** `200 OK`

---

### `GET /api/v2/search` ❌
```bash
curl "http://localhost:3001/api/v2/search?q=test" \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `500 Internal Server Error`  
**Response:**
```json
{"success":false,"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred"}}
```
> **Root cause:** Meilisearch is not running. It is an optional service (`MEILISEARCH_HOST=http://localhost:7700`) that is not included in `docker-compose.yml`. Start Meilisearch separately to use this endpoint.

---

### `DELETE /api/v2/pages/:slug`
```bash
curl -X DELETE http://localhost:3001/api/v2/pages/test-page \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"message":"Page deleted successfully"}
```

---

## 9. Revisions

### `GET /api/v2/pages/:pageSlug/revisions`
```bash
curl http://localhost:3001/api/v2/pages/updated-page-title/revisions \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{
  "revisions": [
    {
      "id": "cmpnwayni000cilf758teydgq",
      "revisionNumber": 0,
      "title": "Test Page",
      "summary": null,
      "createdAt": "2026-05-27T10:02:29.742Z",
      "createdBy": {"id": "...", "name": "Admin"}
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```
> **Note:** Revision numbers start at `0`, not `1`.

---

### `GET /api/v2/pages/:pageSlug/revisions/:revisionNumber`
```bash
curl http://localhost:3001/api/v2/pages/updated-page-title/revisions/0 \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{
  "id": "cmpnwayni000cilf758teydgq",
  "revisionNumber": 0,
  "title": "Test Page",
  "content": "Hello world content",
  "slug": "test-page",
  "createdBy": {"id": "...", "name": "Admin"}
}
```

---

### `POST /api/v2/pages/:pageSlug/revisions/:revisionNumber/restore`
```bash
curl -X POST http://localhost:3001/api/v2/pages/updated-page-title/revisions/0/restore \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{
  "id": "cmpnwaygw000ailf7voe3n2kb",
  "title": "Test Page",
  "slug": "test-page",
  "currentRevision": 2
}
```
> **Note:** Restoring a revision creates a new revision entry and regenerates the slug from the restored title.

---

## 10. Comments

### `POST /api/v2/comments` (on page)
```bash
curl -X POST http://localhost:3001/api/v2/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"Test page comment","pageId":"<pageId>"}'
```
**Status:** `201 Created`  
**Response:**
```json
{"id":"cmpnwc4au000dilf7i46fdrzf","body":"Test page comment","userId":"...","user":{"name":"Admin"}}
```

---

### `POST /api/v2/comments` (on project)
```bash
curl -X POST http://localhost:3001/api/v2/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"Test project comment","projectId":"<projectId>"}'
```
**Status:** `201 Created`

---

### `POST /api/v2/comments` (on section)
```bash
curl -X POST http://localhost:3001/api/v2/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"Test section comment","sectionId":"<sectionId>"}'
```
**Status:** `201 Created`

---

### `GET /api/v2/pages/:pageSlug/comments`
```bash
curl http://localhost:3001/api/v2/pages/test-page/comments \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"comments":[{"id":"...","body":"Test page comment","replies":[],...}],"total":1}
```

---

### `GET /api/v2/projects/:projectSlug/comments`
```bash
curl http://localhost:3001/api/v2/projects/test-project/comments \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`

---

### `GET /api/v2/sections/:sectionSlug/comments`
```bash
curl http://localhost:3001/api/v2/sections/test-section/comments \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`

---

### `PATCH /api/v2/comments/:id`
```bash
curl -X PATCH http://localhost:3001/api/v2/comments/<commentId> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"Updated comment"}'
```
**Status:** `200 OK`  
**Response:**
```json
{"id":"...","body":"Updated comment","updatedAt":"2026-05-27T10:03:24.095Z"}
```

---

### `DELETE /api/v2/comments/:id`
```bash
curl -X DELETE http://localhost:3001/api/v2/comments/<commentId> \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"message":"Comment deleted successfully"}
```

---

## 11. Tags

### `POST /api/v2/tags`
```bash
curl -X POST http://localhost:3001/api/v2/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-tag","pageId":"<pageId>"}'
```
**Status:** `201 Created`  
**Response:**
```json
{"id":"cmpnwcuty000hilf7g8o9mopr","name":"test-tag","createdAt":"2026-05-27T10:03:58.102Z"}
```

---

### `GET /api/v2/tags`
```bash
curl http://localhost:3001/api/v2/tags \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:** `[]` _(empty array when no tags exist)_

---

### `DELETE /api/v2/tags/:id`
```bash
curl -X DELETE http://localhost:3001/api/v2/tags/<tagId> \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"message":"Tag deleted successfully"}
```

---

## 12. Favorites

### `POST /api/v2/favorites`
```bash
curl -X POST http://localhost:3001/api/v2/favorites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pageId":"<pageId>"}'
```
**Status:** `200 OK`  
**Response:**
```json
{"favorited":true}
```

---

### `GET /api/v2/favorites`
```bash
curl http://localhost:3001/api/v2/favorites \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{
  "favorites": [
    {
      "id": "cmpnwcuxx000iilf7cs7vvljh",
      "pageId": "cmpnwaygw000ailf7voe3n2kb",
      "page": {"id": "...", "title": "Test Page", "slug": "test-page"},
      "project": null,
      "section": null
    }
  ],
  "total": 1
}
```

---

## 13. Views

### `GET /api/v2/pages/:pageSlug/views`
```bash
curl http://localhost:3001/api/v2/pages/test-page/views \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"totalViews":1,"uniqueViewers":1}
```

---

## 14. Activities

### `GET /api/v2/activities`
```bash
curl http://localhost:3001/api/v2/activities \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"activities":[],"total":0,"page":1,"limit":20}
```

---

### `GET /api/v2/users/:id/activities`
```bash
curl http://localhost:3001/api/v2/users/cmpnsn1d2000085c8eg8ifta9/activities \
  -H "Authorization: Bearer $TOKEN"
```
**Status:** `200 OK`  
**Response:**
```json
{"activities":[],"total":0,"page":1,"limit":20}
```

---

## Issues Found

### ❌ `GET /api/v2/search` — 500 Internal Server Error

**Cause:** Meilisearch is not running. The endpoint depends on `MEILISEARCH_HOST=http://localhost:7700` but this service is not included in `docker-compose.yml`.

**Fix options:**
1. Add Meilisearch to `docker-compose.yml`:
   ```yaml
   meilisearch:
     image: getmeili/meilisearch:v1.8
     ports:
       - "7700:7700"
     environment:
       MEILI_NO_ANALYTICS: "true"
   ```
2. Or add graceful fallback in the search route handler when Meilisearch is unreachable.

---

### ⚠️ Revision numbering starts at `0`

The first revision of a page has `revisionNumber: 0`, not `1`. This is consistent but may be unexpected for API consumers — worth documenting in the API docs.

---

### ⚠️ PUT `/api/v2/pages/:slug` regenerates the slug

When you PUT a page with a new title, the slug is regenerated from the new title. Subsequent calls using the old slug will get `404`. This is expected behavior but callers should capture the new slug from the response.
