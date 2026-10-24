const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API = process.env.API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  return fetch(`${API}${path}`, options);
}

async function login(email, password) {
  const res = await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  assert.equal(res.status, 200, data.message);
  return { token: data.token, cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

test('health endpoint reports a connected database', async () => {
  const res = await request('/api/health');
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.status, 'ok');
  assert.equal(data.database, 'connected');
});

test('refresh tokens rotate and logout revokes the session', async () => {
  const { cookie } = await login('student@seatudy.local', 'Student@123');
  assert.ok(cookie, 'login should set an httpOnly refresh cookie');

  const refresh = await request('/api/auth/refresh', {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  const refreshed = await refresh.json();
  assert.equal(refresh.status, 200);
  assert.ok(refreshed.token);

  const rotatedCookie = refresh.headers.get('set-cookie')?.split(';')[0];
  assert.ok(rotatedCookie);

  const reuse = await request('/api/auth/refresh', {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  assert.equal(reuse.status, 401);

  const logout = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: rotatedCookie },
  });
  assert.equal(logout.status, 200);

  const afterLogout = await request('/api/auth/refresh', {
    method: 'POST',
    headers: { Cookie: rotatedCookie },
  });
  assert.equal(afterLogout.status, 401);
});

test('expired access tokens return 401 so the client can refresh', async () => {
  const { token } = await login('student@seatudy.local', 'Student@123');
  const { id, role } = jwt.decode(token);
  const expired = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: -1 });

  const res = await request('/api/profile', {
    headers: { Authorization: `Bearer ${expired}` },
  });
  assert.equal(res.status, 401);
});

test('student dashboard exposes a continue-learning course', async () => {
  const { token } = await login('student@seatudy.local', 'Student@123');
  const res = await request('/api/dashboard/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.role, 'student');
  assert.ok(data.continueCourse);
  assert.ok(data.continueCourse.href.startsWith('/dashboard/student/courses/'));
});

test('top-up rejects amounts above the demo limit', async () => {
  const { token } = await login('student@seatudy.local', 'Student@123');
  const res = await request('/api/student/topup', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 10001 }),
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /10,000/);
});

test('admin forum access checks that the course exists', async () => {
  const { token } = await login('admin@seatudy.local', 'Admin@123');
  const res = await request('/api/student/forum/999999', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 404);
});

test('student assignment list includes submission details', async () => {
  const { token } = await login('student@seatudy.local', 'Student@123');
  const res = await request('/api/student/assignments', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);
  assert.ok('feedback' in data[0]);
  assert.ok('graded_at' in data[0]);
});

