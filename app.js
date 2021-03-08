var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var translate = require('translate');
var scraper = require('./scraper');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.post('/nazm', (req, res) => {

    console.log( req.body.search_term)
    const SEARCH_TERM = req.body.search_term
    const url = `https://www.rekhta.org/search/nazm?q=${SEARCH_TERM}`
    const results = scraper.nazmScraper(url)
    // translate(SEARCH_TERM, { to: 'Hindi' })
    //     .then(text => console.log(text));
    results.then(nazms => 
        res.send({data: nazms})    
    )
    // res.send({data: results});
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;