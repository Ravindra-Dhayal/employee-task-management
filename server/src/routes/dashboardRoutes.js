import express from 'express';
import { Employee } from '../models/Employee.js';
import { Task } from '../models/Task.js';
import { todayDateOnly } from '../utils/dates.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [employeeCounts, taskCounts, workload] = await Promise.all([
      Employee.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: {
        _id: null,
        total: { $sum: 1 },
        todo: { $sum: { $cond: [{ $eq: ['$status', 'Todo'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $and: [{ $lt: ['$dueDate', todayDateOnly()] }, { $not: [{ $in: ['$status', ['Completed', 'Cancelled']] }] }] }, 1, 0] } },
      } }]),
      Task.aggregate([
        { $match: { status: { $in: ['Todo', 'In Progress'] } } },
        { $group: { _id: '$assignedEmployee', activeTasks: { $sum: 1 } } },
        { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
        { $unwind: '$employee' },
        { $project: { _id: 0, employeeId: '$employee._id', fullName: '$employee.fullName', activeTasks: 1 } },
        { $sort: { activeTasks: -1, fullName: 1 } },
      ]),
    ]);
    const count = (status) => employeeCounts.find((item) => item._id === status)?.count || 0;
    const taskSummary = taskCounts[0] || { total: 0, todo: 0, inProgress: 0, completed: 0, cancelled: 0, overdue: 0 };
    res.json({ success: true, data: {
      employees: { total: employeeCounts.reduce((sum, item) => sum + item.count, 0), active: count('Active'), inactive: count('Inactive'), onLeave: count('On Leave') },
      tasks: taskSummary,
      workload,
    } });
  } catch (error) { next(error); }
});

export default router;
