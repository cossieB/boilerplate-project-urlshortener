require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose')
const cors = require('cors');
const dns = require('dns');
const url = require('url')

const app = express();
const {Schema} = mongoose

const mySecret = process.env['URI']

const urlSchema = new Schema({
    original_url: {type: String, required: true},
    short_url: {type: String, required: true}
})

const URLModel = mongoose.model("URL", urlSchema)

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false }))
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

async function connectToMongo() {
    try {
        await mongoose.connect(mySecret)
        console.log("Connected to the DB")
        app.listen(port, () => {
            console.log("Server is listening on port " + port)
        })
    }
    catch (err) {
        console.log(err)
    }
}
connectToMongo() 

app.post('/api/shorturl', (req, res) => {
  let original_url = req.body.url;
  let q = url.parse(original_url, true)
  let hostname = q.hostname
  dns.lookup(hostname, async (err, data) => {
    console.log(original_url)
    if (err) {console.log(err);return res.json({"error": "invalid url"})}
    console.log(hostname);
    if (!(/^http:\/\//.test(original_url)) && !(/^https:\/\//.test(original_url))) {
      console.log("FAILEd")
        return res.json({"error": "invalid url"})
    }
    let short_url = hostname.replace(/^www\./, "")
    let idx = short_url.indexOf(".")
    short_url = short_url.slice(0,idx)
    short_url = short_url.match(/[^aeiou\-]/g).join("")
    console.log(short_url)
    console.log(original_url, hostname, short_url)
    try {
      console.log("In First Try Block")
      let oldDoc = await URLModel.findOne({original_url: original_url})
      if (oldDoc) {
          return res.json(oldDoc)
      }
    }
    catch(e) {
      console.log("in first catch")
      console.log(e)
    }   
    try {
      console.log("In 2nd Try Block")
      let duplicates = await URLModel.find({short_url: short_url});
      if (duplicates.length) {
          short_url = short_url + String(duplicates.length + 1)
      }
    }
    catch(e) {console.log("In CATCH 2")
      console.log(e)
    } 
    let shortenedurl = new URLModel({original_url, short_url})
    await shortenedurl.save()
    res.json({original_url, short_url}) 
  })
})

app.get('/api/shorturl/:url', async (req, res) => {
    let {url} = req.params
    let matches = await URLModel.findOne({short_url: url})
    console.log(matches)
    if (matches) {
        return res.redirect(matches.original_url)
    }
    else {
        return res.send("Not Found")
    }
})

/*
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
*/