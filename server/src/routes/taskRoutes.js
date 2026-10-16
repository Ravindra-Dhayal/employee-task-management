import express from 'express';
import mongoose from 'mongoose';
import { Employee } from '../models/Employee.js';
import { Task } from '../models/Task.js';
import { AppError } from '../utils/AppError.js';
import { pagination, isOverdue } from '../utils/query.js';
import { todayDateOnly } from '../utils/dates.js';

const router = express.Router();
const activeStatuses = ['Todo', 'In Progress'];
const assignmentQueues = new Map();

const withEmployeeLock = async (employeeId, work) => {
  const previous = assignmentQueues.get(String(employeeId)) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  assignmentQueues.set(String(employeeId), current);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (assignmentQueues.get(String(employeeId)) === current) assignmentQueues.delete(String(employeeId));
  }
};
const reconcileActiveTaskCount = async (employeeId) => {
  const activeTaskCount = await Task.countDocuments({ assignedEmployee: employeeId, status: { $in: activeStatuses } });
  await Employee.updateOne({ _id: employeeId }, { $set: { activeTaskCount } });
  return activeTaskCount;
};
const reserveCapacity = async (employeeId) => {
  await reconcileActiveTaskCount(employeeId);
  const employee = await Employee.findOneAndUpdate(
    { _id: employeeId, status: 'Active', activeTaskCount: { $lt: 3 } },
    { $inc: { activeTaskCount: 1 } },
    { new: true }
  );
  if (!employee) throw new AppError('Employee is unavailable or already has 3 active tasks', 400);
  return employee;
};
const releaseCapacity = async (employeeId) => {
  await Employee.updateOne({ _id: employeeId, activeTaskCount: { $gt: 0 } }, { $inc: { activeTaskCount: -1 } });
};
const taskFilter = (query) => {
  const filter = {};
  if (query.department) filter.department = query.department;
  if (query.priority) filter.priority = query.priority;
  if (query.status) filter.status = query.status;
  if (query.overdue === 'true') {
    filter.dueDate = { ...(filter.dueDate || {}), $lt: todayDateOnly() };
    filter.status = { $nin: ['Completed', 'Cancelled'] };
  }
  if (query.dueFrom || query.dueTo) {
    filter.dueDate = { ...(filter.dueDate || {}) };
    if (query.dueFrom) filter.dueDate.$gte = new Date(query.dueFrom);
    if (query.dueTo) filter.dueDate.$lte = new Date(query.dueTo);
  }
  return filter;
};

const withEmployeeSearch = async (filter, search) => {
  if (!search) return filter;
  const employees = await Employee.find({ fullName: new RegExp(search.trim(), 'i') }).select('_id');
  filter.$or = [{ title: new RegExp(search.trim(), 'i') }, { assignedEmployee: { $in: employees.map((e) => e._id) } }];
  return filter;
};

const validateAssignment = async (employeeId, startDate, excludeTaskId = null) => {
  if (Number.isNaN(startDate.getTime())) throw new AppError('A valid task start date is required', 400);
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new AppError('Assigned employee not found', 404);
  if (employee.status === 'Inactive') throw new AppError('Inactive employees cannot be assigned tasks', 400);
  if (employee.status === 'On Leave' && startDate >= employee.leaveStart && startDate <= employee.leaveEnd) {
    throw new AppError('On Leave employees cannot be assigned a task starting during their leave', 400);
  }
  return employee;
};

