'use strict';

const CARTOES = ['Nubank', 'C6 Bank'];

let _entState = getCurrentMes();

async function renderEntradas() {
  _entState = getCurrentMes();
  setTopbarActions(`
    <div class="month-switcher">
      <button class="month-btn" onclick="entNavMes(-1)">‹</button>
      <span class="month-label" id="ent-mes-label"></span>
      <button class="month-btn" onclick="entNavMes(1)">›</button>
    </div>
    <button class="btn primary" onclick="abrirFormTransacao('entrada')">+ Nova entrada</button>
  `);
  await loadEntradas();
}

function entNavMes(delta) {
  _entState.mes += delta;
  if (_entState.mes < 1)  { _entState.mes = 12; _entState.ano--; }
  if (_entState.mes > 12) { _entState.mes = 1;  _entState.ano++; }
  loadEntradas();
}

async function loadEntradas() {
  const { ano, mes } = _entState;
  const label = document.getElementById('ent-mes-label');
  if (label) label.textContent = `${MESES[mes - 1]} ${ano}`;
  try {
    const transacoes = await API.get(`/transacoes?ano=${ano}&mes=${mes}&tipo=entrada`);
    const total = transacoes.reduce((s, t) => s + parseFloat(t.valor), 0);

    const rows = transacoes.map(t => `
      <tr>
        <td>${formatDate(t.data)}</td>
        <td>${escHtml(t.descricao)}</td>
        <td><span class="color-dot" style="background:${t.categoria_cor||'#555'}"></span>${escHtml(t.categoria_nome||'—')}</td>
        <td class="mono val-green">+${formatBRL(t.valor)}</td>
        <td>${t.fixo ? '<span class="badge fixo">Fixo</span>' : ''}</td>
        <td>${t.obs ? `<span style="color:var(--text3);font-size:12px">${escHtml(t.obs)}</span>` : ''}</td>
        <td>
          <div class="actions">
            <button class="btn sm ghost" onclick="editarTransacao(${t.id})">✏️</button>
            <button class="btn sm ghost" onclick="deletarTransacao(${t.id}, 'entradas')">🗑</button>
          </div>
        </td>
      </tr>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="cards-grid" style="max-width:380px">
        <div class="metric-card green">
          <div class="label">Total entradas</div>
          <div class="value">${formatBRL(total)}</div>
          <div class="sub">${transacoes.length} lançamentos</div>
        </div>
      </div>
      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Tipo</th><th>Obs</th><th>Ações</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7" class="empty-state">Nenhuma entrada neste mês</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
  }
}

/* ─────────────────────────────────────────────────────────
   FORM COMPARTILHADO — usado por entradas.js e saidas.js
   ───────────────────────────────────────────────────────── */
async function abrirFormTransacao(tipo, dados = {}) {
  const cats = await API.get(`/categorias?tipo=${tipo}`);
  const opts = cats.map(c =>
    `<option value="${c.id}" ${dados.categoria_id == c.id ? 'selected' : ''}>${escHtml(c.nome)}</option>`
  ).join('');

  const isSaida     = tipo === 'saida';
  const isEdicao    = !!dados.id;
  const dataDefault = dados.data ? formatDateInput(dados.data) : new Date().toISOString().split('T')[0];

  // Cartão: select fixo Nubank / C6 Bank
  const cartaoOpts = CARTOES.map(c =>
    `<option value="${c}" ${dados.cartao === c ? 'selected' : ''}>${c}</option>`
  ).join('');

  // Parcelas: só mostra em saídas novas (não edição)
  const parcelasField = isSaida && !isEdicao ? `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Parcelas</label>
        <select class="form-control" id="f-parcelas" onchange="toggleParcelaInfo()">
          ${Array.from({length: 24}, (_, i) =>
            `<option value="${i+1}">${i+1}x${i === 0 ? ' (à vista)' : ''}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group" id="f-parcela-info-wrap" style="display:none">
        <label class="form-label">Valor por parcela</label>
        <div class="form-control" id="f-parcela-valor" style="background:var(--bg3);color:var(--green);font-family:'DM Mono',monospace;font-weight:600">—</div>
      </div>
    </div>` : '';

  const cartaoField = isSaida ? `
    <div class="form-group">
      <label class="form-label">Cartão</label>
      <select class="form-control" id="f-cartao">
        <option value="">Nenhum (débito/dinheiro)</option>
        ${cartaoOpts}
      </select>
    </div>` : '<div></div>';

  openModal(isEdicao ? `Editar ${tipo}` : `Nova ${tipo}`, `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input type="date" class="form-control" id="f-data" value="${dataDefault}">
      </div>
      <div class="form-group">
        <label class="form-label">Valor total (R$) *</label>
        <input type="number" step="0.01" min="0" class="form-control" id="f-valor"
          value="${dados.valor||''}" placeholder="0,00"
          oninput="atualizarValorParcela()">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição *</label>
      <input type="text" class="form-control" id="f-descricao"
        value="${escHtml(dados.descricao||'')}" placeholder="Ex: Tênis Nike">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="f-categoria">
          <option value="">Sem categoria</option>${opts}
        </select>
      </div>
      ${cartaoField}
    </div>
    ${parcelasField}
    <div class="form-group" style="display:flex;align-items:center;gap:10px">
      <input type="checkbox" id="f-fixo" ${dados.fixo ? 'checked' : ''}>
      <label for="f-fixo" style="font-size:13px;color:var(--text2);cursor:pointer">
        Lançamento fixo (recorrente mensalmente)
      </label>
    </div>
    <div class="form-group">
      <label class="form-label">Observação</label>
      <input type="text" class="form-control" id="f-obs"
        value="${escHtml(dados.obs||'')}" placeholder="Opcional">
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="salvarTransacao('${tipo}', ${dados.id || 'null'})">
        ${isEdicao ? 'Salvar alterações' : 'Lançar'}
      </button>
    </div>
  `);
}

/* Atualiza o preview de valor por parcela */
function atualizarValorParcela() {
  const wrap  = document.getElementById('f-parcela-info-wrap');
  const el    = document.getElementById('f-parcela-valor');
  const parc  = document.getElementById('f-parcelas');
  if (!wrap || !el || !parc) return;
  const total = parseFloat(document.getElementById('f-valor').value) || 0;
  const n     = parseInt(parc.value) || 1;
  if (n > 1 && total > 0) {
    el.textContent = formatBRL(total / n);
  }
}

function toggleParcelaInfo() {
  const n    = parseInt(document.getElementById('f-parcelas')?.value) || 1;
  const wrap = document.getElementById('f-parcela-info-wrap');
  if (!wrap) return;
  wrap.style.display = n > 1 ? '' : 'none';
  atualizarValorParcela();
}

/* ── Salvar (com suporte a parcelamento) ── */
async function salvarTransacao(tipo, id) {
  const data      = document.getElementById('f-data').value;
  const descricao = document.getElementById('f-descricao').value.trim();
  const valorTotal = parseFloat(document.getElementById('f-valor').value);
  const parcelas  = parseInt(document.getElementById('f-parcelas')?.value) || 1;
  const categoria_id = document.getElementById('f-categoria').value || null;
  const cartao    = document.getElementById('f-cartao')?.value || null;
  const fixo      = document.getElementById('f-fixo').checked;
  const obs       = document.getElementById('f-obs').value.trim() || null;

  if (!data || !descricao || isNaN(valorTotal) || valorTotal <= 0) {
    return showToast('Preencha data, descrição e valor corretamente', 'error');
  }

  try {
    if (id) {
      // Edição simples — sem parcelamento
      await API.put(`/transacoes/${id}`, {
        data, descricao, valor: valorTotal, tipo, categoria_id, cartao, fixo, obs
      });
      showToast('Atualizado!');
    } else if (parcelas <= 1) {
      // À vista
      await API.post('/transacoes', {
        data, descricao, valor: valorTotal, tipo, categoria_id, cartao, fixo, obs
      });
      showToast('Lançamento salvo!');
    } else {
      // Parcelado — cria N transações nos meses seguintes
      const valorParcela = parseFloat((valorTotal / parcelas).toFixed(2));
      const [anoBase, mesBase, diaBase] = data.split('-').map(Number);

      const promises = [];
      for (let i = 0; i < parcelas; i++) {
        let m = mesBase + i;
        let a = anoBase;
        while (m > 12) { m -= 12; a++; }

        // Último dia do mês para evitar datas inválidas
        const ultimoDia = new Date(a, m, 0).getDate();
        const dia = Math.min(diaBase, ultimoDia);
        const dataParc = `${a}-${String(m).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        const descParc = `${descricao} (${i + 1}/${parcelas})`;

        promises.push(API.post('/transacoes', {
          data: dataParc,
          descricao: descParc,
          valor: valorParcela,
          tipo,
          categoria_id,
          cartao,
          fixo: false,
          obs: obs || null,
        }));
      }
      await Promise.all(promises);
      showToast(`✅ ${parcelas} parcelas lançadas!`);
    }

    closeModal();
    const hash = window.location.hash.replace('#', '');
    if (hash === 'entradas')  loadEntradas();
    else if (hash === 'saidas') loadSaidas();
    else if (hash === 'fixos')  renderFixos();
  } catch (e) {
    showToast('Erro: ' + e.message, 'error');
  }
}

async function editarTransacao(id) {
  try {
    const lista = await API.get(`/transacoes`);
    const t = lista.find(x => x.id === id);
    if (t) abrirFormTransacao(t.tipo, t);
  } catch (e) { showToast('Erro ao carregar: ' + e.message, 'error'); }
}

async function deletarTransacao(id, voltarPara) {
  if (!confirm('Excluir este lançamento?')) return;
  try {
    await API.del(`/transacoes/${id}`);
    showToast('Removido');
    if (voltarPara === 'entradas')    loadEntradas();
    else if (voltarPara === 'saidas') loadSaidas();
    else if (voltarPara === 'fixos')  renderFixos();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}
