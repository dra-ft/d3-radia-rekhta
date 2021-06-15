var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var translate = require('translate');
var scraper = require('./scraper');
const fetch = require('node-fetch')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index')
})

app.post('/nazm', (req, res) => {
  console.log(req.body)
  const SEARCH_TERM = req.body.search_term
  if(SEARCH_TERM === "" ) {
    res.send({data: null, hindi_translation: null}) ;
    return;
  }
  const url = `https://www.rekhta.org/search/nazm?q=${SEARCH_TERM}`
  const results = scraper.nazmScraper(url)
  translate.engine = "google";
  translate.key = process.env.GOOGLE_TRANSLATE_KEY
  results.then(nazms => { 
    translate(SEARCH_TERM, { from: "en", to: "hi" }).then(text => {
      res.send({data: nazms, hindi_translation: text})    
    })
  });
})

app.post('/padma', (req, res) => {
  const SEARCH_TERM = req.body.search_term
  const url = "https://pad.ma/api";

  let postData = {
    keys: ['title', 'id', 'date'],
    query: {
      conditions: [
        { key: 'transcripts', operator: '=', value: SEARCH_TERM },
      ],
      operator: '&',
    },
    range: [0, 10],
    sort: [
      { key: 'title', operator: '+' },
    ],
    // group: 'source',
  };

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({action: 'find', data: postData}),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(result => result.json())
  .then(json => {
    const getItems = json.data.items.map((item) => {
      const getItemPostData = {
        id: item.id,
        keys: ['title', 'layers', 'streams', 'modified']
      }
    
      return fetch(url, {
        method: 'POST',
        body: JSON.stringify({action: 'get', data: getItemPostData}),
        headers: { 'Content-Type': 'application/json' }
      })
      .then(result => result.json())
      .then(json => {
        const valid = []
        json.data.layers.transcripts.forEach(sub => {
          if(sub.value.includes(SEARCH_TERM)) valid.push(sub.value)
        })
        return valid
      })
    });

    return Promise.all(getItems)
  })
  .then(transcripts => res.send(transcripts))
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

app.listen(3000, () => {
  console.log(`listening at http://localhost:${3000}`)
})

// module.exports = app;
