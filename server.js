'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');
var {MongoClient} = require('mongodb');
const bodyParser = require('body-parser');
const app = express();
// Basic Configuration
const port = process.env.PORT || 3000;

const uri = process.env['MONGO_KEY'];
const client = new MongoClient(uri);

client.connect()
    .then(
        () => console.log('success connecting to database'))
    .catch(
        (err) => console.log(err + '\n' + "fialed to connect to database"));

const regexURL = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i;

const shortUrlScheme = new mongoose.Schema({
    original_url: String,
    short_url: Number
});

const ShortUrl = mongoose.model('ShortUrl', shortUrlScheme);

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const findOneByURL = (url, done) => {
    ShortUrl.findOne({original_url: url}, (err, data) => {
        console.log(err);
        if(err)
            return done(err, null);
        done(null, data);
    });
    done(null, null);
};

const findOneByShort = (url, done) => {
    ShortUrl.findOne({short_url: url}, (err, data) => {
        if(err)
            return done(err, null);
        done(null, data);
    });
    done(null, null);
};

const createAndSave = (url, done) => {
    let count = ShortUrl.count((err, data) => {
        if(err)
            return done(err, null);
        console.log(data);
        let short = new ShortUrl({
                original_url: url, 
                short_url: data
            });
        short.save((err, data) => {
            if(err)
                return done(err, null);
            let item = {
                original_url: data.original_url,
                short_url: data.short_url
            };
            done(null, item);
        });
    });
};

const validateUrl = (value) => {
  return regexURL.test(value);
}

const testUrl = (url, done) => {
    if(validateUrl(url)) {
        dns.lookup(url.replace(/^https?:\/\//i, ''), 
                    (err, address, family) => {
                        if(err)
                            return done(err, null);
                        done(null, address);
                    });
    }
    else {
        done({error: 'invalid url'}, url);
    }
};

app.post('/api/shorturl/new', (req, res) => {
    testUrl(req.body.url, (err, address) => {
        if(err)
            return res.json(err);
        console.log('test succeeded');
        findOneByURL(req.body.url, (err, data) => {
            if(err)
                return res.json(err);
            if(data) {
                console.log('URL Already exists')
                let item = {
                    original_url: data.original_url,
                    short_url: data.short_url
                };
                res.json(item);
            }
            else {
                console.log('to create new item')
                createAndSave(req.body.url, (err, data) => {
                    if(err)
                        return res.json(err);
                    res.json(data);
                    console.log('finished creating');
                });
            }
        });
    });
});

app.get('/api/shorturl/:shortUrl', (req, res) => {
    findOneByShort(req.params.shortUrl, (err, data) => {
        if(err)
            res.json(err);
        if(data) {
            console.log('redirecting');
            res.redirect(data.original_url);
        }
        else {
            res.json({
                error: 'invalid short URL'
            });
        }
    });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
