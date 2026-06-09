const db = require('../db');

const SELECT_JOIN = `
  SELECT t.*, c.nome as categoria_nome, c.cor as categoria_cor
  FROM transacoes t LEFT JOIN categorias c ON t.categoria_id = c.id
`;

exports.listar = async (req, res) => {
  try {
    const { ano, mes, tipo, categoria_id, fixo } = req.query;
    let sql = SELECT_JOIN + ' WHERE 1=1';
    const params = [];
    if (ano && mes) { sql += ' AND YEAR(t.data)=? AND MONTH(t.data)=?'; params.push(ano, mes); }
    if (ano && !mes) { sql += ' AND YEAR(t.data)=?'; params.push(ano); }
    if (tipo) { sql += ' AND t.tipo=?'; params.push(tipo); }
    if (categoria_id) { sql += ' AND t.categoria_id=?'; params.push(categoria_id); }
    if (fixo !== undefined) { sql += ' AND t.fixo=?'; params.push(fixo === '1' ? 1 : 0); }
    sql += ' ORDER BY t.data DESC, t.id DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.criar = async (req, res) => {
  try {
    const { data, descricao, valor, tipo, categoria_id, cartao, fixo, pago, obs } = req.body;
    const [r] = await db.query(
      'INSERT INTO transacoes (data,descricao,valor,tipo,categoria_id,cartao,fixo,pago,obs) VALUES (?,?,?,?,?,?,?,?,?)',
      [data, descricao, valor, tipo, categoria_id||null, cartao||null, fixo?1:0, pago?1:0, obs||null]
    );
    const [rows] = await db.query(SELECT_JOIN + ' WHERE t.id=?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.atualizar = async (req, res) => {
  try {
    const { data, descricao, valor, tipo, categoria_id, cartao, fixo, pago, obs } = req.body;
    await db.query(
      'UPDATE transacoes SET data=?,descricao=?,valor=?,tipo=?,categoria_id=?,cartao=?,fixo=?,pago=?,obs=? WHERE id=?',
      [data, descricao, valor, tipo, categoria_id||null, cartao||null, fixo?1:0, pago?1:0, obs||null, req.params.id]
    );
    const [rows] = await db.query(SELECT_JOIN + ' WHERE t.id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

// PATCH /:id/pago — toggle rápido sem reenviar todos os campos
exports.togglePago = async (req, res) => {
  try {
    const { pago } = req.body;
    await db.query('UPDATE transacoes SET pago=? WHERE id=?', [pago ? 1 : 0, req.params.id]);
    res.json({ ok: true, id: req.params.id, pago: pago ? 1 : 0 });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

// PATCH /pago/cartao — marca todas as transações de um cartão em um mês como pagas
exports.pagarFaturaCartao = async (req, res) => {
  try {
    const { cartao, ano, mes, pago } = req.body;
    await db.query(
      'UPDATE transacoes SET pago=? WHERE cartao=? AND YEAR(data)=? AND MONTH(data)=? AND tipo=?',
      [pago ? 1 : 0, cartao, ano, mes, 'saida']
    );
    const [result] = await db.query(
      'SELECT COUNT(*) as total FROM transacoes WHERE cartao=? AND YEAR(data)=? AND MONTH(data)=?',
      [cartao, ano, mes]
    );
    res.json({ ok: true, total: result[0].total });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.deletar = async (req, res) => {
  try {
    await db.query('DELETE FROM transacoes WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
