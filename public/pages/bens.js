'use strict';

const TIPOS_BEM   = ['imovel','veiculo','investimento','dinheiro','consorcio'];
const LABELS_BEM  = { imovel:'Imóvel', veiculo:'Veículo', investimento:'Investimento', dinheiro:'Dinheiro', consorcio:'Consórcio' };
const CORES_BEM   = { imovel:'var(--blue)', veiculo:'var(--amber)', investimento:'var(--green)', dinheiro:'var(--purple)', consorcio:'var(--red)' };

async function renderBens() {
  setTopbarActions(`<button class="btn primary" onclick="abrirFormBem()">+ Novo bem</button>`);
  await loadBens();
}

async function loadBens() {
  try {
    const { bens, total } = await API.get('/bens');

    const secoes = TIPOS_BEM.map(tipo => {
      const itens    = bens.filter(b => b.tipo === tipo);
      if (!itens.length) return '';
      const subtotal = itens.reduce((s, b) => s + parseFloat(b.valor), 0);

      const linhas = itens.map(b => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:13px;font-weight:500">${escHtml(b.nome)}</div>
            ${b.obs ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">${escHtml(b.obs)}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="mono" style="color:${CORES_BEM[tipo]};font-size:14px;font-weight:600">${formatBRL(b.valor)}</span>
            <button class="btn sm ghost" onclick='abrirFormBem(${JSON.stringify(b)})'>✏️</button>
            <button class="btn sm ghost" onclick="deletarBem(${b.id})">🗑</button>
          </div>
        </div>`).join('');

      return `
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">${LABELS_BEM[tipo]}</span>
            <span class="mono" style="color:${CORES_BEM[tipo]};font-size:14px;font-weight:600">${formatBRL(subtotal)}</span>
          </div>
          ${linhas}
        </div>`;
    }).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="cards-grid" style="max-width:380px">
        <div class="metric-card green">
          <div class="label">Patrimônio total</div>
          <div class="value">${formatBRL(total)}</div>
          <div class="sub">${bens.length} bens cadastrados</div>
        </div>
      </div>
      ${secoes || '<div class="empty-state">Nenhum bem cadastrado</div>'}`;
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
  }
}

function abrirFormBem(dados = {}) {
  const opts = TIPOS_BEM.map(t =>
    `<option value="${t}" ${dados.tipo === t ? 'selected' : ''}>${LABELS_BEM[t]}</option>`
  ).join('');

  openModal(dados.id ? 'Editar bem' : 'Novo bem', `
    <div class="form-group">
      <label class="form-label">Nome *</label>
      <input type="text" class="form-control" id="b-nome" value="${escHtml(dados.nome||'')}" placeholder="Ex: Carro, Apartamento">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Valor (R$) *</label>
        <input type="number" step="0.01" min="0" class="form-control" id="b-valor" value="${dados.valor||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Tipo *</label>
        <select class="form-control" id="b-tipo">${opts}</select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Observação</label>
      <input type="text" class="form-control" id="b-obs" value="${escHtml(dados.obs||'')}" placeholder="Ex: Pago até o momento, crédito total, etc.">
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="salvarBem(${dados.id || 'null'})">Salvar</button>
    </div>
  `);
}

async function salvarBem(id) {
  const body = {
    nome:  document.getElementById('b-nome').value.trim(),
    valor: parseFloat(document.getElementById('b-valor').value),
    tipo:  document.getElementById('b-tipo').value,
    obs:   document.getElementById('b-obs').value.trim() || null,
  };
  if (!body.nome || isNaN(body.valor) || body.valor < 0) {
    return showToast('Nome e valor são obrigatórios', 'error');
  }
  try {
    if (id) await API.put(`/bens/${id}`, body);
    else    await API.post('/bens', body);
    closeModal();
    showToast('Salvo!');
    loadBens();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}

async function deletarBem(id) {
  if (!confirm('Excluir este bem?')) return;
  try { await API.del(`/bens/${id}`); showToast('Removido'); loadBens(); }
  catch (e) { showToast('Erro: ' + e.message, 'error'); }
}
