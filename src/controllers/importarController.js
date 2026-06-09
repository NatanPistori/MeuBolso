const db = require('../db');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: '/tmp/' });
exports.upload = upload.single('arquivo');

exports.importar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

    const { col_data, col_descricao, col_valor, col_tipo, tipo_padrao, separador, categoria_id } = req.body;
    const sep = separador || ',';
    const conteudo = fs.readFileSync(req.file.path, 'utf8');
    const linhas = conteudo.split('\n').filter(l => l.trim());

    const header = linhas[0].split(sep).map(h => h.trim().replace(/"/g, ''));
    const dados = linhas.slice(1);

    const idxData  = parseInt(col_data);
    const idxDesc  = parseInt(col_descricao);
    const idxValor = parseInt(col_valor);
    const idxTipo  = (col_tipo !== '' && col_tipo !== undefined) ? parseInt(col_tipo) : null;

    let inseridos = 0;
    for (const linha of dados) {
      const cols = linha.split(sep).map(c => c.trim().replace(/"/g, ''));
      if (cols.length < 2) continue;

      const dataRaw   = cols[idxData];
      const descricao = cols[idxDesc];
      const valorRaw  = (cols[idxValor] || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
      const valor     = Math.abs(parseFloat(valorRaw));

      if (!dataRaw || !descricao || isNaN(valor) || valor === 0) continue;

      // Normaliza data dd/mm/aaaa → aaaa-mm-dd
      let data = dataRaw;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataRaw)) {
        const [d, m, a] = dataRaw.split('/');
        data = `${a}-${m}-${d}`;
      }

      let tipo = tipo_padrao || 'saida';
      if (idxTipo !== null && cols[idxTipo]) {
        const t = cols[idxTipo].toLowerCase();
        if (t.includes('cred') || t.includes('entrada') || t.includes('+')) tipo = 'entrada';
        else tipo = 'saida';
      }

      await db.query(
        'INSERT INTO transacoes (data,descricao,valor,tipo,categoria_id) VALUES (?,?,?,?,?)',
        [data, descricao, valor, tipo, categoria_id || null]
      );
      inseridos++;
    }

    fs.unlinkSync(req.file.path);
    res.json({ ok: true, inseridos, header });
  } catch (e) {
    try { if (req.file) fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ erro: e.message });
  }
};
