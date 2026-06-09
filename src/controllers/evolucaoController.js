const db = require('../db');

exports.anual = async (req, res) => {
  try {
    const { ano } = req.params;
    const [rows] = await db.query(`
      SELECT MONTH(data) as mes, tipo, COALESCE(SUM(valor),0) as total
      FROM transacoes
      WHERE YEAR(data)=?
      GROUP BY MONTH(data), tipo
      ORDER BY mes
    `, [ano]);

    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      entradas: 0,
      saidas: 0,
      saldo: 0,
    }));

    rows.forEach(r => {
      const m = meses[r.mes - 1];
      if (r.tipo === 'entrada') m.entradas = parseFloat(r.total);
      else m.saidas = parseFloat(r.total);
    });

    meses.forEach(m => { m.saldo = parseFloat((m.entradas - m.saidas).toFixed(2)); });

    res.json(meses);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
