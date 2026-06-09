const router = require('express').Router();
const c = require('../controllers/configuracoesController');
router.get('/', c.listar);
router.put('/', c.salvar);
module.exports = router;
