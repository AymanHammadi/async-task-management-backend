# Async task management backend

Session 2 assignment. A Node.js console backend written in TypeScript with ESM imports. It continues the task-management exercise from Session 1 with typed interfaces and asynchronous operations.

This project has no HTTP server, database, or authentication. Each `TaskManager` stores its own users and tasks in memory. Data disappears when the process exits.

## Run locally

Requires Node.js 24 or newer and npm.

```bash
npm ci
npm run typecheck
npm test
npm start
```

`npm test` builds the source and tests before running Node's built-in test runner. To build without testing, run `npm run build`.

For development, run `npm run dev`. It runs the TypeScript demo directly and restarts it when source files change. Stop it with Ctrl+C.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch and run `src/index.ts` with tsx |
| `npm run typecheck` | Check source and test types without writing JavaScript |
| `npm run build` | Compile source and tests into `dist/` |
| `npm start` | Run the compiled demo at `dist/src/index.js` |
| `npm test` | Build and run the automated tests |

TypeScript strict mode is enabled. The compiler uses `NodeNext` module resolution, and `package.json` declares `"type": "module"`. Relative source imports use `.js` extensions so the compiled files run in Node without a bundler.

## Files

```text
src/
  types.ts          User, Task, and TaskChanges interfaces
  task-manager.ts   Async operations and in-memory storage
  index.ts          Runnable success and failure examples
test/
  task-manager.test.ts
```

## Data and operations

`User` has `id: number`, `name: string`, and `email: string`.

`Task` has `id: number`, `userId: number`, `title: string`, and `completed: boolean`. New tasks start incomplete and must belong to an existing user.

| Method | Returns |
| --- | --- |
| `createUser(name, email)` | `Promise<User>` |
| `listUsers()` | `Promise<User[]>` |
| `getUser(id)` | `Promise<User>` |
| `createTask(userId, title)` | `Promise<Task>` |
| `listTasks()` | `Promise<Task[]>` |
| `getTask(id)` | `Promise<Task>` |
| `updateTask(id, changes)` | `Promise<Task>` |
| `deleteTask(id)` | `Promise<Task>` |

Names, emails, and task titles must be non-empty strings. The manager trims them and lowercases emails before checking uniqueness. It does not validate email address format.

Task updates accept `title`, `completed`, or both. They cannot change IDs or ownership. Invalid updates leave the stored task unchanged. Returned objects are copies, so changing a result does not change storage.

## Async behavior and errors

Each operation awaits a 25 ms timer to simulate storage latency before reading or changing data. This is an exercise in Promises and `async/await`, not a database implementation. Operations reject with an `Error` for invalid input or missing records; they do not fail randomly.

The demo creates a user, creates tasks concurrently with `Promise.all`, completes a task, and deletes another. It catches an expected lookup failure and an invalid-title failure with `try/catch`. An unexpected error reaches the top-level handler and sets a nonzero exit code.

The tests cover user and task operations, validation, missing records, normalized duplicate emails, ownership, concurrent creation, atomic updates, independent storage, and returned-object isolation.

## Verification

Checked with Node.js 24.21.0 and npm 11.19.0:

- `npm ci` installed dependencies from the lockfile.
- `npm run typecheck` passed.
- `npm test` built the project and passed all 18 tests.
- `npm start` ran the compiled demo, including both expected failures.
- `npm run dev` ran the demo and kept the watcher active until stopped.
- `npm audit` reported zero known vulnerabilities at the time of verification.

## AI use

I used an OpenAI assistant through OpenCode to clarify the requirements and generate the TypeScript implementation and automated tests.

The assistant ran type-checking, all 18 tests, and the demo to verify the implementation. I chose the project scope and reviewed the resulting project.
