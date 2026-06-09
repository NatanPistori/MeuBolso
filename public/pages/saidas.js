'use strict';

const CARTAO_CORES = {
  'Nubank':  { bg: 'rgba(127,119,221,0.18)', color: '#9b8ff5' },
  'C6 Bank': { bg: 'rgba(255,199,0,0.15)',   color: '#d4a800' },
};

let _saiState = getCurrentMes();

async function renderSaidas() {
  _saiState = getCurrentMes();
  setTopbarActions(`
    <div class="month-switcher">
      <button class="month-btn" onclick="saiNavMes(-1)">‹</button>
      <span class="month-label" id="sai-mes-label"></span>
      <button class="month-btn" onclick="saiNavMes(1)">›</button>
    </div>
    <button class="btn ghost" onclick="abrirImportarCSV()">⬆ Importar CSV</button>
    <button class="btn primary" onclick="abrirFormTransacao('saida')">+ Nova saída</button>
  `);
  await loadSaidas();
}

function saiNavMes(delta) {
  _saiState.mes += delta;
  if (_saiState.mes < 1)  { _saiState.mes = 12; _saiState.ano--; }
  if (_saiState.mes > 12) { _saiState.mes = 1;  _saiState.ano++; }
  loadSaidas();
}

async function loadSaidas() {
  const { ano, mes } = _saiState;
  const label = document.getElementById('sai-mes-label');
  if (label) label.textContent = `${MESES[mes - 1]} ${ano}`;
  try {
    const transacoes = await API.get(`/transacoes?ano=${ano}&mes=${mes}&tipo=saida`);
    const total  = transacoes.reduce((s, t) => s + parseFloat(t.valor), 0);
    const pagos  = transacoes.filter(t => t.pago).reduce((s, t) => s + parseFloat(t.valor), 0);
    const aberto = total - pagos;

    // Cards de resumo por cartão
    const totaisPorCartao = {};
    transacoes.forEach(t => {
      if (t.cartao) totaisPorCartao[t.cartao] = (totaisPorCartao[t.cartao] || 0) + parseFloat(t.valor);
    });
    const cartaoCards = Object.entries(totaisPorCartao).map(([nome, val]) => {
      const cor = CARTAO_CORES[nome] || { bg: 'rgba(139,145,168,0.15)', color: '#8b91a8' };
      return `
        <div class="metric-card" style="border-color:${cor.color}33">
          <div class="label">${escHtml(nome)}</div>
          <div class="value" style="color:${cor.color}">${formatBRL(val)}</div>
          <div class="sub">fatura do mês</div>
        </div>`;
    }).join('');

    const rows = transacoes.map(t => {
      const isPago = !!t.pago;
      const cor    = t.cartao ? (CARTAO_CORES[t.cartao] || { bg:'rgba(139,145,168,0.15)', color:'#8b91a8' }) : null;
      const cartaoBadge = t.cartao
        ? `<span style="background:${cor.bg};color:${cor.color};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500">${escHtml(t.cartao)}</span>`
        : '<span style="color:var(--text3);font-size:12px">—</span>';
      const parcelaMatch = t.descricao.match(/\((\d+)\/(\d+)\)$/);
      const parcelaBadge = parcelaMatch
        ? `<span style="background:rgba(55,138,221,0.15);color:var(--blue);padding:2px 7px;border-radius:12px;font-size:11px;font-weight:500;margin-left:5px">${parcelaMatch[1]}/${parcelaMatch[2]}</span>`
        : '';
      const rowStyle = isPago ? 'opacity:0.45;' : '';
      const descStyle = isPago ? 'text-decoration:line-through;color:var(--text3);' : '';
      return `
        <tr style="${rowStyle}">
          <td>
            <input type="checkbox" class="pago-check" ${isPago ? 'checked' : ''}
              onchange="togglePago(${t.id}, this.checked)"
              style="accent-color:var(--green);width:15px;height:15px;cursor:pointer">
          </td>
          <td style="font-size:12px;color:var(--text3)">${formatDate(t.data)}</td>
          <td style="${descStyle}">
            ${escHtml(t.descricao.replace(/\s*\(\d+\/\d+\)$/,''))}${parcelaBadge}
          </td>
          <td><span class="color-dot" style="background:${t.categoria_cor||'#555'}"></span>${escHtml(t.categoria_nome||'—')}</td>
          <td>${cartaoBadge}</td>
          <td class="mono val-red" style="${isPago ? 'text-decoration:line-through;' : ''}">-${formatBRL(t.valor)}</td>
          <td>${t.fixo ? '<span class="badge fixo">Fixo</span>' : ''}</td>
          <td>
            <div class="actions">
              <button class="btn sm ghost" onclick="editarTransacao(${t.id})">✏️</button>
              <button class="btn sm ghost" onclick="deletarTransacao(${t.id}, 'saidas')">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="cards-grid" style="max-width:${Object.keys(totaisPorCartao).length ? '700px' : '560px'}">
        <div class="metric-card red">
          <div class="label">Total saídas</div>
          <div class="value">${formatBRL(total)}</div>
          <div class="sub">${transacoes.length} lançamentos</div>
        </div>
        <div class="metric-card green">
          <div class="label">✅ Pago</div>
          <div class="value">${formatBRL(pagos)}</div>
          <div class="sub">${transacoes.filter(t=>t.pago).length} lançamentos</div>
        </div>
        <div class="metric-card amber">
          <div class="label">⏳ Em aberto</div>
          <div class="value">${formatBRL(aberto)}</div>
          <div class="sub">${transacoes.filter(t=>!t.pago).length} lançamentos</div>
        </div>
        ${cartaoCards}
      </div>
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Lançamentos</span>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn sm ghost" onclick="marcarTodosPagos(true, 'saidas')">✅ Marcar todos pagos</button>
            <button class="btn sm ghost" onclick="marcarTodosPagos(false, 'saidas')">↩ Desmarcar todos</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:36px">Pago</th>
                <th>Data</th><th>Descrição</th><th>Categoria</th>
                <th>Cartão</th><th>Valor</th><th>Tipo</th><th>Ações</th>
              </tr>
            </thead>
            <tbody id="saidas-tbody">
              ${rows || '<tr><td colspan="8" class="empty-state">Nenhuma saída neste mês</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
  }
}

/* ── Toggle pago individual ── */
async function togglePago(id, pago) {
  try {
    await API.patch(`/transacoes/${id}/pago`, { pago });
    // Atualiza visual da linha sem recarregar a página
    const check = document.querySelector(`input[onchange="togglePago(${id}, this.checked)"]`);
    if (check) {
      const tr = check.closest('tr');
      if (pago) {
        tr.style.opacity = '0.45';
        tr.querySelectorAll('td').forEach(td => {
          if (td.querySelector('input') || td.querySelector('button')) return;
          td.style.textDecoration = 'line-through';
        });
      } else {
        tr.style.opacity = '';
        tr.querySelectorAll('td').forEach(td => { td.style.textDecoration = ''; });
      }
    }
    // Recarrega só os cards de totais
    await refreshSaidasCards();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}

/* ── Marcar/desmarcar todos da listagem atual ── */
async function marcarTodosPagos(pago, origem) {
  const checks = document.querySelectorAll('.pago-check');
  if (!checks.length) return;
  const promises = [];
  checks.forEach(ch => {
    const match = ch.getAttribute('onchange').match(/togglePago\((\d+)/);
    if (match) promises.push(API.patch(`/transacoes/${match[1]}/pago`, { pago }));
  });
  try {
    await Promise.all(promises);
    showToast(pago ? '✅ Todos marcados como pagos' : '↩ Todos desmarcados');
    if (origem === 'saidas') loadSaidas();
    else if (origem === 'cartoes') loadCartoes();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}

/* ── Recarrega só os cards sem rerender a tabela inteira ── */
async function refreshSaidasCards() {
  // Silencioso — só roda se a página de saídas ainda estiver ativa
  if (window.location.hash !== '#saidas') return;
  try {
    const { ano, mes } = _saiState;
    const transacoes = await API.get(`/transacoes?ano=${ano}&mes=${mes}&tipo=saida`);
    const total  = transacoes.reduce((s,t) => s+parseFloat(t.valor), 0);
    const pagos  = transacoes.filter(t=>t.pago).reduce((s,t) => s+parseFloat(t.valor), 0);
    const aberto = total - pagos;
    const elPago  = document.querySelector('.metric-card.green .value');
    const elAberto = document.querySelector('.metric-card.amber .value');
    if (elPago)   elPago.textContent   = formatBRL(pagos);
    if (elAberto) elAberto.textContent = formatBRL(aberto);
  } catch (_) {}
}

/* ── Importar CSV ── */
function abrirImportarCSV() {
  openModal('Importar Extrato CSV', `
    <div class="form-group">
      <label class="form-label">Arquivo CSV *</label>
      <input type="file" class="form-control" id="csv-file" accept=".csv,.txt">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Separador</label>
        <select class="form-control" id="csv-sep">
          <option value=",">Vírgula (,)</option>
          <option value=";">Ponto e vírgula (;)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo padrão</label>
        <select class="form-control" id="csv-tipo">
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
      </div>
    </div>
    <p style="font-size:12px;color:var(--text3);margin:0 0 10px">Índice da coluna (0 = primeira coluna):</p>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Coluna Data</label>
        <input type="number" class="form-control" id="csv-data" value="0" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Coluna Descrição</label>
        <input type="number" class="form-control" id="csv-desc" value="1" min="0">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Coluna Valor</label>
        <input type="number" class="form-control" id="csv-valor" value="2" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Coluna Tipo (opcional)</label>
        <input type="number" class="form-control" id="csv-tipoCol" placeholder="Vazio se não houver">
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="enviarCSV()">Importar</button>
    </div>
  `);
}

async function enviarCSV() {
  const file = document.getElementById('csv-file').files[0];
  if (!file) return showToast('Selecione um arquivo CSV', 'error');
  const fd = new FormData();
  fd.append('arquivo', file);
  fd.append('separador',    document.getElementById('csv-sep').value);
  fd.append('tipo_padrao',  document.getElementById('csv-tipo').value);
  fd.append('col_data',     document.getElementById('csv-data').value);
  fd.append('col_descricao',document.getElementById('csv-desc').value);
  fd.append('col_valor',    document.getElementById('csv-valor').value);
  const tipoCol = document.getElementById('csv-tipoCol').value;
  if (tipoCol !== '') fd.append('col_tipo', tipoCol);
  try {
    const r    = await fetch('/api/importar/csv', { method: 'POST', body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro || 'Erro desconhecido');
    closeModal();
    showToast(`✅ ${data.inseridos} transações importadas!`);
    loadSaidas();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}
