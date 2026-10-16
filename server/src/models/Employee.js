import mongoose from 'mongoose';
import {
  DEPARTMENTS,
  EMPLOYEE_STATUS,
  EMPLOYEE_STATUS_LIST,
} from '../utils/constants.js';
import { toDateOnly } from '../utils/dates.js';

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z0-9-]{3,20}$/,
        'Employee ID must be 3-20 characters (letters, numbers, hyphen)',
      ],
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      set: (value) => String(value || '').trim().replace(/\s+/g, ' '),
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Phone must be 10-15 digits (optional leading +)'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: {
        values: DEPARTMENTS,
        message: `Department must be one of: ${DEPARTMENTS.join(', ')}`,
      },
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      maxlength: [100, 'Role cannot exceed 100 characters'],
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
      set: toDateOnly,
    },
    status: {
      type: String,
      enum: {
        values: EMPLOYEE_STATUS_LIST,
        message: `Status must be one of: ${EMPLOYEE_STATUS_LIST.join(', ')}`,
      },
      default: EMPLOYEE_STATUS.ACTIVE,
    },
    activeTaskCount: { type: Number, default: 0, min: 0, max: 3 },
    skills: {
      type: [String],
      default: [],
      // trim, drop empties, remove duplicates (case-insensitive)
      set: (arr) => {
        if (!Array.isArray(arr)) return [];
        const seen = new Set();
        return arr
          .map((s) => String(s).trim())
          .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
      },
    },
    leaveStart: { type: Date, set: toDateOnly },
    leaveEnd: { type: Date, set: toDateOnly },
  },
  { timestamps: true, versionKey: false }
);

// Leave rules: required only when On Leave, end >= start, cleared otherwise.
employeeSchema.pre('validate', function () {
  if (this.status === EMPLOYEE_STATUS.ON_LEAVE) {
    if (!this.leaveStart) {
      this.invalidate('leaveStart', 'Leave start date is required when status is On Leave');
    }
    if (!this.leaveEnd) {
      this.invalidate('leaveEnd', 'Leave end date is required when status is On Leave');
    }
    if (this.leaveStart && this.leaveEnd && this.leaveEnd < this.leaveStart) {
      this.invalidate('leaveEnd', 'Leave end date cannot be earlier than leave start date');
    }
  } else {
    this.leaveStart = undefined;
    this.leaveEnd = undefined;
  }
});

// Indexes for server-side filtering and sorting (unique ones come from `unique: true`)
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ fullName: 1 });

export const Employee = mongoose.model('Employee', employeeSchema);