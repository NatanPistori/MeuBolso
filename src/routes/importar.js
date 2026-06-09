const router = require('express').Router();
const c = require('../controllers/importarController');
router.post('/csv', c.upload, c.importar);
module.exports = router;
