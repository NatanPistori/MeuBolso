const router = require('express').Router();
const c = require('../controllers/dashboardController');
router.get('/:ano/:mes', c.resumo);
module.exports = router;
