import { setTimeout as delay } from 'node:timers/promises';
import type { Task, TaskChanges, User } from './types.js';

const STORAGE_DELAY_MS = 25;

function normalizeText(value: string, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

export class TaskManager {
  private readonly users = new Map<number, User>();
  private readonly tasks = new Map<number, Task>();
  private nextUserId = 1;
  private nextTaskId = 1;

  async createUser(name: string, email: string): Promise<User> {
    await delay(STORAGE_DELAY_MS);
    const normalizedName = normalizeText(name, 'User name');
    const normalizedEmail = normalizeText(email, 'User email').toLowerCase();

    if ([...this.users.values()].some((user) => user.email === normalizedEmail)) {
      throw new Error('A user with this email already exists.');
    }

    const user: User = {
      id: this.nextUserId++,
      name: normalizedName,
      email: normalizedEmail,
    };
    this.users.set(user.id, user);
    return { ...user };
  }

  async listUsers(): Promise<User[]> {
    await delay(STORAGE_DELAY_MS);
    return [...this.users.values()].map((user) => ({ ...user }));
  }

  async getUser(id: number): Promise<User> {
    await delay(STORAGE_DELAY_MS);
    const user = this.users.get(id);

    if (!user) {
      throw new Error(`User with ID ${id} not found.`);
    }

    return { ...user };
  }

  async createTask(userId: number, title: string): Promise<Task> {
    await delay(STORAGE_DELAY_MS);

    if (!this.users.has(userId)) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const normalizedTitle = normalizeText(title, 'Task title');
    const task: Task = {
      id: this.nextTaskId++,
      userId,
      title: normalizedTitle,
      completed: false,
    };
    this.tasks.set(task.id, task);
    return { ...task };
  }

  async listTasks(): Promise<Task[]> {
    await delay(STORAGE_DELAY_MS);
    return [...this.tasks.values()].map((task) => ({ ...task }));
  }

  async getTask(id: number): Promise<Task> {
    await delay(STORAGE_DELAY_MS);
    return { ...this.findTask(id) };
  }

  async updateTask(id: number, changes: TaskChanges): Promise<Task> {
    await delay(STORAGE_DELAY_MS);
    const task = this.findTask(id);

    if (changes === null || typeof changes !== 'object' || Array.isArray(changes)) {
      throw new Error('Task changes must be an object.');
    }

    const fields = Object.keys(changes);

    if (fields.length === 0 || fields.some((field) => !['title', 'completed'].includes(field))) {
      throw new Error('Provide title, completed, or both to update a task.');
    }

    const updatedTask: Task = { ...task };

    if ('title' in changes) {
      updatedTask.title = normalizeText(changes.title, 'Task title');
    }

    if ('completed' in changes) {
      if (typeof changes.completed !== 'boolean') {
        throw new Error('Task completed must be a boolean.');
      }

      updatedTask.completed = changes.completed;
    }

    this.tasks.set(id, updatedTask);
    return { ...updatedTask };
  }

  async deleteTask(id: number): Promise<Task> {
    await delay(STORAGE_DELAY_MS);
    const task = this.findTask(id);
    this.tasks.delete(id);
    return { ...task };
  }

  private findTask(id: number): Task {
    const task = this.tasks.get(id);

    if (!task) {
      throw new Error(`Task with ID ${id} not found.`);
    }

    return task;
  }
}
