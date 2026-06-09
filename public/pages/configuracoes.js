'use strict';

async function renderConfiguracoes() {
  setTopbarActions('');
  try {
    const [cfg, cats] = await Promise.all([
      API.get('/configuracoes'),
      API.get('/categorias'),
    ]);

    const catRows = cats.map(c => `
      <tr>
        <td>
          <span class="color-dot" style="background:${c.cor};width:12px;height:12px"></span>
          ${escHtml(c.nome)}
        </td>
        <td><span class="badge ${c.tipo}">${c.tipo}</span></td>
        <td>
          <button class="btn sm ghost" onclick="deletarCategoria(${c.id})">🗑</button>
        </td>
      </tr>`).join('');

    document.getElementById('page-content').innerHTML = `
      <div class="two-col">
        <div class="panel">
          <div class="panel-header"><span class="panel-title">Renda mensal</span></div>
          <div class="form-group">
            <label class="form-label">Salário (R$)</label>
            <input type="number" step="0.01" class="form-control" id="cfg-salario" value="${cfg.salario || 0}">
          </div>
          <div class="form-group">
            <label class="form-label">Ajuda de custo (R$)</label>
            <input type="number" step="0.01" class="form-control" id="cfg-ajuda" value="${cfg.ajuda_custo || 0}">
          </div>
          <div style="margin-top:4px;padding-top:14px;border-top:1px solid var(--border)">
            <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Total disponível por mês:</div>
            <div class="mono" style="font-size:20px;color:var(--green);font-weight:600">
              ${formatBRL((parseFloat(cfg.salario)||0) + (parseFloat(cfg.ajuda_custo)||0))}
            </div>
          </div>
          <button class="btn primary" onclick="salvarConfiguracoes()" style="margin-top:16px">Salvar renda</button>
        </div>

        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Categorias</span>
            <button class="btn sm primary" onclick="abrirFormCategoria()">+ Nova categoria</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>Tipo</th><th></th></tr></thead>
              <tbody id="cat-rows">${catRows || '<tr><td colspan="3" class="empty-state">Nenhuma categoria</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="empty-state">Erro: ${e.message}</div>`;
  }
}

async function salvarConfiguracoes() {
  try {
    await API.put('/configuracoes', {
      salario:     document.getElementById('cfg-salario').value,
      ajuda_custo: document.getElementById('cfg-ajuda').value,
    });
    showToast('Renda atualizada!');
    renderConfiguracoes();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}

function abrirFormCategoria() {
  openModal('Nova categoria', `
    <div class="form-group">
      <label class="form-label">Nome *</label>
      <input type="text" class="form-control" id="cat-nome" placeholder="Ex: Alimentação">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo *</label>
        <select class="form-control" id="cat-tipo">
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Cor</label>
        <input type="color" class="form-control" id="cat-cor" value="#1D9E75">
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="salvarCategoria()">Criar categoria</button>
    </div>
  `);
}

async function salvarCategoria() {
  const body = {
    nome: document.getElementById('cat-nome').value.trim(),
    tipo: document.getElementById('cat-tipo').value,
    cor:  document.getElementById('cat-cor').value,
  };
  if (!body.nome) return showToast('Nome é obrigatório', 'error');
  try {
    await API.post('/categorias', body);
    closeModal();
    showToast('Categoria criada!');
    renderConfiguracoes();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}

async function deletarCategoria(id) {
  if (!confirm('Excluir esta categoria? Os lançamentos associados perderão a categoria.')) return;
  try {
    await API.del(`/categorias/${id}`);
    showToast('Removida');
    renderConfiguracoes();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}