test('uploads require authentication and course access', async () => {
  const { token } = await login('student@seatudy.local', 'Student@123');
  const coursesRes = await request('/api/student/courses', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const courses = await coursesRes.json();
  const course = courses.enrolled[0];
  assert.ok(course, 'demo student should have an enrolled course');

  const detailRes = await request(`/api/student/courses/${course.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const detail = await detailRes.json();
  const material = detail.materials[0];
  assert.ok(material, 'course should have at least one material');

  const anonymous = await request(`/api/files/materials/${material.id}`);
  assert.equal(anonymous.status, 401);

  const allowed = await request(`/api/files/materials/${material.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(allowed.status, 200);
});

test('students can submit and resubmit an assignment', async () => {
  const { token } = await login('student@seatudy.local', 'Student@123');
  const coursesRes = await request('/api/student/courses', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const courses = await coursesRes.json();
  const course = courses.enrolled[0];
  const detail = await (
    await request(`/api/student/courses/${course.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  const assignment = detail.assignments[0];
  assert.ok(assignment, 'course should have an assignment');

  const body = new URLSearchParams({ content: 'Automated test submission' });
  const first = await request(
    `/api/student/courses/${course.id}/assignments/${assignment.id}/submit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );
  assert.ok([200, 201].includes(first.status));

  const second = await request(
    `/api/student/courses/${course.id}/assignments/${assignment.id}/submit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ content: 'Automated test resubmission' }),
    }
  );
  const secondData = await second.json();
  assert.equal(second.status, 200);
  assert.equal(secondData.resubmitted, true);
});

test('submission uploads reject unsupported file types', async () => {
  const { token } = await login('student@seatudy.local', 'Student@123');
  const coursesRes = await request('/api/student/courses', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const courses = await coursesRes.json();
  const course = courses.enrolled[0];
  const detail = await (
    await request(`/api/student/courses/${course.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  const assignment = detail.assignments[0];

  const form = new FormData();
  form.append('content', 'Unsupported file test');
  form.append('files', new Blob(['test']), 'payload.exe');

  const res = await request(
    `/api/student/courses/${course.id}/assignments/${assignment.id}/submit`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /Unsupported file type/);
});

test('forum supports replies, editing, and deletion', async () => {
  const { token } = await login('student@seatudy.local', 'Student@123');
  const coursesRes = await request('/api/student/courses', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const courses = await coursesRes.json();
  const courseId = courses.enrolled[0].id;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const post = await request(`/api/student/forum/${courseId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'Automated test thread' }),
  });
  const postData = await post.json();
  assert.equal(post.status, 201);
  const threadId = postData.forumMessage.id;

  const reply = await request(`/api/student/forum/${courseId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'Automated reply', parentId: threadId }),
  });
  assert.equal(reply.status, 201);

  const edit = await request(`/api/student/forum/${courseId}/${threadId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message: 'Automated test thread (edited)' }),
  });
  assert.equal(edit.status, 200);

  const list = await (
    await request(`/api/student/forum/${courseId}`, { headers })
  ).json();
  const thread = list.messages.find((message) => message.id === threadId);
  assert.ok(thread);
  assert.equal(thread.replies.length, 1);

  const remove = await request(`/api/student/forum/${courseId}/${threadId}`, {
    method: 'DELETE',
    headers,
  });
  assert.equal(remove.status, 200);
});

test('instructor and admin can moderate a course forum', async () => {
  const instructor = await login('instructor@seatudy.local', 'Instructor@123');
  const coursesRes = await request('/api/instructor/courses', {
    headers: { Authorization: `Bearer ${instructor.token}` },
  });
  const courses = await coursesRes.json();
  const courseId = courses[0]?.id;
  assert.ok(courseId, 'demo instructor should own a course');

  const instructorForum = await request(`/api/student/forum/${courseId}`, {
    headers: { Authorization: `Bearer ${instructor.token}` },
  });
  assert.equal(instructorForum.status, 200);
  assert.equal((await instructorForum.json()).moderator, true);

  const admin = await login('admin@seatudy.local', 'Admin@123');
  const adminForum = await request(`/api/student/forum/${courseId}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  assert.equal(adminForum.status, 200);
  assert.equal((await adminForum.json()).moderator, true);
});

test('admin user list is paginated and audit log is available', async () => {
  const { token } = await login('admin@seatudy.local', 'Admin@123');
  const usersRes = await request('/api/users?page=1&limit=5&exclude=admin', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await usersRes.json();
  assert.equal(usersRes.status, 200);
  assert.ok(Array.isArray(data.users));
  assert.ok(data.users.length <= 5);
  assert.ok(data.pagination.total > 0);

  const auditRes = await request('/api/admin/audit-logs?limit=5', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const logs = await auditRes.json();
  assert.equal(auditRes.status, 200);
  assert.ok(Array.isArray(logs));

  const instructorRes = await request(
    '/api/users?search=instructor%40seatudy.local&exclude=admin',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const instructor = (await instructorRes.json()).users[0];
  const demote = await request(`/api/users/${instructor.id}/role`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'student' }),
  });
  assert.equal(demote.status, 400);
  assert.match((await demote.json()).message, /still owns courses/);
});
