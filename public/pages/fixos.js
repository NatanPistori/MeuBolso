'use strict';

async function renderFixos() {
  setTopbarActions(`<button class="btn primary" onclick="abrirFormTransacao('saida', {fixo:true})">+ Nova despesa fixa</button>`);
  try {
    const todas = await API.get('/transacoes?fixo=1');
    const fixasSaida   = deduplicar(todas.filter(t => t.tipo === 'saida'));
    const fixasEntrada = deduplicar(todas.filter(t => t.tipo === 'entrada'));
    const totalFixo    = fixasSaida.reduce((s, t) => s + parseFloat(t.valor), 0);

    const buildRows = (arr, tipo) => arr.map(t => `
      <tr>
        <td>${escHtml(t.descricao)}</td>
        <td><span class="color-dot" style="background:${t.categoria_cor||'#555'}"></span>${escHtml(t.categoria_nome||'—')}</td>
        <td class="mono ${tipo === 'entrada' ? 'val-green' : 'val-red'}">
          ${tipo === 'entrada' ? '+' : '-'}${formatBRL(t.valor)}
        </td>
        <td>
          <div class="actions">
            <button class="btn sm ghost" onclick="editarTransacao(${t.id}, '${tipo}')">✏️</button>
            <button class="btn sm ghost" onclick="deletarTransacao(${t.id}, 'fixos')">🗑</button>
          </div>
        </td>
      </tr>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="cards-grid" style="max-width:380px">
        <div class="metric-card red">
          <div class="label">Total fixo mensal</div>
          <div class="value">${formatBRL(totalFixo)}</div>
          <div class="sub">${fixasSaida.length} saídas fixas</div>
        </div>
      </div>
      <div class="two-col">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Saídas Fixas</span>
            <button class="btn sm ghost" onclick="abrirFormTransacao('saida',{fixo:true})">+ Adicionar</button>
          </div>
          <table>
            <thead><tr><th>Descrição</th><th>Categoria</th><th>Valor/mês</th><th>Ações</th></tr></thead>
            <tbody>${buildRows(fixasSaida,'saida') || '<tr><td colspan="4" class="empty-state">Nenhuma</td></tr>'}</tbody>
          </table>
        </div>
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Entradas Fixas</span>
            <button class="btn sm ghost" onclick="abrirFormTransacao('entrada',{fixo:true})">+ Adicionar</button>
          </div>
          <table>
            <thead><tr><th>Descrição</th><th>Categoria</th><th>Valor/mês</th><th>Ações</th></tr></thead>
            <tbody>${buildRows(fixasEntrada,'entrada') || '<tr><td colspan="4" class="empty-state">Nenhuma</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
  }
}

function deduplicar(arr) {
  const seen = new Map();
  for (const t of arr) {
    const key = `${t.descricao}|${t.valor}|${t.categoria_id}`;
    if (!seen.has(key)) seen.set(key, t);
  }
  return [...seen.values()];
}
