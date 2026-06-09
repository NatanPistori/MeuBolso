const router = require('express').Router();
const c = require('../controllers/evolucaoController');
router.get('/:ano', c.anual);
module.exports = router;
