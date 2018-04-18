const express = require('express')
let app = express();
const template = require('nunjucks');
const mongo = require('mongodb');
const MONGODB_URI = 'mongodb://' + process.env.USER + ':' + process.env.PASS + '@' + process.env.HOST + ':' + process.env.DB_PORT + '/' + process.env.DB;
let collection;
let connected = false;
app.use(express.static('public'))

template.configure('views', {
    autoescape: true,
    express: app
});



app.route("/").get(function (request, response) {
    try {
        var request = request.params.request;
        response.render(
            'index.html', {
                anim: "1"
            })
    } catch (err) {
        handleError(err, response);
    }
})
app.route("/api").get(function (request, response) {
    try {
        var request = request.params.request;
        response.render(
            'api.html')
    } catch (err) {
        handleError(err, response);
    }
})

app.route("/new/").get(function (request, response) {
    try {
        var url = request.query.url
        var doc = {
            original_url: url,
            short_url: getRandomID()
        }
        mongo.connect(MONGODB_URI, function (err, client) {
            var collection = client.collection(process.env.COLLECTION)
            collection.find({original_url: url}, { _id: 0, short_url: 1,original_url: 1 }).toArray(function(err, result) {
            if (err) {throw err;}
              
            if (result.length===0) {
            collection.insert(doc, function (err, data) {
                if (err) throw err
                response.render('index.html', {
                    longurl: request.query.url,
                    shorturl: "https://" + process.env.APPHOST + "/" + doc.short_url
                });
                client.close()
            })
            } else {
              response.render('index.html', {
                    exists: "1",
                    longurl:  request.query.url,
                    shorturl: result[0].short_url
                });
            }
               });
        });
        
    } catch (err) {
        handleError(err, response);
    }
})

app.route("/api/new/:uri").get(function (request, response) {
    try {
        var url = request.params.uri
        var doc = {
            original_url: url,
            short_url: getRandomID()
        } 
             mongo.connect(MONGODB_URI, function (err, client) {
            var collection = client.collection(process.env.COLLECTION)
            collection.find({original_url: url}, { _id: 0, short_url: 1,original_url: 1 }).toArray(function(err, result) {
            if (err) {throw err;}
              
            if (result.length===0) {
            collection.insert(doc, function (err, data) {
                if (err) throw err
                delete doc._id;
                response.send(doc)
                client.close()
            })
            } else {
              delete doc._id;
                response.send(result[0]);
            }
               });
        });
      
    } catch (err) {
        handleError(err, response);
    }
})

 

app.route('/:uri')
    .get(function (request, response) {
        try {
            var uri = request.params.uri;
            mongo.connect(MONGODB_URI, function (err, db) {
                if (err) throw err
                var collection = db.collection(process.env.COLLECTION)
                collection.find({
                    short_url: uri
                }).toArray(function (err2, doc) {
                    if (err2) throw err2
                    if (!doc.length) {

                        response.render('index.html', {
                            noresults: "1"
                        });
                    } else {
                    response.redirect(doc[0].original_url);
                    }
                })
                db.close();
            })
        } catch (err) {
            handleError(err, response);
        }
    })


app.use(function (req, res, next) {
    res.status(404);
    res.sendFile(__dirname + '/public/404.html')
});

//# could be better, but should be efficient enough
function getRandomID() {
    var randomID = new Buffer(parseInt(Math.random(Date.now()) * Date.now()).toFixed(0)).toString('base64');
    return randomID;
}

function handleError(err, response) {
    response.status(500);
    response.send(
        "<html><head><title>Internal Server Error!</title></head><body><pre>" +
        JSON.stringify(err, null, 2) + "</pre></body>"
    );
}

const listener = app.listen(process.env.PORT, () => {
    console.log(`Your app is listening on port ${listener.address().port}`)
})