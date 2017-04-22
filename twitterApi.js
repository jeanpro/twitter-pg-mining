// 'use strict';
var twitter = require('twitter');
var ejs = require('ejs');
var path = require('path');
var fs = require('fs');
var moment = require('moment');
var db = require('./db').db;
var _ = require('lodash');
var configAuth = require('./config/auth');
var configSettings = require('./config/settings')

//Aux Function
var rateAPI = function(headers){
  var remaining = headers['x-rate-limit-remaining'];
  var limit = headers['x-rate-limit-limit'];
  var reset = headers['x-rate-limit-reset'];
  var now = new Date();
  var d = new Date(0);
  d.setUTCSeconds(reset);
  var secondsRemaining = Math.round((d.getTime() - now.getTime())/1000);
  var min = Math.floor(secondsRemaining / 60);
  var sec = secondsRemaining % 60;
  var html = 'API Rate Status: '+remaining+'/'+limit+'      Time to reset: '+ min + 'min ' + sec + 's';
  return html;
}

//Twitter - getting bearer token
var request = require('request'),
	authUrl = 'https://api.twitter.com/oauth2/token',
	authBody = 'grant_type=client_credentials';

var credentials ={
  consumer_key: configAuth.twitterAuth.consumerKey,
  consumer_secret: configAuth.twitterAuth.consumerSecret,
  access_token_key: configAuth.twitterAuth.accssTokenKey,
  access_token_secret: configAuth.twitterAuth.accssTokenSecret
};

// Encode key / secret
var auth = (new Buffer(credentials.consumer_key + ':' + credentials.consumer_secret)).toString('base64');

//get new bearer token
function get (auth, cb) {
		request({
			method: 'POST',
			uri: authUrl,
			headers: {
				Authorization: 'Basic ' + auth,
				'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
			},
			body: authBody
		}, function (err, res, body) {
			if (err) return cb(err);
			if (res.statusCode >= 400) return cb(body);
			cb(null, JSON.parse(body));
		});
}

var client = {};

get(auth, function(err, body){
	if(!err){
		client = new twitter({
		  consumer_key: credentials.consumer_key,
		  consumer_secret: credentials.consumer_secret,
		  bearer_token: body.access_token
		});
	}
	else{
		console.log(err.message);
	}
});

//Settings
const lang = configSettings.twitterSettings.lang; // Set language 
const type = configSettings.twitterSettings.defaultType // 'popular', 'recent' or 'mixed'

