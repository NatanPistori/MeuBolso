const db = require('../db');

exports.resumo = async (req, res) => {
  try {
    const { ano, mes } = req.params;

    const [totais] = await db.query(`
      SELECT tipo, COALESCE(SUM(valor),0) as total
      FROM transacoes
      WHERE YEAR(data)=? AND MONTH(data)=?
      GROUP BY tipo
    `, [ano, mes]);

    const entradas = parseFloat(totais.find(r => r.tipo === 'entrada')?.total || 0);
    const saidas   = parseFloat(totais.find(r => r.tipo === 'saida')?.total || 0);
    const saldo    = entradas - saidas;

    const [cfgRows] = await db.query('SELECT * FROM configuracoes');
    const cfg = {};
    cfgRows.forEach(r => { cfg[r.chave] = parseFloat(r.valor); });
    const limite = (cfg.salario || 0) + (cfg.ajuda_custo || 0);
    const margem = limite - saidas;

    const [porCategoria] = await db.query(`
      SELECT COALESCE(c.nome,'Sem categoria') as nome, COALESCE(c.cor,'#888888') as cor,
             COALESCE(SUM(t.valor),0) as total
      FROM transacoes t
      LEFT JOIN categorias c ON t.categoria_id = c.id
      WHERE t.tipo='saida' AND YEAR(t.data)=? AND MONTH(t.data)=?
      GROUP BY t.categoria_id, c.nome, c.cor
      ORDER BY total DESC
    `, [ano, mes]);

    const [ultimas] = await db.query(`
      SELECT t.*, c.nome as categoria_nome, c.cor as categoria_cor
      FROM transacoes t LEFT JOIN categorias c ON t.categoria_id = c.id
      WHERE YEAR(t.data)=? AND MONTH(t.data)=?
      ORDER BY t.data DESC, t.id DESC LIMIT 10
    `, [ano, mes]);

    const [porCartao] = await db.query(`
      SELECT cartao, COALESCE(SUM(valor),0) as total
      FROM transacoes
      WHERE tipo='saida' AND cartao IS NOT NULL AND YEAR(data)=? AND MONTH(data)=?
      GROUP BY cartao ORDER BY total DESC
    `, [ano, mes]);

    const [patrimonio] = await db.query('SELECT COALESCE(SUM(valor),0) as total FROM bens');

    res.json({
      entradas,
      saidas,
      saldo,
      limite,
      margem,
      por_categoria: porCategoria.map(r => ({ ...r, total: parseFloat(r.total) })),
      ultimas_transacoes: ultimas,
      por_cartao: porCartao.map(r => ({ ...r, total: parseFloat(r.total) })),
      patrimonio: parseFloat(patrimonio[0].total),
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
