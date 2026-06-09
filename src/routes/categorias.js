const router = require('express').Router();
const c = require('../controllers/categoriasController');
router.get('/', c.listar);
router.post('/', c.criar);
router.put('/:id', c.atualizar);
router.delete('/:id', c.deletar);
module.exports = router;
