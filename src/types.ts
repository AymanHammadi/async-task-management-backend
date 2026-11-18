export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Task {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

export interface TaskChanges {
  title?: string;
  completed?: boolean;
}
