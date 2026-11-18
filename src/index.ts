import { TaskManager } from './task-manager.js';

async function main(): Promise<void> {
  const manager = new TaskManager();
  const user = await manager.createUser('Ayman', 'ayman@example.com');
  console.log('Created user:', user);

  const tasks = await Promise.all([
    manager.createTask(user.id, 'Define Task and User interfaces'),
    manager.createTask(user.id, 'Practice async/await'),
  ]);
  console.log('Created tasks:', tasks);

  const completedTask = await manager.updateTask(tasks[0].id, { completed: true });
  console.log('Completed task:', completedTask);
  console.log('Users:', await manager.listUsers());
  console.log('Owner:', await manager.getUser(user.id));
  console.log('Tasks:', await manager.listTasks());

  const deletedTask = await manager.deleteTask(tasks[1].id);
  console.log('Deleted task:', deletedTask);

  try {
    await manager.getTask(deletedTask.id);
  } catch (error: unknown) {
    if (!(error instanceof Error)) {
      throw error;
    }

    console.log('Expected failure:', error.message);
  }

  try {
    await manager.createTask(user.id, '   ');
  } catch (error: unknown) {
    if (!(error instanceof Error)) {
      throw error;
    }

    console.log('Expected validation failure:', error.message);
  }
}

main().catch((error: unknown) => {
  console.error('Demo failed:', error);
  process.exitCode = 1;
});
