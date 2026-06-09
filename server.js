require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/transacoes', require('./src/routes/transacoes'));
app.use('/api/categorias', require('./src/routes/categorias'));
app.use('/api/bens', require('./src/routes/bens'));
app.use('/api/configuracoes', require('./src/routes/configuracoes'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/evolucao', require('./src/routes/evolucao'));
app.use('/api/importar', require('./src/routes/importar'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Meu Bolso rodando na porta ${PORT}`));