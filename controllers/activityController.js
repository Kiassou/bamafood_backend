const db = require('../config/db');

exports.getRecentActivities = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, user, type, severity, description, created_at AS createdAt
      FROM activities
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.json(rows);
  } catch (error) {
    console.error('getRecentActivities error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllActivities = async (req, res) => {
  try {
    const { search = '', type = 'ALL' } = req.query;
    const like = `%${search}%`;

    const query = `
      SELECT id, user, type, severity, description, created_at AS createdAt
      FROM activities
      WHERE (? = 'ALL' OR type = ?)
      AND (
        ? = '' OR
        user LIKE ? OR
        description LIKE ? OR
        type LIKE ?
      )
      ORDER BY created_at DESC
    `;

    const [rows] = await db.query(query, [type, type, search, like, like, like]);
    res.json(rows);
  } catch (error) {
    console.error('getAllActivities error:', error);
    res.status(500).json({ message: error.message });
  }
};