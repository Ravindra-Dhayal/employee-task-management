import express from 'express';
import mongoose from 'mongoose';
import { Employee } from '../models/Employee.js';
import { Task } from '../models/Task.js';
import { AppError } from '../utils/AppError.js';
import { pagination } from '../utils/query.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const search = req.query.search.trim();
      filter.$or = [{ fullName: new RegExp(search, 'i') }, { employeeId: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    }
    const [items, total] = await Promise.all([
      Employee.find(filter).sort({ fullName: 1 }).skip(skip).limit(limit).lean(),
      Employee.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Employee not found', 404);
    const employee = await Employee.findById(req.params.id);
    if (!employee) throw new AppError('Employee not found', 404);
    res.json({ success: true, data: employee });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) throw new AppError('Employee not found', 404);
    Object.assign(employee, req.body);
    await employee.save();
    res.json({ success: true, data: employee });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const active = await Task.exists({ assignedEmployee: req.params.id, status: { $in: ['Todo', 'In Progress'] } });
    if (active) throw new AppError('Employee cannot be deleted while they have active tasks', 409);
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) throw new AppError('Employee not found', 404);
    res.json({ success: true, data: employee });
  } catch (error) { next(error); }
});

export default router;
