export const pagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

export const sortExpression = (sort) => {
  const allowed = {
    createdDate: 'createdDate',
    dueDate: 'dueDate',
    priority: 'priorityRank',
    title: 'title',
    fullName: 'fullName',
  };
  const key = allowed[sort] || 'createdDate';
  return { [key]: sort === `-${sort}` ? -1 : 1 };
};

import { todayDateOnly } from './dates.js';

export const isOverdue = (task, today = todayDateOnly()) =>
  task.dueDate < today && !['Completed', 'Cancelled'].includes(task.status);
