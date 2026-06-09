const router = require('express').Router();
const c = require('../controllers/transacoesController');

router.get('/', c.listar);
router.post('/', c.criar);
router.put('/:id', c.atualizar);
router.delete('/:id', c.deletar);

router.patch('/pago/cartao', c.pagarFaturaCartao);
router.patch('/:id/pago', c.togglePago);

module.exports = router;