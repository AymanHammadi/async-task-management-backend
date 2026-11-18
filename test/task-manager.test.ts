import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TaskManager } from '../src/task-manager.js';
import type { TaskChanges } from '../src/types.js';

test('a new manager has no users or tasks', async () => {
  const manager = new TaskManager();
  assert.deepEqual(await manager.listUsers(), []);
  assert.deepEqual(await manager.listTasks(), []);
});

test('creates, normalizes, lists, and retrieves users', async () => {
  const manager = new TaskManager();
  const user = await manager.createUser(' Ayman ', ' AYMAN@EXAMPLE.COM ');
  assert.deepEqual(user, { id: 1, name: 'Ayman', email: 'ayman@example.com' });
  assert.deepEqual(await manager.getUser(user.id), user);
  assert.deepEqual(await manager.listUsers(), [user]);
});

test('rejects empty user fields without consuming IDs', async () => {
  const manager = new TaskManager();
  await assert.rejects(manager.createUser(' ', 'ayman@example.com'), /User name/);
  await assert.rejects(manager.createUser('Ayman', ' '), /User email/);
  assert.equal((await manager.createUser('Ayman', 'ayman@example.com')).id, 1);
});

test('rejects duplicate normalized emails', async () => {
  const manager = new TaskManager();
  await manager.createUser('Ayman', 'ayman@example.com');
  await assert.rejects(
    manager.createUser('Another user', ' AYMAN@EXAMPLE.COM '),
    /A user with this email already exists/,
  );
  assert.equal((await manager.listUsers()).length, 1);
});

