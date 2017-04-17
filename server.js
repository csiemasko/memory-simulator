var express = require('express');
var app = express();

app.set('view engine', 'pug');
app.set('views', './views');
app.use(express.static(__dirname + '/public'));


app.get('/', function (req, res) {
    res.render('index');
});

app.listen(3000);