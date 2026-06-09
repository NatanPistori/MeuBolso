const db = require('../db');

exports.listar = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bens ORDER BY tipo, nome');
    const [total] = await db.query('SELECT COALESCE(SUM(valor),0) as total FROM bens');
    res.json({ bens: rows, total: parseFloat(total[0].total) });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.criar = async (req, res) => {
  try {
    const { nome, valor, tipo, obs } = req.body;
    const [r] = await db.query(
      'INSERT INTO bens (nome,valor,tipo,obs) VALUES (?,?,?,?)',
      [nome, valor, tipo, obs || null]
    );
    const [rows] = await db.query('SELECT * FROM bens WHERE id=?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.atualizar = async (req, res) => {
  try {
    const { nome, valor, tipo, obs } = req.body;
    await db.query(
      'UPDATE bens SET nome=?,valor=?,tipo=?,obs=? WHERE id=?',
      [nome, valor, tipo, obs || null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM bens WHERE id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.deletar = async (req, res) => {
  try {
    await db.query('DELETE FROM bens WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