test('concurrent duplicate user creation permits only one user', async () => {
  const manager = new TaskManager();
  const results = await Promise.allSettled([
    manager.createUser('Ayman', 'ayman@example.com'),
    manager.createUser('Another user', 'AYMAN@example.com'),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal((await manager.listUsers()).length, 1);
});

test('rejects unknown users', async () => {
  const manager = new TaskManager();
  await assert.rejects(manager.getUser(999), /User with ID 999 not found/);
});

test('user results cannot mutate storage', async () => {
  const manager = new TaskManager();
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  user.name = 'Changed';
  const fetched = await manager.getUser(user.id);
  fetched.email = 'changed@example.com';
  const users = await manager.listUsers();
  assert.ok(users[0]);
  users[0].name = 'Changed again';
  users.length = 0;
  assert.deepEqual(await manager.listUsers(), [
    { id: 1, name: 'Ayman', email: 'ayman@example.com' },
  ]);
});

test('creates and retrieves an incomplete task owned by an existing user', async () => {
  const manager = new TaskManager();
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  const task = await manager.createTask(user.id, ' Learn TypeScript ');
  assert.deepEqual(task, { id: 1, userId: user.id, title: 'Learn TypeScript', completed: false });
  assert.deepEqual(await manager.getTask(task.id), task);
  assert.deepEqual(await manager.listTasks(), [task]);
});

test('rejects missing owners and empty titles without consuming task IDs', async () => {
  const manager = new TaskManager();
  await assert.rejects(manager.createTask(999, 'Task'), /User with ID 999 not found/);
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  await assert.rejects(manager.createTask(user.id, ' '), /Task title/);
  assert.equal((await manager.createTask(user.id, 'Valid task')).id, 1);
});

test('concurrent task creation produces distinct IDs and preserves both tasks', async () => {
  const manager = new TaskManager();
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  const [first, second] = await Promise.all([
    manager.createTask(user.id, 'First task'),
    manager.createTask(user.id, 'Second task'),
  ]);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(await manager.listTasks(), [first, second]);
});

test('updates the title and completion, preserves ownership, and reopens tasks', async () => {
  const manager = new TaskManager();
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  const task = await manager.createTask(user.id, 'Original title');
  assert.deepEqual(await manager.updateTask(task.id, { title: ' New title ' }), {
    ...task,
    title: 'New title',
  });
  assert.equal((await manager.updateTask(task.id, { completed: true })).completed, true);
  assert.deepEqual(await manager.updateTask(task.id, { title: ' Reopened ', completed: false }), {
    ...task,
    title: 'Reopened',
  });
});

test('rejects empty, invalid, and unsupported updates', async () => {
  const manager = new TaskManager();
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  const task = await manager.createTask(user.id, 'Original title');
  const invalidChanges: unknown[] = [
    null,
    [],
    'invalid',
    {},
    { userId: 2 },
    { id: 2 },
    { title: ' ' },
    { title: undefined },
    { title: 123 },
    { completed: 'yes' },
    { completed: undefined },
  ];

  for (const changes of invalidChanges) {
    // Bypass static types to check malformed input from JavaScript callers.
    await assert.rejects(manager.updateTask(task.id, changes as TaskChanges));
  }

  assert.deepEqual(await manager.getTask(task.id), task);
});

test('a failed update does not partially change a task', async () => {
  const manager = new TaskManager();
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  const task = await manager.createTask(user.id, 'Original title');
  const changes: unknown = { title: 'Changed title', completed: 'yes' };
  // Bypass static types to verify runtime validation before storage changes.
  await assert.rejects(manager.updateTask(task.id, changes as TaskChanges), /must be a boolean/);
  assert.deepEqual(await manager.getTask(task.id), task);
});

test('rejects getting, updating, and deleting missing tasks', async () => {
  const manager = new TaskManager();
  await assert.rejects(manager.getTask(999), /Task with ID 999 not found/);
  await assert.rejects(manager.updateTask(999, { completed: true }), /Task with ID 999 not found/);
  await assert.rejects(manager.deleteTask(999), /Task with ID 999 not found/);
});

test('deletes tasks without reusing their IDs or affecting other tasks', async () => {
  const manager = new TaskManager();
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  const first = await manager.createTask(user.id, 'First task');
  const second = await manager.createTask(user.id, 'Second task');
  assert.deepEqual(await manager.deleteTask(first.id), first);
  assert.deepEqual(await manager.listTasks(), [second]);
  await assert.rejects(manager.getTask(first.id), /not found/);
  await assert.rejects(manager.deleteTask(first.id), /not found/);
  assert.equal((await manager.createTask(user.id, 'Third task')).id, 3);
});

test('task results cannot mutate storage', async () => {
  const manager = new TaskManager();
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  const task = await manager.createTask(user.id, 'Original title');
  task.title = 'Changed';
  const fetched = await manager.getTask(task.id);
  fetched.userId = 999;
  const updated = await manager.updateTask(task.id, { completed: true });
  updated.completed = false;
  const tasks = await manager.listTasks();
  assert.ok(tasks[0]);
  tasks[0].title = 'Changed again';
  tasks.length = 0;
  assert.deepEqual(await manager.getTask(task.id), {
    id: task.id,
    userId: user.id,
    title: 'Original title',
    completed: true,
  });
});

test('each manager has independent storage and ID counters', async () => {
  const first = new TaskManager();
  const second = new TaskManager();
  const user = await first.createUser('Ayman', 'ayman@example.com');
  await first.createTask(user.id, 'First manager task');
  assert.deepEqual(await second.listUsers(), []);
  assert.deepEqual(await second.listTasks(), []);
  assert.equal((await second.createUser('Other', 'other@example.com')).id, 1);
});

test('operations return pending Promises and expose failures as rejections', async () => {
  const manager = new TaskManager();
  let settled = false;
  const creation = manager.createUser('Ayman', 'ayman@example.com').then((user) => {
    settled = true;
    return user;
  });
  assert.ok(creation instanceof Promise);
  await Promise.resolve();
  assert.equal(settled, false);
  await creation;
  assert.equal(settled, true);

  const failure = manager.getTask(999);
  assert.ok(failure instanceof Promise);
  await assert.rejects(failure, /not found/);
});