module.exports = {
	queryTwitter: function(req,res){ //Query Twitter API
		//Variables
		var lat = parseFloat(req.body.lat);
	    var lng = parseFloat(req.body.lng);
	    var radius = parseInt(req.body.radius);
	    var resultType = req.body.type || type;
	    var q = "";

	    //Just today tweets 
	    if(req.body.query.indexOf('since:') === -1 && req.body.today === 'true'){
	    	var since = " since:"+moment().format("YYYY-MM-DD");
	    	q = req.body.query+since;
	    }
	    else{
	    	q = req.body.query;
	    }

	    //Check if it's including the filter for removing retweets  
	    if(req.body.query.indexOf('-filter:retweets') === -1){
	    	q += " -filter:retweets";
	    }

	    //Check if the geocode will be used or not then add if needed
	    q += req.body.locate === 'true' ? " geocode:"+lat+","+lng+","+radius+"km":""; //Query

	    

	    //Send Query to Twitter API
		if(!isNaN(lat) && !isNaN(lng)){
	        client.get('search/tweets', {q:q, lang:lang, result_type:resultType, count: 100}, function(error, tweets, response) {
			   if(!error){
			   	var template = ejs.compile(fs.readFileSync(__dirname+'/views/partials/tweettable.ejs', 'utf8'));
			   	var rate = rateAPI(response.headers);
			   	var body = JSON.parse(response.body);
			   	var html = template({data: tweets});
			   	res.send({tweets:tweets, html:html, rate:rate, next: body.search_metadata.next_results, meta:body.search_metadata});
			   }
			   else{
			   	res.send({success: false, error: error});
			   }
			});
	    }
	    else{
	        res.send({success: false, error:'Lat and/or Lng not a number!'});
	    }
	},
	simpleQueryTwitter: function(obj){ //Simple Query to Twitter (for backending purpose)
		var promise = new Promise(function(resolve,reject){
			var resultType = obj.type || type;
			var lat = parseFloat(obj.lat || 24.419404 );
		    var lng = parseFloat(obj.lng || 54.519596 );
		    var radius = parseInt(obj.radius || 30);
		    var q = "";

		    //Just today tweets 
		    if(obj.query.indexOf('since:') === -1 && obj.today === 'true'){
		    	var since = " since:"+moment().format("YYYY-MM-DD");
		    	q = obj.query+since;
		    }
		    else{
		    	q = obj.query;
		    }

		    //Check if it's including the filter for removing retweets  
		    if(obj.query.indexOf('-filter:retweets') === -1){
		    	q += " -filter:retweets";
		    }

		    //Check if the geocode will be used or not then add if needed
	    	q += obj.locate === 'true' ? " geocode:"+lat+","+lng+","+radius+"km":""; //Query

		    //Send Query to Twitter API
	        client.get('search/tweets', {q:q, lang:lang, result_type:resultType, count: 100}, function(error, tweets, response) {
			   if(!error){
			   	var rate = rateAPI(response.headers);
			   	var body = JSON.parse(response.body);
			   	var tweetsArray = [];
			   	if(body.statuses.length != 0){
			   		tweetsArray = body.statuses;
			   	}
			   	resolve({tweets:tweetsArray, rate:rate, meta:body.search_metadata});
			   }
			   else{
			   	reject({error: error});
			   }
			});
		});
		return promise;
	},
	displayNext: function(req, res){ //Get Next page of tweets from the same query (each query display 100 tweets for each time by default)
		var maxID = req.query.max_id;
		var q = req.query.q;

		client.get('search/tweets', {q:q, lang:lang, max_id:maxID, count: 100}, function(error, tweets, response){
			if(!error){
			   	var template = ejs.compile(fs.readFileSync(__dirname+'/views/partials/tweettable.ejs', 'utf8'));
			   	var rate = rateAPI(response.headers);
			   	var body = JSON.parse(response.body);
			   	var html = template({data: tweets});

			   	res.send({tweets:tweets, html:html, rate:rate, next: body.search_metadata.next_results});
		    }
		    else{
		   		res.send({success: false, error: error});
		    }
		});
	},
	status: function(req, res){// return API status
		client.get('application/rate_limit_status',{resources: 'search'},function(error, tweets, response){
			res.send({success:true, data:JSON.parse(response.body)});
		});
	},
	statusf: function(type){// return API status
		var resources = type || 'search';
		var promise = new Promise(function(resolve,reject){
			client.get('application/rate_limit_status',{resources: resources},function(error, tweets, response){
				if(!error){
					resolve(JSON.parse(response.body));
				}else{
					reject(error);
				}
			});
		});
		return promise;
	},
	displayTweet: function(req, res){ //Display specific tweet in the DOM
		var id = req.params.id;
		client.get('statuses/oembed', {id: id, omit_script:true, hide_media:true}, function(error, tweets, response){
			if(!error){
				var body = JSON.parse(response.body);
				var template = ejs.compile(fs.readFileSync(__dirname+'/views/partials/tweet.ejs', 'utf8'));
				var rate = rateAPI(response.headers);
				db.tweets.addHtml({html:body.html, id:id}).then(function(data){
					var html = template({tweet: data.html, rate:rate});
					res.send({success:true, html:html, rate:rate});	
				}).catch(function(err){
					res.send({success:false, error:err});	
				});
			}
			else{
				res.send({success:false, error:error});
			}
		});
	},
	getHTML: function(req, res){ //Return HTML for the tweet to be embed
		var id = req.params.id;
		client.get('statuses/oembed', {id: id, omit_script:true, hide_media:true}, function(error, tweets, response){
			if(!error){
				var body = JSON.parse(response.body);
				var template = ejs.compile(fs.readFileSync(__dirname+'/views/partials/tweet.ejs', 'utf8'));
				var rate = rateAPI(response.headers);
				var html = template({tweet: body.html, rate:rate});
				res.send({success:true, html:html, rate:rate});
			}
			else{
				res.send({success:false, error:error});
			}
		});
	},
	tempGetTweet: function(ids){
		var promise = new Promise(function(resolve,reject){
			client.get('statuses/lookup',{id:ids, trim_user:false,include_entities:true, map:true},function(error,tweets,response){
				if(!error){
					var body = JSON.parse(response.body);
					var remaining = response.headers['x-rate-limit-remaining'];
	  				var limit = response.headers['x-rate-limit-limit'];
	  				var reset = response.headers['x-rate-limit-reset'];
	  				db.tweets.tempAddContent(body.id).then(function(data){
  						resolve({success:true, remaining:remaining, reset:reset});
	  				}).catch(function(err){
	  					console.log("Error at Twitter API - Please, check ./debug.log");
	  					var errorData = new Date()+" Error - tweet_id = "+JSON.stringify(ids)+"\n Type:"+JSON.stringify(err);
	  					fs.appendFile('./debug.log', errorData, function (err) {
						  if (err) console.log(err);
						});
						reject(err);
	  				});	
				}
				else{
					reject(error);
				}
			});
		});
		return promise;
	}
};

