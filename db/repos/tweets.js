'use strict';

var sql = require('../sql').tweets;
var _ = require('lodash');
module.exports = (rep, pgp) => {

    /**  Add columns according to the desired information you want to gather from tweets.
     **  Don't forget to add columns in the PostgreSQL database tables accordingly.
     **  For more information:  https://dev.twitter.com/rest/reference/get/search/tweets
    **/
    var tweetCols = ['id','tweet_created_at','userid','tweet','coordinates','favorite_count','retweet_count','customfield'];
    var hashtagCols = ['name','status'];

    //pgp Column Sets
    var cs_tweets = new pgp.helpers.ColumnSet(tweetCols, {table: 'tweets'});
    var cs_hashtags = new pgp.helpers.ColumnSet(hashtagCols, {table:'hashtags'});

    return {
        /* Tweets */

        // Add a single new tweet and update the corresponding hashtags
        add: body =>
            rep.tx(t => {
                return t.one(pgp.helpers.insert(body,cs_tweets)+" ON CONFLICT(id) DO UPDATE SET coordinates = "+body.coordinates+" RETURNING id")
                    .then(tweet => {
                        var queries = [];
                        for(var i = 0; i < Object.keys(body.hashtags).length; i++){
                            queries.push(
                                t.one(pgp.helpers.insert(body.hashtags[i],cs_hashtags) + "ON CONFLICT(name) DO UPDATE SET fool ='f' RETURNING id")
                                    .then(hash =>{
                                        return t.none("INSERT INTO hashtagmap(tweetid,hashtagid) VALUES($1,$2) ON CONFLICT DO NOTHING", [+tweet.id, +hash.id]);
                                    })
                                );
                        }
                        return t.batch(queries);
                    });
            }),
        // Add multiple new tweets and update the corresponding hashtags
        batch: body =>
            rep.tx(t => {
                var tweetQueries = [];
                for(var j = 0; j < Object.keys(body).length; j++){
                    tweetQueries.push(
                        t.one(pgp.helpers.insert(body[j],cs_tweets)+" ON CONFLICT(id) DO UPDATE SET coordinates = $1, status = $2 RETURNING id",[+body[j].coordinates, body[j].status])
                        .then(tweet => {
                            var element;
                            var queries = [];
                            body.forEach(function(e,index){ //Get element from body array in order to check for hashtags
                                if(e.id == tweet.id){
                                    element = e;
                                    return;
                                }
                            });
                            for(var i = 0; i < Object.keys(element.hashtags).length; i++){
                                queries.push(
                                    t.one(pgp.helpers.insert(element.hashtags[i],cs_hashtags) + "ON CONFLICT(name) DO UPDATE SET fool ='f' RETURNING id")
                                        .then(hash =>{
                                            t.none("INSERT INTO hashtagmap(tweetid,hashtagid) VALUES("+tweet.id+","+hash.id+") ON CONFLICT DO NOTHING");
                                        })
                                    );
                            }
                            return t.batch(queries);
                        })
                    );
                }
                return t.batch(tweetQueries);
            }),
        // Tries to find a tweet from id;
        find: id =>
            rep.oneOrNone("SELECT * FROM tweets WHERE id = $1", id),

        //Tries to update a tweet from id;
        update: body =>
            rep.none(pgp.helpers.update(body,cs_tweets)+'WHERE id=' + body.id),

        // Returns all tweet records;
        all: () =>
            rep.any(sql.selectall),

        //Return all ids from Today
        idsToday: () =>
            rep.any("SELECT id from tweets WHERE tweet_created_at >= now()::date + interval '1h'"),
        //Return last 10 ids
        ids: () =>
            rep.any(sql.selectids),

        //Return html tag for tweet following Twitter widget.js guidelines
        html: id =>
            rep.oneOrNone("SELECT html from tweets where id=$1", id),

        // Add html to DB
        addHtml: body =>
            rep.one("UPDATE tweets SET html = $1 WHERE id=$2 RETURNING html",[body.html, body.id]),

        //Return status for tweet 
        status: id =>
            rep.oneOrNone("SELECT status from tweets where id=$1", id),

        //Add status for tweet 
        addStatus: body =>
             rep.one('UPDATE tweets SET status= $1 WHERE id= $2 RETURNING id',[body.status,body.id]),

        // Returns the total number of tweets;
        total: () =>
            rep.one(sql.count, [], a => +a.count),

        /** Temp **/
        //Temp - load ID and Classfication to temporary DB
        insertId: body =>
            rep.tx(t => {
                var size = 0;
                var queries = [];

                if(body instanceof Array){
                    size = body.length;
                }else{
                    size = Object.keys(body).length;
                }
                
                for (var j = 0; j<size; j++){
                    queries.push(
                        t.none("INSERT INTO temptweets(id, classification) VALUES($1,$2) ON CONFLICT DO NOTHING",[body[j].tweet_id, body[j].label]));
                }
                return t.batch(queries);
            }),
        //Temp - Add Html from Twitter API request to DB
        tempAddHtml: body =>
            rep.none("UPDATE temptweets SET html = $1 WHERE id=$2",[body.html,body.id]),

        //Temp - Get ids of tweets with empty html
        tempGetIds: () =>
            rep.any("SELECT id FROM temptweets WHERE twitter_response IS NULL limit 50"),
            
        //Temp - Add Content to tweets (batch)
        tempAddContent: body =>
            rep.tx(t => {
                var tweetQueries = [];
                var key;
                var tweetBody;
                for(var j = 0; j < Object.keys(body).length; j++){
                    key = Object.keys(body)[j];
                    tweetBody = body[key];
                    if(tweetBody != null){
                        tweetQueries.push(
                            t.one("UPDATE temptweets SET created_at = $1, userid = $2, tweet = $3, coordinates = $4, favorite_count = $5, retweet_count = $6, twitter_response = $7 WHERE id=$8 RETURNING id",[tweetBody.created_at,tweetBody.user.name || tweetBody.user.id_str,tweetBody.text,JSON.stringify(tweetBody.coordinates)||'null',tweetBody.favorite_count,tweetBody.retweet_count,tweetBody,key])
                            .then(tweet => {
                                var queries = [];
                                var element = {};
                                var tweetid = tweet.id;
                                Object.keys(body).forEach(function(e){ //Get element from body array in order to check for hashtags
                                    if(e == tweetid){
                                        element = body[e];
                                        return;
                                    }
                                });
                                if(element.entities != undefined){
                                    if(element.entities.hashtags != undefined){
                                      for(var i = 0; i < element.entities.hashtags.length; i++){
                                            queries.push(
                                                t.one("INSERT INTO temphashtags(name) values($1) ON CONFLICT(name) DO UPDATE SET fool ='f' RETURNING id",[element.entities.hashtags[i].text])
                                                    .then(hash =>{
                                                        t.none("INSERT INTO temphashtagmap(tweetid,hashtagid) VALUES($1,$2) ON CONFLICT DO NOTHING",[tweetid,hash.id]);
                                                    })
                                                );
                                        }
                                        return t.batch(queries);  
                                    }
                                }
                            })
                        );
                    }else{
                        tweetQueries.push(t.none("UPDATE temptweets SET twitter_response = null where id = $1",key));
                    }
                }
                return t.batch(tweetQueries);
            }),

        //Temp - Check how many tweets are complete
        tempCheckComplete: () =>
            rep.one("select count(*) from temptweets where twitter_response IS NOT NULL"),
        //Temp - Check how many tweets reamining to be completed
        tempCheckRemaining: () =>
            rep.one("select count(*) from temptweets where twitter_response IS NULL"),

        //Temp - Clear DB
        tempClear: () =>
            rep.tx(t =>{
                var queries = [
                    t.none("DELETE from temptweets;"),
                    t.none("DELETE from temphashtagmap;"),
                    t.none("DELETE FROM temphashtags;"),
                ];
                return t.batch(queries);
            }),

        //Temp - Add temp tables to normal tables
        tempUpload: () =>
            rep.tx(t =>{
                var queries = [
                    t.none("INSERT INTO tweets SELECT * FROM temptweets WHERE tweet_created_at IS NOT NULL AND tweet IS NOT NULL AND id IS NOT NULL AND userid IS NOT NULL;"),
                    t.none("INSERT INTO hashtags SELECT * FROM temphashtags;"),
                    t.none("INSERT INTO hashtagmap SELECT * FROM temphashtagmap;")
                ];
                return t.batch(queries);
            }),

        /** Hashtags **/

        // Add a new hashtag;
        addHashtag: body =>
            rep.none(sql.addhash, [body.name, body.relevance.traffic, body.relevance.disaster]),

        // Tries to find a hashtag from id;
        findHashtag: id =>
            rep.oneOrNone(sql.selectone, ['hashtags',id]),

        // Update hashtag map
        linkHashtag: body =>
            rep.none(sql.link, [body.tweetid, body.hashtagid])
    };
};
