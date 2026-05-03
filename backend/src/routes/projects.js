const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { authenticate, requireProjectRole } = require('../middleware/auth');
const { getDb } = require('../db/database');

const router = express.Router();
router.use(authenticate);

// GET /api/projects - list projects for current user
router.get('/', (req, res) => {
  const db = getDb();
  const projects = db.prepare(`
    SELECT p.*, pm.role, u.name AS owner_name,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS task_count,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    JOIN users u ON p.owner_id = u.id
    WHERE pm.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json(projects);
});

// POST /api/projects - create project
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('description').optional().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const db = getDb();
  const id = uuidv4();

  const insertProject = db.transaction(() => {
    db.prepare('INSERT INTO projects (id, name, description, owner_id) VALUES (?, ?, ?, ?)').run(id, name, description || null, req.user.id);
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(id, req.user.id, 'admin');
  });
  insertProject();

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

// GET /api/projects/:projectId
router.get('/:projectId', requireProjectRole(['admin', 'member']), (req, res) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*, pm.role, u.name AS owner_name
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ? AND pm.user_id = ?
  `).get(req.params.projectId, req.user.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, pm.role, pm.joined_at
    FROM users u JOIN project_members pm ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(req.params.projectId);

  res.json({ ...project, members });
});

// PUT /api/projects/:projectId - update (admin only)
router.put('/:projectId', requireProjectRole(['admin']), [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { name, description } = req.body;
  const current = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?').run(
    name || current.name, description ?? current.description, req.params.projectId
  );
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId));
});

// DELETE /api/projects/:projectId (admin only)
router.delete('/:projectId', requireProjectRole(['admin']), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can delete project' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:projectId/members - add member (admin only)
router.post('/:projectId/members', requireProjectRole(['admin']), [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { email, role = 'member' } = req.body;
  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, user.id);
  if (existing) return res.status(409).json({ error: 'User already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.projectId, user.id, role);
  res.status(201).json({ ...user, role });
});

// PUT /api/projects/:projectId/members/:userId/role (admin only)
router.put('/:projectId/members/:userId/role', requireProjectRole(['admin']), [
  body('role').isIn(['admin', 'member']),
], (req, res) => {
  const db = getDb();
  const { role } = req.body;
  db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?').run(role, req.params.projectId, req.params.userId);
  res.json({ message: 'Role updated' });
});

// DELETE /api/projects/:projectId/members/:userId (admin only)
router.delete('/:projectId/members/:userId', requireProjectRole(['admin']), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id === req.params.userId) return res.status(400).json({ error: 'Cannot remove project owner' });
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.projectId, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