router.get('/', async (req, res, next) => {
  try {
    let filter = taskFilter(req.query);
    filter = await withEmployeeSearch(filter, req.query.search);
    const { page, limit, skip } = pagination(req.query);
    const direction = req.query.sort ? (req.query.sort.startsWith('-') ? -1 : 1) : -1;
    const sortKey = (req.query.sort || 'createdDate').replace(/^-/, '');
    const sort = ['createdDate', 'dueDate', 'title'].includes(sortKey)
      ? { [sortKey]: direction }
      : sortKey === 'priority'
        ? { priorityRank: direction, createdDate: -1 }
        : { createdDate: -1 };
    const query = Task.find(filter).populate('assignedEmployee', 'employeeId fullName email department').sort(sort).skip(skip).limit(limit);
    const [items, total] = await Promise.all([query.lean(), Task.countDocuments(filter)]);
    res.json({ success: true, data: items.map((item) => ({ ...item, overdue: isOverdue(item), employeeDisplay: item.assignedEmployee || { ...item.employeeSnapshot, deleted: true } })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Task not found', 404);
    const task = await Task.findById(req.params.id).populate('assignedEmployee', 'employeeId fullName email department');
    if (!task) throw new AppError('Task not found', 404);
    res.json({ success: true, data: { ...task.toObject(), overdue: isOverdue(task), employeeDisplay: task.assignedEmployee || { ...task.employeeSnapshot, deleted: true } } });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { assignedEmployee, startDate } = req.body;
    if (req.body.status !== undefined || req.body.completedDate !== undefined || req.body.taskId !== undefined) {
      throw new AppError('Status, completedDate, and taskId are managed by the server', 400);
    }
    const task = await withEmployeeLock(assignedEmployee, async () => {
      const employee = await validateAssignment(assignedEmployee, new Date(startDate));
      const reserved = await reserveCapacity(assignedEmployee);
      try {
        return await Task.create({ ...req.body, status: 'Todo', department: req.body.department || employee.department, employeeSnapshot: { employeeId: reserved.employeeId, fullName: reserved.fullName, department: reserved.department, email: reserved.email } });
      } catch (error) {
        await releaseCapacity(assignedEmployee);
        throw error;
      }
    });
    res.status(201).json({ success: true, data: task });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Task not found', 404);
    const task = await Task.findById(req.params.id);
    if (!task) throw new AppError('Task not found', 404);
    if (['Completed', 'Cancelled'].includes(task.status)) throw new AppError('Completed and Cancelled tasks cannot be edited', 400);
    if (req.body.completedDate !== undefined || req.body.taskId !== undefined || req.body.status !== undefined) {
      throw new AppError('Status, completedDate, and taskId can only be changed by the server', 400);
    }
    const effectiveEmployeeId = req.body.assignedEmployee || task.assignedEmployee;
    const employee = await validateAssignment(effectiveEmployeeId, new Date(req.body.startDate || task.startDate), task._id);
    if (String(effectiveEmployeeId) !== String(task.assignedEmployee)) {
      const previousEmployeeId = task.assignedEmployee;
      await withEmployeeLock(effectiveEmployeeId, async () => {
        await reserveCapacity(effectiveEmployeeId);
        try {
          req.body.employeeSnapshot = { employeeId: employee.employeeId, fullName: employee.fullName, department: employee.department, email: employee.email };
          req.body.department = req.body.department || employee.department;
          Object.assign(task, req.body);
          await task.save();
          await releaseCapacity(previousEmployeeId);
        } catch (error) {
          await releaseCapacity(effectiveEmployeeId);
          throw error;
        }
      });
      res.json({ success: true, data: task });
      return;
    }
    Object.assign(task, req.body);
    await task.save();
    res.json({ success: true, data: task });
  } catch (error) { next(error); }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Task not found', 404);
    const task = await Task.findById(req.params.id);
    if (!task) throw new AppError('Task not found', 404);
    const valid = { Todo: ['In Progress', 'Cancelled'], 'In Progress': ['Completed', 'Cancelled'], Completed: [], Cancelled: [] };
    if (!valid[task.status]?.includes(req.body.status)) throw new AppError(`Invalid status transition from ${task.status} to ${req.body.status}`, 400);
    if (!['Todo', 'In Progress', 'Completed', 'Cancelled'].includes(req.body.status)) throw new AppError('Invalid status', 400);
    const previousStatus = task.status;
    task.status = req.body.status;
    task.completedDate = req.body.status === 'Completed' ? new Date() : null;
    await task.save();
    if (activeStatuses.includes(previousStatus) && !activeStatuses.includes(task.status)) {
      await releaseCapacity(task.assignedEmployee);
    }
    res.json({ success: true, data: task });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Task not found', 404);
    const task = await Task.findById(req.params.id);
    if (!task) throw new AppError('Task not found', 404);
    if (activeStatuses.includes(task.status)) await releaseCapacity(task.assignedEmployee);
    await task.deleteOne();
    res.json({ success: true, data: task });
  } catch (error) { next(error); }
});

export default router;
