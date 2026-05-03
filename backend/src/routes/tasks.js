const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, query, validationResult } = require('express-validator');
const { authenticate, requireProjectRole } = require('../middleware/auth');
const { getDb } = require('../db/database');

const router = express.Router({ mergeParams: true });
router.use(authenticate);
router.use(requireProjectRole(['admin', 'member']));

// GET /api/projects/:projectId/tasks
router.get('/', [
  query('status').optional().isIn(['todo', 'in_progress', 'done']),
  query('priority').optional().isIn(['low', 'medium', 'high']),
  query('assignee_id').optional(),
], (req, res) => {
  const db = getDb();
  let sql = `
    SELECT t.*,
      u1.name AS assignee_name, u1.email AS assignee_email,
      u2.name AS created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    JOIN users u2 ON t.created_by = u2.id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (req.query.status) { sql += ' AND t.status = ?'; params.push(req.query.status); }
  if (req.query.priority) { sql += ' AND t.priority = ?'; params.push(req.query.priority); }
  if (req.query.assignee_id) { sql += ' AND t.assignee_id = ?'; params.push(req.query.assignee_id); }

  sql += ' ORDER BY t.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/projects/:projectId/tasks
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601(),
  body('assignee_id').optional(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { title, description, status = 'todo', priority = 'medium', due_date, assignee_id } = req.body;

  // Validate assignee is project member
  if (assignee_id) {
    const isMember = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, due_date, project_id, assignee_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description || null, status, priority, due_date || null, req.params.projectId, assignee_id || null, req.user.id);

  const task = db.prepare(`
    SELECT t.*, u1.name AS assignee_name, u2.name AS created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    JOIN users u2 ON t.created_by = u2.id
    WHERE t.id = ?
  `).get(id);
  res.status(201).json(task);
});

// GET /api/projects/:projectId/tasks/:taskId
router.get('/:taskId', (req, res) => {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*, u1.name AS assignee_name, u1.email AS assignee_email, u2.name AS created_by_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    JOIN users u2 ON t.created_by = u2.id
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', [
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601(),
  body('assignee_id').optional(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update their own tasks unless admin
  if (req.projectRole === 'member' && task.created_by !== req.user.id && task.assignee_id !== req.user.id) {
    return res.status(403).json({ error: 'Can only update tasks you created or are assigned to' });
  }

  const { title, description, status, priority, due_date, assignee_id } = req.body;

  if (assignee_id) {
    const isMember = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      due_date = COALESCE(?, due_date),
      assignee_id = CASE WHEN ? IS NOT NULL THEN ? ELSE assignee_id END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title || null, description || null, status || null, priority || null, due_date || null, assignee_id || null, assignee_id || null, req.params.taskId);

  const updated = db.prepare(`
    SELECT t.*, u1.name AS assignee_name, u2.name AS created_by_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id
    JOIN users u2 ON t.created_by = u2.id WHERE t.id = ?
  `).get(req.params.taskId);
  res.json(updated);
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.projectRole === 'member' && task.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Only admins or task creator can delete tasks' });
  }
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
