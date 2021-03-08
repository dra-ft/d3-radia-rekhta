var express = require('express');
var router = express.Router();
var scraper = require('../scraper.js');
var locals = { scraper: scraper };

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', locals );
});

module.exports = router;
