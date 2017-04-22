var express = require('express');
var router = express.Router();
var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var configAuth = require('./../config/auth'); // Config file
var db = require('../db').db; // Database Manipulation
var twitter = require('../twitterApi'); //Twitter API
var scrap = require('../scrap') //Data mining module

//Google Maps
var googleMapsClient = require('@google/maps').createClient({
  key: configAuth.googleAuth.key
});

/**********************/
/******* DEBUG ********/
/**********************/

/*Log to file*/
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
// var log_stdout = process.stdout;

debug_log = function(d) { //
  log_file.write(util.format(d) + '\n');
  // log_stdout.write(util.format(d) + '\n');
};
/* End log to file */

if(twitter.error){
    console.log(twitter.error);
}


/*****************/
/***** ROUTES ****/
/*****************/

/* INDEX */
router.get('/', function(req,res){
    res.render('pages/api');
});

/* TWITTER API */

/*
Request Examples:

* queryTwitter:
body: {
    "lat":"12.2",
    "lng":"2.2",
    "radius":"30",
    "type":"recent/popular/mixed",
    "query":"#uaetraffic OR #traffic",
    "today":"true/anything",
    "locate":"true/anything"
}

* displayTweet:
    param:{id}

*/
router.post('/events/tweets/list', function(req, res){
    twitter.queryTwitter(req, res);
});

router.get('/events/tweets/status', function(req, res){
    twitter.status(req, res);
});

router.get('/events/tweets/next', function(req, res){
    twitter.displayNext(req,res);
});

// Get embedded HTML tag using Twitter API and store it on the database
// In this case, we don't need to request Twitter API every time a tweets rendered in page.
// More information: https://dev.twitter.com/web/embedded-tweets
router.get('/events/tweets/embed/:id', function(req, res){
    db.tweets.html(req.params.id).then(function(data){ //Get HTML and stauts
        if(data === null){//counldn't find id on DB -> return just html
            twitter.getHTML(req,res);
        }
        else if(data.html === null){ //Tweet is in DB -> return HTML and save this HTML to DB
            twitter.displayTweet(req, res);        
        }
        else{// HTML in DB -> return it without requesting Twitter API.
            res.send({success:true, html:null ,dbhtml:data.html}); //dbHTML stands for the HTML syntax that is stored in DB. No need to decoded URL
        }
    })
    
});

//Update API quickly based on a specific hashtag
router.get('/api/update/:hashtag',function(req,res){
    var hashtag = req.params.hashtag || false;
    
    if(!hashtag){
        res.send({success:false, error:"No hashtag provided..."});
    }
    
    hashtag = '#'+hashtag;

    var request = {
        type: 'recent',
        query: hashtag
    };
    //Get tweets
    twitter.simpleQueryTwitter(request).then(function(data){
        // var ids = [];
        if(_.isEmpty(data.tweets)){
            res.send({success:false, error:"Empty response!"});
        }else{
            var tweetsArray = _.flatMap(data.tweets,function(tweet,i,collection){
                if(tweet.id_str){
                    // ids.push(tweet.id_str);
                    var hashtags = {};
                    if(!_.isEmpty(tweet.entities)){
                        tweet.entities.hashtags.forEach(function(ele, i){
                          hashtags[i] = {name:ele.text, status:'unknown'};
                        });    
                    }
                    var tweetData = {
                        "id":tweet.id_str,
                        "tweet_created_at":tweet.created_at,
                        "userid":tweet.user.screen_name,
                        "tweet":tweet.text,
                        "coordinates":JSON.stringify(tweet.coordinates),
                        "favorite_count":tweet.favorite_count,
                        "retweet_count":tweet.retweet_count,
                        "status":"unknown",
                        "hashtags":hashtags
                      };
                    return tweetData;
                }
            });
            if(!_.isEmpty(tweetsArray)){ //There are tweets
                db.tweets.batch(tweetsArray).then(function(data){
                    res.json({
                        success: true,
                        data:data
                    });
                    // res.redirect('/');
                }).catch(function(err){
                   res.json({
                        success: false,
                        error: error.message || error
                    }); 
                });
            }else{
                console.log("No tweets...");
                res.json({
                        success: true,
                        data:data
                });   
            }
        } 
    }).catch(function(error){
        res.send({success:false, error:error});
    });
});

/*************************************/
/*********** Data Mining *************/
/*************************************/

//Load tweet_ids into 'temptweets' table
router.get('/api/loadids/',function(req,res){
   //Reset temporary DB
   scrap.clearTemp().then(function(data){
        // Load new dataset
        scrap.loadIds(req,res); 
   }).catch(function(err){
        res.send({success:false, err:err});
   });

});

//Start Data Mining process over IDs loaded in the 'temptweets' table (see above)

router.get('/api/mining',function(req,res){
    scrap.scrapTweets(req,res);
});


//Upload DB with temp data
router.get('/api/upload/',function(req,res){
    scrap.uploadDB(req,res); 
});

/*************************************/
/************* Database **************/
/*************************************/

/** Aux Functions **/

// Generic GET handler;
function GET(url, handler) {
    router.get(url, (req, res) => {
        handler(req)
            .then(data => {
                res.json({
                    success: true,
                    data
                });
            })
            .catch(error => {
                res.json({
                    success: false,
                    error: error.message || error
                });
            });
    });
}

// Generic POST handler;
function POST(url, handler) {
    router.post(url, (req, res) => {
        handler(req)
            .then(data => {
                res.json({
                    success: true,
                    data
                });
            })
            .catch(error => {
                res.json({
                    success: false,
                    error: error.message || error
                });
            });
    });
}

// Generic PUT handler;
function PUT(url, handler) {
    router.put(url, (req, res) => {
        handler(req)
            .then(data => {
                res.json({
                    success: true,
                    data
                });
            })
            .catch(error => {
                res.json({
                    success: false,
                    error: error.message || error
                });
            });
    });
}

//Request without cache
function nocache(req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
}

//Tweets
GET('/api/tweets', () => db.tweets.all()); //Get all tweets
GET('/api/tweets/:id', req => db.tweets.find(req.params.id)); //Get tweet
GET('/api/tweets/get/count', req => db.tweets.total());
GET('/api/tweets/get/ids', () => db.tweets.ids()); // Get all tweet ids
GET('/api/tweets/today', () => db.tweets.idsToday()); //Get today's tweets

GET('/api/tweets/html/:id', req => db.tweets.html(req.params.id)); //Get html for tweet
GET('/api/tweets/status/:id', req => db.tweets.status(req.params.id)); //Get tweet's status field (custom field)

POST('/api/tweets', req => db.tweets.add(req.body)); //Add tweet
POST('/api/tweets/batch', req => db.tweets.batch(req.body)); //Add multiple tweets
POST('/api/tweets/html/', req => db.tweets.addHtml(req.body)); //POST html for tweet
PUT('/api/tweets/:id', req => db.tweets.update(req.body));


//Hashtags
GET('/api/hashtag/:id', req => db.tweets.findHashtag(req.params.id)); //Get hashtag
POST('/api/hashtag', req => db.tweets.addHashtag(req.body)); //Add hashtag
POST('/api/link', req => db.tweets.linkHashtag(req.body)); // Link hashtag to tweet

module.exports = router;