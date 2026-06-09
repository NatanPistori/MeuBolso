'use strict';

// CARTAO_CORES definido em saidas.js (carregado antes no index.html)

let _cartState = getCurrentMes();

async function renderCartoes() {
  _cartState = getCurrentMes();
  setTopbarActions(`
    <div class="month-switcher">
      <button class="month-btn" onclick="cartNavMes(-1)">‹</button>
      <span class="month-label" id="cart-mes-label"></span>
      <button class="month-btn" onclick="cartNavMes(1)">›</button>
    </div>
  `);
  await loadCartoes();
}

function cartNavMes(delta) {
  _cartState.mes += delta;
  if (_cartState.mes < 1)  { _cartState.mes = 12; _cartState.ano--; }
  if (_cartState.mes > 12) { _cartState.mes = 1;  _cartState.ano++; }
  loadCartoes();
}

async function loadCartoes() {
  const { ano, mes } = _cartState;
  const label = document.getElementById('cart-mes-label');
  if (label) label.textContent = `${MESES[mes - 1]} ${ano}`;

  try {
    const transacoes = await API.get(`/transacoes?ano=${ano}&mes=${mes}&tipo=saida`);
    const comCartao  = transacoes.filter(t => t.cartao);

    if (!comCartao.length) {
      document.getElementById('page-content').innerHTML = `
        <div class="panel" style="text-align:center;padding:48px 40px">
          <div style="font-size:32px;margin-bottom:12px">💳</div>
          <p style="color:var(--text2);margin-bottom:8px;font-weight:500">Nenhum gasto de cartão em ${MESES[mes-1]}</p>
          <p style="font-size:13px;color:var(--text3)">
            Para registrar, vá em <a href="#saidas" style="color:var(--green)">Saídas</a>
            e escolha o cartão no campo dedicado.
          </p>
        </div>`;
      return;
    }

    // Agrupa por cartão
    const grupos = {};
    comCartao.forEach(t => {
      if (!grupos[t.cartao]) grupos[t.cartao] = [];
      grupos[t.cartao].push(t);
    });

    const totalGeral = comCartao.reduce((s,t) => s + parseFloat(t.valor), 0);
    const totalPago  = comCartao.filter(t=>t.pago).reduce((s,t) => s + parseFloat(t.valor), 0);

    // Cards de resumo
    const summaryCards = Object.entries(grupos).map(([nome, txs]) => {
      const total     = txs.reduce((s,t) => s+parseFloat(t.valor), 0);
      const pagos     = txs.filter(t=>t.pago).reduce((s,t) => s+parseFloat(t.valor), 0);
      const allPago   = txs.every(t => t.pago);
      const cor       = CARTAO_CORES[nome] || { bg:'rgba(139,145,168,0.15)', color:'#8b91a8' };
      return `
        <div class="metric-card" style="border-color:${cor.color}33">
          <div class="label">${escHtml(nome)}</div>
          <div class="value" style="color:${allPago ? 'var(--green)' : cor.color}">${formatBRL(total)}</div>
          <div class="sub" style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
            <span>${allPago ? '✅ Pago' : `R$ ${formatBRL(pagos).replace('R$','').trim()} pagos`}</span>
          </div>
        </div>`;
    }).join('');

    // Seções detalhadas por cartão
    const secoes = Object.entries(grupos).map(([nome, txs]) => {
      const total   = txs.reduce((s,t) => s+parseFloat(t.valor), 0);
      const pagos   = txs.filter(t=>t.pago).reduce((s,t) => s+parseFloat(t.valor), 0);
      const aberto  = total - pagos;
      const allPago = txs.every(t => t.pago);
      const cor     = CARTAO_CORES[nome] || { bg:'rgba(139,145,168,0.15)', color:'#8b91a8' };

      const rows = txs.map(t => {
        const isPago = !!t.pago;
        const parcelaMatch = t.descricao.match(/\((\d+)\/(\d+)\)$/);
        const parcelaBadge = parcelaMatch
          ? `<span style="background:rgba(55,138,221,0.15);color:var(--blue);padding:2px 7px;border-radius:12px;font-size:11px;font-weight:500;margin-left:5px">${parcelaMatch[1]}/${parcelaMatch[2]}</span>`
          : '';
        const rowStyle  = isPago ? 'opacity:0.45;' : '';
        const descStyle = isPago ? 'text-decoration:line-through;color:var(--text3);' : '';
        return `
          <tr style="${rowStyle}" id="cart-row-${t.id}">
            <td>
              <input type="checkbox" class="pago-check cart-check-${nome.replace(/\s/g,'-')}"
                ${isPago ? 'checked' : ''}
                onchange="togglePagoCartao(${t.id}, this.checked, '${nome.replace(/'/g,"\\'")}', ${ano}, ${mes})"
                style="accent-color:var(--green);width:15px;height:15px;cursor:pointer">
            </td>
            <td style="font-size:12px;color:var(--text3)">${formatDate(t.data)}</td>
            <td style="${descStyle}">
              ${escHtml(t.descricao.replace(/\s*\(\d+\/\d+\)$/,''))}${parcelaBadge}
            </td>
            <td><span class="color-dot" style="background:${t.categoria_cor||'#555'}"></span>${escHtml(t.categoria_nome||'—')}</td>
            <td class="mono" style="color:${isPago?'var(--text3)':'var(--red)'};${isPago?'text-decoration:line-through;':''}">
              -${formatBRL(t.valor)}
            </td>
            <td>
              <button class="btn sm ghost" onclick="deletarTransacao(${t.id}, 'cartoes')">🗑</button>
            </td>
          </tr>`;
      }).join('');

      return `
        <div class="panel" id="panel-cartao-${nome.replace(/\s/g,'-')}">
          <div class="panel-header">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="background:${cor.bg};color:${cor.color};padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600">
                💳 ${escHtml(nome)}
              </span>
              ${allPago ? '<span style="color:var(--green);font-size:12px;font-weight:500">✅ Fatura paga</span>' : ''}
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <div style="text-align:right">
                <div class="mono" style="color:${cor.color};font-size:15px;font-weight:600">${formatBRL(total)}</div>
                ${aberto > 0 ? `<div style="font-size:11px;color:var(--text3)">Em aberto: ${formatBRL(aberto)}</div>` : ''}
              </div>
              <button class="btn sm ${allPago ? 'ghost' : 'primary'}"
                onclick="pagarFaturaCartao('${nome.replace(/'/g,"\\'")}', ${ano}, ${mes}, ${allPago ? 'false' : 'true'}, this)">
                ${allPago ? '↩ Desmarcar tudo' : '✅ Pagar fatura toda'}
              </button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:36px">Pago</th>
                  <th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr style="border-top:1px solid var(--border2)">
                  <td colspan="4" style="padding:10px 12px;font-size:12px;color:var(--text3)">Total da fatura</td>
                  <td class="mono" style="padding:10px 12px;color:${cor.color};font-weight:600">${formatBRL(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>`;
    }).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="cards-grid" style="max-width:700px">
        ${summaryCards}
        <div class="metric-card">
          <div class="label">Total cartões</div>
          <div class="value">${formatBRL(totalGeral)}</div>
          <div class="sub">${totalPago > 0 ? formatBRL(totalPago) + ' pagos' : 'nenhum pago ainda'}</div>
        </div>
      </div>
      ${secoes}
      <div class="panel" style="font-size:13px;color:var(--text2);padding:14px 18px">
        💡 Para lançar gastos de cartão, vá em
        <a href="#saidas" style="color:var(--green)">Saídas</a>
        e escolha o cartão no campo dedicado.
      </div>`;
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
  }
}

/* ── Toggle individual via cartão ── */
async function togglePagoCartao(id, pago, nomeCartao, ano, mes) {
  try {
    await API.patch(`/transacoes/${id}/pago`, { pago });
    const tr = document.getElementById(`cart-row-${id}`);
    if (tr) {
      tr.style.opacity = pago ? '0.45' : '';
      tr.querySelectorAll('td').forEach(td => {
        if (td.querySelector('input,button')) return;
        td.style.textDecoration = pago ? 'line-through' : '';
        if (pago) td.style.color = 'var(--text3)';
        else td.style.color = '';
      });
    }
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}

/* ── Pagar/desmarcar fatura toda ── */
async function pagarFaturaCartao(cartao, ano, mes, pagar, btn) {
  try {
    await API.patch('/transacoes/pago/cartao', { cartao, ano, mes, pago: pagar });
    showToast(pagar ? `✅ Fatura ${cartao} marcada como paga!` : `↩ Fatura ${cartao} desmarcada`);
    loadCartoes(); // recarrega a seção para refletir tudo
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}
