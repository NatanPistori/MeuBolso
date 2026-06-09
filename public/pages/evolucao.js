'use strict';

let _evoChart = null;
let _evoAno   = new Date().getFullYear();

async function renderEvolucao() {
  setTopbarActions(`
    <div class="month-switcher">
      <button class="month-btn" onclick="evoNavAno(-1)">‹</button>
      <span class="month-label" id="evo-ano-label"></span>
      <button class="month-btn" onclick="evoNavAno(1)">›</button>
    </div>
  `);
  _evoAno = new Date().getFullYear();
  await loadEvolucao();
}

function evoNavAno(delta) {
  _evoAno += delta;
  loadEvolucao();
}

async function loadEvolucao() {
  const label = document.getElementById('evo-ano-label');
  if (label) label.textContent = String(_evoAno);

  document.getElementById('page-content').innerHTML = `
    <div class="panel">
      <div class="panel-header"><span class="panel-title">Entradas vs Saídas vs Saldo — ${_evoAno}</span></div>
      <div class="chart-container" style="height:300px"><canvas id="evo-chart"></canvas></div>
    </div>
    <div class="panel" id="evo-tabela"><div class="loading-spinner">Carregando...</div></div>`;

  try {
    const ev = await API.get(`/evolucao/${_evoAno}`);
    const ctx = document.getElementById('evo-chart');
    if (!ctx) return;
    if (_evoChart) { _evoChart.destroy(); _evoChart = null; }

    _evoChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ev.map(m => MESES[m.mes - 1].substring(0, 3)),
        datasets: [
          {
            label: 'Entradas',
            data: ev.map(m => m.entradas),
            borderColor: '#1D9E75',
            backgroundColor: 'rgba(29,158,117,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#1D9E75',
          },
          {
            label: 'Saídas',
            data: ev.map(m => m.saidas),
            borderColor: '#D85A30',
            backgroundColor: 'rgba(216,90,48,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#D85A30',
          },
          {
            label: 'Saldo',
            data: ev.map(m => m.saldo),
            borderColor: '#378ADD',
            backgroundColor: 'transparent',
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#378ADD',
            borderDash: [6, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8b91a8', font: { family: 'DM Sans', size: 12 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${formatBRL(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { ticks: { color: '#4a5068', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: {
            ticks: { color: '#4a5068', callback: v => 'R$' + (v / 1000).toFixed(1) + 'k', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
        },
      },
    });

    const totalEnt  = ev.reduce((s, m) => s + m.entradas, 0);
    const totalSai  = ev.reduce((s, m) => s + m.saidas, 0);
    const totalSald = totalEnt - totalSai;

    const rows = ev.map(m => {
      const cor = m.saldo >= 0 ? 'val-green' : 'val-red';
      return `
        <tr>
          <td>${MESES[m.mes - 1]}</td>
          <td class="mono val-green">${m.entradas > 0 ? formatBRL(m.entradas) : '—'}</td>
          <td class="mono val-red">${m.saidas > 0 ? formatBRL(m.saidas) : '—'}</td>
          <td class="mono ${cor}">${m.entradas > 0 || m.saidas > 0 ? formatBRL(m.saldo) : '—'}</td>
        </tr>`;
    }).join('');

    document.getElementById('evo-tabela').innerHTML = `
      <div class="panel-header">
        <span class="panel-title">Resumo por mês</span>
        <span class="mono" style="font-size:13px;color:${totalSald >= 0 ? 'var(--green)' : 'var(--red)'}">
          Saldo anual: ${formatBRL(totalSald)}
        </span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th>Entradas</th>
              <th>Saídas</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="font-weight:600;border-top:2px solid var(--border2)">
              <td style="padding:10px 12px;font-size:12px;color:var(--text2)">Total ${_evoAno}</td>
              <td class="mono val-green" style="padding:10px 12px">${formatBRL(totalEnt)}</td>
              <td class="mono val-red" style="padding:10px 12px">${formatBRL(totalSai)}</td>
              <td class="mono ${totalSald >= 0 ? 'val-green' : 'val-red'}" style="padding:10px 12px">${formatBRL(totalSald)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  } catch (e) {
    document.getElementById('evo-tabela').innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
  }
}
