const db = require('../config/db');

exports.logActivity = async ({
  userId = null,
  user,
  type,
  severity = 'low',
  description
}) => {
  const query = `
    INSERT INTO activities (user_id, user, type, severity, description)
    VALUES (?, ?, ?, ?, ?)
  `;

  await db.query(query, [userId, user, type, severity, description]);
};