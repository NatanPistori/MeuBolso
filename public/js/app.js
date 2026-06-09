'use strict';

const PAGES = {
  dashboard:     { title: 'Dashboard',        fn: () => renderDashboard() },
  entradas:      { title: 'Entradas',          fn: () => renderEntradas() },
  saidas:        { title: 'Saídas',            fn: () => renderSaidas() },
  fixos:         { title: 'Despesas Fixas',    fn: () => renderFixos() },
  cartoes:       { title: 'Cartões',           fn: () => renderCartoes() },
  bens:          { title: 'Bens & Patrimônio', fn: () => renderBens() },
  evolucao:      { title: 'Evolução Anual',    fn: () => renderEvolucao() },
  configuracoes: { title: 'Configurações',     fn: () => renderConfiguracoes() },
};

function navigate() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  const page = PAGES[hash] || PAGES.dashboard;

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-link[data-page="${hash}"]`);
  if (activeLink) activeLink.classList.add('active');

  setPageTitle(page.title);
  setTopbarActions('');
  document.getElementById('page-content').innerHTML = '<div class="loading-spinner">Carregando...</div>';

  page.fn();
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);
