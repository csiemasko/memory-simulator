var express = require('express');
var app = express();
var https = require('https');
var animals = require('animals');
var sleep = require('thread-sleep');
var fs = require('fs');
var _ = require('lodash');

app.set('view engine', 'pug');
app.set('views', './views');
app.use(express.static(__dirname + '/public'));

var animalArray = [];
app.get('/', function (req, res) {
    res.render('paging');
});
app.get('/memory-simulator', function (req, res) {
    res.render('index');
});

app.get('/paging', function (req, res) {
    res.render('paging');
});

app.get('/get-animals', function(req, res) {    
    res.send(animalArray);
    //res.send(animals.words);
});

function genAnimals(callback) {
    var urls = [];
    var a = [];
    var complete = 0;
     for(var q = 0; q < animals.words.length; q++) {
           var opt = {
                host: 'https://en.wikipedia.org',
                path: '/w/api.php?action=query&prop=pageimages&format=json&titles=' + animals.words[q].replace('-','+') + '&pithumbsize=500',
                timeout: 2000
           };
           var request = https.get(opt.host+opt.path, function(res) {               
               var val = '';
               var name = animals.words[q];               
                res.on('data', function (chunk) {                    
                    val += chunk;
                });
                res.on('end', function () {
                    complete++;
                    var j = JSON.parse(val);  
                    var x = j.query.pages[Object.keys(j.query.pages)[0]].thumbnail;
                    console.log(j.query.pages[Object.keys(j.query.pages)[0]].title + ' --> ' + (x ? x.source : "missing"));
                    //urls.push(x ? x.source : "missing");
                    if (x) {
                       a.push({name: j.query.pages[Object.keys(j.query.pages)[0]].title,url: x.source });                        
                    }
                    
                    if (complete === animals.words.length) {                   
                       /*for(var w = 0; w < urls.length; w++) {
                           if (urls[w] && urls[w] != "missing") {
                                a.push({"name": animals.words[w],"url": urls[w]});   
                           }                                                   
                       }*/
                       if (callback) callback(a);                     
                    }
               
                });               
           });
           request.setTimeout(1000, function (e) { return; });
              
            }
}
    
genAnimals(function(a) {
        animalArray = a;
        console.log('___ANIMAL ARRAY BUILT___');
    }); 

app.listen(3000);