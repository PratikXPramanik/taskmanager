const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../db/database');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard - summary stats for current user
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const projectCount = db.prepare(`
      SELECT COUNT(*) AS count FROM project_members WHERE user_id = ?
    `).get(req.user.id).count ?? 0;

    const rawStats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN t.due_date IS NOT NULL AND t.due_date < ? AND t.status != 'done' THEN 1 ELSE 0 END) AS overdue
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id
      WHERE pm.user_id = ?
    `).get(today, req.user.id);

    // SQLite SUM returns null if no rows — normalize to 0
    const taskStats = {
      total:       rawStats.total       ?? 0,
      todo:        rawStats.todo        ?? 0,
      in_progress: rawStats.in_progress ?? 0,
      done:        rawStats.done        ?? 0,
      overdue:     rawStats.overdue     ?? 0,
    };

    // SQLite doesn't support NULLS LAST — use CASE workaround
    const myTasks = db.prepare(`
      SELECT t.*, p.name AS project_name, u.name AS assignee_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.assignee_id = ? AND t.status != 'done'
      ORDER BY
        CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
        t.due_date ASC,
        CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
      LIMIT 10
    `).all(req.user.id);

    const recentTasks = db.prepare(`
      SELECT DISTINCT t.*, p.name AS project_name, u.name AS assignee_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN project_members pm ON t.project_id = pm.project_id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE pm.user_id = ?
      ORDER BY t.updated_at DESC
      LIMIT 5
    `).all(req.user.id);

    res.json({ projectCount, taskStats, myTasks, recentTasks });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
