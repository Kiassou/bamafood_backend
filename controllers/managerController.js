const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

exports.getDashboardData = async (req, res) => {
    try {
        const statsQuery = `
            SELECT
                COALESCE((
                    SELECT SUM(total_price)
                    FROM orders
                    WHERE status = 'livree'
                    AND DATE(updated_at) = CURDATE()
                ), 0) AS revenue,
                (
                    SELECT COUNT(*)
                    FROM orders
                    WHERE status IN ('en_attente', 'preparation')
                ) AS pendingCount,
                (
                    SELECT COUNT(*)
                    FROM dishes
                    WHERE is_active = 1
                ) AS totalDishes
        `;

        const ordersQuery = `
            SELECT o.id, u.username as clientName, o.created_at as createdAt,
                   GROUP_CONCAT(d.name SEPARATOR ', ') as dishNames
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN dishes d ON oi.dish_id = d.id
            WHERE o.status IN ('en_attente', 'preparation')
            GROUP BY o.id
            ORDER BY o.created_at ASC
            LIMIT 5
        `;

        const activitiesQuery = `
            SELECT type, description, created_at as createdAt 
            FROM activity_logs 
            ORDER BY created_at DESC LIMIT 5
        `;

        const [stats] = await db.query(statsQuery);
        const [orders] = await db.query(ordersQuery);
        const [activities] = await db.query(activitiesQuery);

        return res.json({
            revenue: stats[0]?.revenue || 0,
            pendingCount: stats[0]?.pendingCount || 0,
            totalDishes: stats[0]?.totalDishes || 0,
            priorityOrders: orders,
            recentActivities: activities
        });
    } catch (error) {
        console.error('Erreur dashboard-data:', error);
        return res.status(500).json({
            message: "Erreur serveur",
            error: error.message
        });
    }
};

