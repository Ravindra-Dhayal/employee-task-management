import mongoose from 'mongoose';
import { DEPARTMENTS, PRIORITIES, TASK_STATUSES } from '../utils/constants.js';
import { toDateOnly } from '../utils/dates.js';

const priorityRank = { Low: 1, Medium: 2, High: 3, Critical: 4 };

const taskSchema = new mongoose.Schema(
  {
    taskId: { type: String, unique: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    department: { type: String, required: true, enum: DEPARTMENTS },
    priority: { type: String, required: true, enum: PRIORITIES },
    priorityRank: { type: Number, select: false },
    status: { type: String, required: true, enum: TASK_STATUSES, default: 'Todo' },
    startDate: { type: Date, required: true, set: toDateOnly },
    dueDate: { type: Date, required: true, set: toDateOnly },
    createdDate: { type: Date, default: Date.now },
    completedDate: { type: Date, default: null },
    employeeSnapshot: {
      employeeId: String,
      fullName: String,
      department: String,
      email: String,
    },
  },
  { timestamps: true, versionKey: false }
);

taskSchema.pre('validate', function () {
  if (!this.taskId && this._id) this.taskId = `TSK-${this._id.toString().slice(-6).toUpperCase()}`;
  if (this.priority) this.priorityRank = priorityRank[this.priority];
  if (this.startDate && this.dueDate && this.dueDate < this.startDate) {
    this.invalidate('dueDate', 'Due date cannot be earlier than start date');
  }
});

taskSchema.index({ status: 1, assignedEmployee: 1 });
taskSchema.index({ dueDate: 1 });

export const Task = mongoose.model('Task', taskSchema);
