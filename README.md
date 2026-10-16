# Employee & Task Management System

MERN application for managing employees, assigning tasks, and monitoring delivery.

## Setup

### Backend

```powershell
cd server
Copy-Item .env.example .env
npm install
npm run dev
```

Run MongoDB first. Configure `MONGO_URI`, `PORT`, `NODE_ENV`, `CLIENT_URL`, and comma-separated `ALLOWED_ORIGINS` in `server/.env`.

### Frontend

```powershell
cd client
npm install
npm run dev
```

The frontend uses `VITE_API_URL` from `client/.env`, defaulting to `http://localhost:5000/api`.

## Schema

Employee fields: `employeeId` (unique), `fullName`, `email` (unique, trimmed/lowercased), `phone`, `department`, `role`, `joiningDate`, `status`, `skills`, `leaveStart`, `leaveEnd`, and the server-maintained `activeTaskCount`.

Task fields: `taskId`, `title`, `description`, `assignedEmployee` (Employee ObjectId), `department`, `priority`, `priorityRank`, `status`, `startDate`, `dueDate`, `createdDate`, `completedDate`, and `employeeSnapshot`.

`assignedEmployee` is populated while the employee exists. The snapshot stores employee ID, name, department, and email so historical tasks remain meaningful after employee deletion.

When an assignee is selected in the task form, the task department is automatically set to that employee's current department. The department field remains editable for the task's business classification. Task department filters query the task's stored `department` field, not the populated employee department.

## API overview

- `GET|POST /api/employees`
- `GET|PUT|DELETE /api/employees/:id`
- `GET|POST /api/tasks`
- `GET|PUT|DELETE /api/tasks/:id`
- `PUT /api/tasks/:id/status`
- `GET /api/dashboard`
- `GET /api/export/tasks.csv`

Employee and task lists support server-side `page`, `limit`, search, filters, and sorting. List responses include `total`, `page`, and `totalPages`.

## Business rules and required answers

1. **Where are status transitions validated and why?** `PUT /api/tasks/:id/status` validates the transition map in `server/src/routes/taskRoutes.js`. The backend is authoritative because a browser can be bypassed or send arbitrary HTTP requests.
2. **Why does completedDate come from the backend?** The server sets it at the moment a task transitions to Completed, preventing clients from spoofing the completion timestamp.
3. **How are inactive/on-leave assignments blocked?** The task assignment validator checks the employee status and compares the task start date inclusively against leave dates before reserving capacity.
4. **Why are filtering and pagination on the backend?** MongoDB performs filtering, sorting, counting, and pagination, avoiding large client downloads and producing accurate totals.
5. **Why do filters live in the URL?** URL state makes filtered views refreshable, shareable, bookmarkable, and compatible with browser back/forward navigation.
6. **What can happen when two requests assign a fourth task simultaneously?** A read-then-write count can allow both requests through. The implementation uses an atomic conditional `$inc` on `Employee.activeTaskCount` where the count must be below three, so only one request can reserve the final slot on a single database.

## Rules enforced by the backend

- Only Active employees can receive tasks.
- On Leave employees are rejected only when the task start date falls inside the inclusive leave period.
- Every new task starts as Todo; status and completedDate are server-controlled.
- Due date cannot precede start date.
- Valid transitions are Todo → In Progress → Completed, with cancellation from Todo or In Progress.
- Completed and Cancelled tasks cannot be edited.
- Each employee has at most three active tasks. Capacity is atomically reserved and released when tasks complete, cancel, reassign, or delete.
- Employees with active tasks cannot be deleted.
- Deleted employees remain represented through task snapshots.
- Overdue means the UTC date today is later than dueDate and the task is not Completed or Cancelled. Due today is not overdue.

## Assumptions

- Date fields are date-only values normalized to UTC midnight; overdue comparisons use the UTC calendar date.
- Authentication is outside the assignment scope.
- `activeTaskCount` is maintained by task lifecycle operations. Existing databases created before this field was added should be migrated/reconciled once before production use.
- A single MongoDB deployment is assumed for the atomic capacity reservation. Multi-process deployments still rely on MongoDB atomicity, while the small in-process queue only reduces duplicate local work.
