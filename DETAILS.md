## 📝 Guidelines

### 🔹 Commits
- Include the **ticket name** in the commit message or in the branch you created
- Add a short description of what you did
- It doesn’t have to be very detailed unless it’s something **groundbreaking**

---

### 🔹 Merging to `main`
- Not 100% sure yet — will confirm
- Most likely: The person who did created the PR


### 🔹 Naming conventions (Methods ,variables, classes)
- For Methods - camelCase
- For Variables - camelCase
- For Classes - PascalCase
- For db tables - snake_case

## API: Task deletion

DELETE /tasks/:id

- Authentication: required (session)
- Authorization: only the task owner can delete their task (requestedByUserId === session.userId)
- Allowed statuses for deletion: OPEN, CANCELLED
- Blocking statuses (will return 409): MATCHED, IN_PROGRESS, COMPLETED, REJECTED
- Behavior:
    - All PENDING offers for the task are updated to REJECTED inside a single database transaction together with the task deletion (atomic rollback on error).
    - Volunteers who had PENDING offers on the deleted task receive a TASK_UPDATED notification (created after the DB transaction).
    - Responses:
        - 204 No Content — deletion succeeded
        - 401 Unauthorized — missing/invalid session
        - 403 Forbidden — authenticated user is not the owner
        - 404 Not Found — task does not exist
        - 409 Conflict — task status prevents deletion
