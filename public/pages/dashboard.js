'use strict';

let _dashChart = null;
let _dashState = getCurrentMes();

async function renderDashboard() {
  _dashState = getCurrentMes();
  setTopbarActions(`
    <div class="month-switcher">
      <button class="month-btn" onclick="dashNavMes(-1)">‹</button>
      <span class="month-label" id="dash-mes-label"></span>
      <button class="month-btn" onclick="dashNavMes(1)">›</button>
    </div>
  `);
  await loadDashboard();
}

function dashNavMes(delta) {
  _dashState.mes += delta;
  if (_dashState.mes < 1)  { _dashState.mes = 12; _dashState.ano--; }
  if (_dashState.mes > 12) { _dashState.mes = 1;  _dashState.ano++; }
  loadDashboard();
}

async function loadDashboard() {
  const { ano, mes } = _dashState;
  const label = document.getElementById('dash-mes-label');
  if (label) label.textContent = `${MESES[mes - 1]} ${ano}`;

  try {
    const d = await API.get(`/dashboard/${ano}/${mes}`);

    const pct       = d.limite > 0 ? Math.min((d.saidas / d.limite) * 100, 100) : 0;
    const barColor  = pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)';
    const saldoClass = d.saldo >= 0 ? 'green' : 'red';

    const catBars = d.por_categoria.slice(0, 7).map(c => {
      const maxVal = d.por_categoria[0]?.total || 1;
      const p = ((c.total / maxVal) * 100).toFixed(0);
      return `<div class="mini-bar-row">
        <span class="mini-bar-label">${escHtml(c.nome)}</span>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${p}%;background:${c.cor}"></div></div>
        <span class="mini-bar-val">${formatBRL(c.total)}</span>
      </div>`;
    }).join('');

    const txRows = d.ultimas_transacoes.map(t => `
      <tr>
        <td>${formatDate(t.data)}</td>
        <td>${escHtml(t.descricao)}</td>
        <td><span class="color-dot" style="background:${t.categoria_cor||'#555'}"></span>${escHtml(t.categoria_nome||'—')}</td>
        <td class="mono ${t.tipo === 'entrada' ? 'val-green' : 'val-red'}">
          ${t.tipo === 'entrada' ? '+' : '-'}${formatBRL(t.valor)}
        </td>
      </tr>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="cards-grid">
        <div class="metric-card green">
          <div class="label">Entradas do mês</div>
          <div class="value">${formatBRL(d.entradas)}</div>
          <div class="sub">Salário + outras fontes</div>
        </div>
        <div class="metric-card red">
          <div class="label">Saídas do mês</div>
          <div class="value">${formatBRL(d.saidas)}</div>
          <div class="sub">Fixas + variáveis</div>
        </div>
        <div class="metric-card ${saldoClass}">
          <div class="label">Saldo do mês</div>
          <div class="value">${formatBRL(d.saldo)}</div>
          <div class="sub">${d.saldo >= 0 ? 'Positivo 👍' : 'Negativo ⚠️'}</div>
        </div>
        <div class="metric-card blue">
          <div class="label">Patrimônio total</div>
          <div class="value">${formatBRL(d.patrimonio)}</div>
          <div class="sub">Bens + investimentos</div>
        </div>
      </div>

      <div class="panel">
        <div class="progress-label">
          <span>Margem disponível para gastar</span>
          <span class="mono" style="color:${barColor};font-size:13px">${formatBRL(d.margem)} restantes</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <div class="progress-sub">${formatBRL(d.saidas)} gastos de ${formatBRL(d.limite)} disponíveis (${pct.toFixed(0)}%)</div>
      </div>

      <div class="two-col">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Últimas transações</span>
            <a href="#saidas" class="btn sm ghost">Ver todas →</a>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead>
              <tbody>${txRows || '<tr><td colspan="4" class="empty-state">Nenhuma transação este mês</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header"><span class="panel-title">Gastos por categoria</span></div>
          ${catBars || '<div class="empty-state">Sem dados</div>'}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><span class="panel-title">Comparativo ${ano}</span></div>
        <div class="chart-container" style="height:220px">
          <canvas id="dash-chart"></canvas>
        </div>
      </div>
    `;

    await renderDashChart(ano);
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="empty-state">Erro ao carregar dashboard: ${e.message}</div>`;
  }
}

async function renderDashChart(ano) {
  try {
    const ev  = await API.get(`/evolucao/${ano}`);
    const ctx = document.getElementById('dash-chart');
    if (!ctx) return;
    if (_dashChart) { _dashChart.destroy(); _dashChart = null; }
    _dashChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ev.map(m => MESES[m.mes - 1].substring(0, 3)),
        datasets: [
          { label: 'Entradas', data: ev.map(m => m.entradas), backgroundColor: 'rgba(29,158,117,0.75)', borderRadius: 4 },
          { label: 'Saídas',   data: ev.map(m => m.saidas),   backgroundColor: 'rgba(216,90,48,0.75)',  borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8b91a8', font: { family: 'DM Sans', size: 12 } } },
        },
        scales: {
          x: { ticks: { color: '#4a5068', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: {
            ticks: { color: '#4a5068', callback: v => 'R$' + (v / 1000).toFixed(0) + 'k', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
        },
      },
    });
  } catch (_) {}
}
