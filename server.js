require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;
const MONGO_KEY = process.env['MONGO_KEY']

mongoose.connect(MONGO_KEY);

const shortUrlScheme = new mongoose.Schema({
    original_url: String,
    short_url: Number
});

const ShortUrl = mongoose.model('ShortUrl', shortUrlScheme);

app.use(cors());

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
        if(err)
            return console.log(err);
        done(null, data);
    });
};

const findOneByShort = (url, done) => {
    ShortUrl.findOne({short_url: url}, (err, data) => {
        if(err)
            return console.log(err);
        done(null, data);
    });
};

const createAndSave = (url, done) => {
    ShortUrl.count((err, data) => {
        if(err)
            return console.log(err);
        let short = new ShortUrl({
                original_url: url, 
                short_url: data
            });
        short.save((err, data) => {
            if(err)
                return console.log(err);
            let item = {
                original_url: data.original_url,
                short_url: data.short_url
            };
            done(null, item);
        });
    });
};

const testUrl = (url, done) => {
    const regexUrl = /^https?:\/\/(w{3}.)?[\w-]+.com(\/\w+)*/;
    if(regexUrl.test(url)) {
        dns.lookup(url.replace(/^https?:\/\//, ''), 
                    (err, address, family) => {
                        if(err)
                            return console.log(err);
                        done(null, address);
                    });
    }
    else {
        done(null, null);
    }
};

app.post('/api/shorturl/new', (req, res) => {
    testUrl(req.body.url, (err, address) => {
        if(err)
            return res.json(err);
        if(address === null) {
            return res.json({
                error: 'invalid url'
            });
        }

        findOneByURL(req.body.url, (err, data) => {
            if(err)
                return res.json(err);
            if(data) {
                let item = {
                    original_url: data.original_url,
                    short_url: data.short_url
                };
                res.json(item);
            }
            else {
                createAndSave(req.body.url, (err, data) => {
                    if(err)
                        return res.json(err);
                    res.json(data);
                });
            }
        });
    });
});

app.get('/api/shorturl/:shortUrl', (req, res) => {
    findOneByShort(req.params.shortUrl, (err, data) => {
        if(err)
            res.json(err);
        if(data === null) {
            res.json({
                error: 'invalid short URL'
            });
        }
        else {
            res.redirect(data.original_url);
        }
    });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