exports.getRecentRevenueOrders = async (req, res) => {
  try {
    const query = `
      SELECT 
        o.id,
        u.username AS clientName,
        o.total_price AS totalPrice,
        o.status,
        o.created_at AS createdAt
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.status = 'livree'
      ORDER BY o.updated_at DESC
      LIMIT 5
    `;

    const [rows] = await db.query(query);
    return res.json(rows);
  } catch (error) {
    console.error('Erreur dashboard-revenue-orders:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getRecentPendingOrders = async (req, res) => {
  try {
    const query = `
      SELECT 
        o.id,
        u.username AS clientName,
        o.total_price AS totalPrice,
        o.status,
        o.created_at AS createdAt
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.status IN ('en_attente', 'preparation')
      ORDER BY o.created_at DESC
      LIMIT 5
    `;

    const [rows] = await db.query(query);
    return res.json(rows);
  } catch (error) {
    console.error('Erreur dashboard-pending-orders:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getRecentDishes = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        price,
        is_active AS isActive,
        created_at AS createdAt
      FROM dishes
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const [rows] = await db.query(query);
    return res.json(rows);
  } catch (error) {
    console.error('Erreur dashboard-recent-dishes:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getRevenueSummary = async (req, res) => {
  try {
    const query = `
      SELECT
        COALESCE(SUM(CASE 
          WHEN status = 'livree' AND DATE(updated_at) = CURDATE() 
          THEN total_price ELSE 0 END), 0) AS dayRevenue,
        COALESCE(SUM(CASE 
          WHEN status = 'livree' AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
          THEN total_price ELSE 0 END), 0) AS weekRevenue,
        COALESCE(SUM(CASE 
          WHEN status = 'livree' AND YEAR(updated_at) = YEAR(CURDATE()) AND MONTH(updated_at) = MONTH(CURDATE())
          THEN total_price ELSE 0 END), 0) AS monthRevenue
      FROM orders
    `;

    const [rows] = await db.query(query);

    res.json(rows[0]);
  } catch (error) {
    console.error('getRevenueSummary error:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getRevenueList = async (req, res) => {
  try {
    const { search = '', from = '', to = '', period = 'all' } = req.query;

    let where = `WHERE o.status = 'livree'`;
    const params = [];

    if (search) {
      where += ` AND (u.username LIKE ? OR o.id LIKE ? OR d.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (from && to) {
      where += ` AND DATE(o.updated_at) BETWEEN ? AND ?`;
      params.push(from, to);
    } else if (period === 'today') {
      where += ` AND DATE(o.updated_at) = CURDATE()`;
    } else if (period === 'week') {
      where += ` AND YEARWEEK(o.updated_at, 1) = YEARWEEK(CURDATE(), 1)`;
    } else if (period === 'month') {
      where += ` AND YEAR(o.updated_at) = YEAR(CURDATE()) AND MONTH(o.updated_at) = MONTH(CURDATE())`;
    }

    const query = `
      SELECT 
        o.id,
        u.username AS clientName,
        o.total_price AS totalPrice,
        o.status,
        o.created_at AS createdAt,
        o.updated_at AS updatedAt,
        GROUP_CONCAT(CONCAT(d.name, ' x', oi.quantity) SEPARATOR ', ') AS dishNames
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN dishes d ON oi.dish_id = d.id
      ${where}
      GROUP BY o.id, u.username, o.total_price, o.status, o.created_at, o.updated_at
      ORDER BY o.updated_at DESC
      LIMIT 100
    `;

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('getRevenueList error:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.downloadRevenuePdf = async (req, res) => {
  try {
    const { search = '', from = '', to = '', period = 'all' } = req.query;

    let where = `WHERE o.status = 'livree'`;
    const params = [];

    if (search) {
      where += ` AND (u.username LIKE ? OR o.id LIKE ? OR d.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (from && to) {
      where += ` AND DATE(o.updated_at) BETWEEN ? AND ?`;
      params.push(from, to);
    } else if (period === 'today') {
      where += ` AND DATE(o.updated_at) = CURDATE()`;
    } else if (period === 'week') {
      where += ` AND YEARWEEK(o.updated_at, 1) = YEARWEEK(CURDATE(), 1)`;
    } else if (period === 'month') {
      where += ` AND YEAR(o.updated_at) = YEAR(CURDATE()) AND MONTH(o.updated_at) = MONTH(CURDATE())`;
    }

    const query = `
      SELECT 
        o.id,
        u.username AS clientName,
        o.total_price AS totalPrice,
        o.status,
        o.created_at AS createdAt,
        o.updated_at AS updatedAt,
        GROUP_CONCAT(CONCAT(d.name, ' x', oi.quantity) SEPARATOR ', ') AS dishNames
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN dishes d ON oi.dish_id = d.id
      ${where}
      GROUP BY o.id, u.username, o.total_price, o.status, o.created_at, o.updated_at
      ORDER BY o.updated_at DESC
    `;

    const [rows] = await db.query(query, params);
    const totalRevenue = rows.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

    const periodLabel =
      period === 'today' ? 'Jour' :
      period === 'week' ? 'Semaine' :
      period === 'month' ? 'Mois' : 'Tous';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="revenus-bamafood.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 38, bufferPages: true });
    doc.pipe(res);

    const W = doc.page.width;
    const H = doc.page.height;

    const gold = '#b8860b';
    const orange = '#d97706';
    const darkText = '#111111';
    const muted = '#6b7280';
    const line = '#e5e7eb';
    const soft = '#f9fafb';
    const softGold = '#fff7df';
    const softOrange = '#fff1e1';

    const logoPath = path.join(__dirname, '../../assets/logo.png');

    doc.rect(0, 0, W, H).fill('#ffffff');

    doc.fillColor(gold).font('Helvetica-Bold').fontSize(26).text('BamaFood', 40, 34);
    doc.fillColor(muted).font('Helvetica').fontSize(10).text('Rapport des revenus et des ventes livrées', 40, 62);

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, W - 90, 28, { width: 42 });
    }

    const badge = `Période: ${periodLabel}`;
    const badgeW = doc.widthOfString(badge) + 26;
    doc.roundedRect(W - 40 - badgeW, 34, badgeW, 24, 10).fillAndStroke(softGold, gold);
    doc.fillColor(gold).font('Helvetica-Bold').fontSize(9).text(badge, W - 27 - badgeW, 42);

    if (from && to) {
      const rangeText = `Du ${from} au ${to}`;
      doc.fillColor(muted).font('Helvetica').fontSize(9).text(rangeText, W - 160, 66, { width: 120, align: 'right' });
    }

    doc.moveTo(40, 86).lineTo(W - 40, 86).strokeColor(line).stroke();

    const statsY = 110;
    const statW = 154;
    const statH = 74;
    const gap = 14;

    const stats = [
      { x: 40, title: 'CA Jour', value: rows.filter(r => true).length ? '' : '', amount: rows.length, bg: softGold },
      { x: 40 + statW + gap, title: 'CA Semaine', value: '', amount: '', bg: softOrange },
      { x: 40 + (statW + gap) * 2, title: 'CA Mois', value: '', amount: '', bg: soft }
    ];

    doc.roundedRect(40, statsY, statW, statH, 14).fillAndStroke(softGold, '#f0d58a');
    doc.roundedRect(40 + statW + gap, statsY, statW, statH, 14).fillAndStroke(softOrange, '#f2c38a');
    doc.roundedRect(40 + (statW + gap) * 2, statsY, statW, statH, 14).fillAndStroke(soft, line);

    doc.fillColor(muted).fontSize(9).font('Helvetica-Bold').text('Total des ventes', 54, statsY + 14);
    doc.fillColor(gold).fontSize(18).font('Helvetica-Bold').text(`${totalRevenue.toLocaleString()} FCFA`, 54, statsY + 34);

    doc.fillColor(muted).fontSize(9).font('Helvetica-Bold').text('Commandes', 54 + statW + gap, statsY + 14);
    doc.fillColor(orange).fontSize(18).font('Helvetica-Bold').text(`${rows.length}`, 54 + statW + gap, statsY + 34);

    doc.fillColor(muted).fontSize(9).font('Helvetica-Bold').text('Filtre', 54 + (statW + gap) * 2, statsY + 14);
    doc.fillColor(darkText).fontSize(18).font('Helvetica-Bold').text(periodLabel, 54 + (statW + gap) * 2, statsY + 34);

    const tableY = 205;
    doc.fillColor(darkText).fontSize(12).font('Helvetica-Bold').text('Liste des ventes livrées', 40, tableY);
    doc.moveTo(40, tableY + 16).lineTo(W - 40, tableY + 16).strokeColor(gold).stroke();

    const colX = { id: 40, client: 80, dishes: 180, total: 370, status: 455, date: 500 };
    const headY = tableY + 26;

    doc.fillColor(muted).fontSize(9).font('Helvetica-Bold');
    doc.text('ID', colX.id, headY);
    doc.text('Client', colX.client, headY);
    doc.text('Plats', colX.dishes, headY);
    doc.text('Total', colX.total, headY);
    doc.text('Statut', colX.status, headY);
    doc.text('Date', colX.date, headY);

    doc.moveTo(40, headY + 14).lineTo(W - 40, headY + 14).strokeColor(line).stroke();

    let y = headY + 22;
    const rowH = 28;

    rows.forEach((item, index) => {
      if (y > H - 85) {
        doc.addPage();
        doc.rect(0, 0, W, H).fill('#ffffff');
        y = 40;
      }

      if (index % 2 === 0) {
        doc.roundedRect(40, y - 4, W - 80, rowH, 8).fill('#fcfcfc');
      }

      doc.fillColor(darkText).fontSize(9).font('Helvetica');
      doc.text(`#${item.id}`, colX.id, y, { width: 30 });
      doc.text(item.clientName || '-', colX.client, y, { width: 90 });
      doc.text(item.dishNames || '-', colX.dishes, y, { width: 180 });
      doc.text(`${Number(item.totalPrice).toLocaleString()} FCFA`, colX.total, y, { width: 75 });

      const statusText = 'Livrée';
      const badgeW2 = doc.widthOfString(statusText) + 18;
      doc.roundedRect(colX.status, y - 1, badgeW2, 16, 8).fillAndStroke(softGold, gold);
      doc.fillColor(gold).font('Helvetica-Bold').text(statusText, colX.status + 9, y + 2);

      doc.fillColor(darkText).font('Helvetica').text(new Date(item.updatedAt).toLocaleDateString('fr-FR'), colX.date, y, { width: 70 });

      y += rowH;
    });

    if (!rows.length) {
      doc.fillColor(muted).fontSize(11).text('Aucune vente trouvée pour ce filtre.', 40, y + 10);
      y += 20;
    }

    const footerY = H - 48;
    doc.moveTo(40, footerY - 10).lineTo(W - 40, footerY - 10).strokeColor(line).stroke();
    doc.fillColor(gold).font('Helvetica-Bold').fontSize(8).text('BamaFood • Rapport interne des revenus', 40, footerY);
    doc.fillColor(muted).font('Helvetica').fontSize(8).text('Document généré par BamaFood', 220, footerY);

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor(muted).fontSize(8).text(`Page ${i - range.start + 1}`, W - 85, footerY, { width: 45, align: 'right' });
    }

    doc.end();
  } catch (error) {
    console.error('downloadRevenuePdf error:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};