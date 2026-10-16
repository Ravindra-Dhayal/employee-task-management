import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Something went wrong on the server';
  let details = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Invalid data';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Invalid data';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = err.path === '_id' ? 404 : 400;
    message =
      err.path === '_id' ? 'Resource not found' : `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate value: ${field} already exists`;
    details = [{ field, message }];
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body';
  }

  if (statusCode === 500) {
    console.error(err);
  }

  const body = { success: false, message };
  if (details) body.details = details;
  if (env.nodeEnv === 'development' && statusCode === 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};