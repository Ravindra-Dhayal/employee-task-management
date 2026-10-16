import express from 'express';
import { Task } from '../models/Task.js';
import { Employee } from '../models/Employee.js';
import { isOverdue } from '../utils/query.js';
import { todayDateOnly } from '../utils/dates.js';

const router = express.Router();
const csv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

router.get('/tasks.csv', async (req, res, next) => {
  try {
    const filter = {};
    for (const key of ['department', 'priority', 'status']) if (req.query[key]) filter[key] = req.query[key];
    if (req.query.dueFrom || req.query.dueTo) {
      filter.dueDate = {};
      if (req.query.dueFrom) filter.dueDate.$gte = new Date(req.query.dueFrom);
      if (req.query.dueTo) filter.dueDate.$lte = new Date(req.query.dueTo);
    }
    if (req.query.overdue === 'true') {
      filter.dueDate = { ...(filter.dueDate || {}), $lt: todayDateOnly() };
      filter.status = { $nin: ['Completed', 'Cancelled'] };
    }
    if (req.query.search) {
      const employees = await Employee.find({ fullName: new RegExp(req.query.search.trim(), 'i') }).select('_id');
      filter.$or = [{ title: new RegExp(req.query.search.trim(), 'i') }, { assignedEmployee: { $in: employees.map((employee) => employee._id) } }];
    }
    const tasks = await Task.find(filter).populate('assignedEmployee', 'employeeId fullName department').sort({ createdDate: -1 }).lean();
    const lines = [['Task ID', 'Title', 'Employee', 'Department', 'Priority', 'Status', 'Start Date', 'Due Date', 'Overdue'].map(csv).join(',')];
    tasks.forEach((task) => lines.push([task.taskId || task._id, task.title, task.assignedEmployee?.fullName || `${task.employeeSnapshot?.fullName || '(deleted)'} (${task.employeeSnapshot?.employeeId || 'unknown'})`, task.assignedEmployee?.department || task.employeeSnapshot?.department || task.department, task.priority, task.status, task.startDate?.toISOString().slice(0, 10), task.dueDate?.toISOString().slice(0, 10), isOverdue(task) ? 'Yes' : 'No'].map(csv).join(',')));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');
    res.send(lines.join('\n'));
  } catch (error) { next(error); }
});

export default router;
