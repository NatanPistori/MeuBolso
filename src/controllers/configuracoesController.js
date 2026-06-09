const db = require('../db');

exports.listar = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM configuracoes');
    const cfg = {};
    rows.forEach(r => { cfg[r.chave] = r.valor; });
    res.json(cfg);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.salvar = async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [chave, valor] of entries) {
      await db.query(
        'INSERT INTO configuracoes (chave,valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=?',
        [chave, String(valor), String(valor)]
      );
    }
    const [rows] = await db.query('SELECT * FROM configuracoes');
    const cfg = {};
    rows.forEach(r => { cfg[r.chave] = r.valor; });
    res.json(cfg);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
