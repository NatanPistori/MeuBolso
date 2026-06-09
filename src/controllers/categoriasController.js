const db = require('../db');

exports.listar = async (req, res) => {
  try {
    const { tipo } = req.query;
    let sql = 'SELECT * FROM categorias WHERE 1=1';
    const params = [];
    if (tipo) { sql += ' AND tipo=?'; params.push(tipo); }
    sql += ' ORDER BY nome';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.criar = async (req, res) => {
  try {
    const { nome, tipo, cor } = req.body;
    const [r] = await db.query(
      'INSERT INTO categorias (nome,tipo,cor) VALUES (?,?,?)',
      [nome, tipo, cor || '#888888']
    );
    const [rows] = await db.query('SELECT * FROM categorias WHERE id=?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.atualizar = async (req, res) => {
  try {
    const { nome, tipo, cor } = req.body;
    await db.query('UPDATE categorias SET nome=?,tipo=?,cor=? WHERE id=?', [nome, tipo, cor, req.params.id]);
    const [rows] = await db.query('SELECT * FROM categorias WHERE id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.deletar = async (req, res) => {
  try {
    await db.query('DELETE FROM categorias WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
