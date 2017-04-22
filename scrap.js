/**
	**  This module loads a .csv file with Tweet ids and scrap them from Twitter.
	**  It perform the scrappign accounting for the size of the tweet and the API rate.
	**
	**
**/
var path = require('path');
var fs = require('fs');
var db = require('./db').db;
var _ = require('lodash');
var csv = require('fast-csv');
var twitter = require('./twitterApi');

function getIds(){
    var array = [];
    var promise = new Promise(function(resolve,reject){
        db.tweets.tempGetIds().then(function(data){
            if(!data || data[0].id =='NA'){
                resolve(false) ;
            }else{
                array = _.map(data,'id');
                resolve({string:_.reduce(array,function(ac, t){return ac +','+t;},'').slice(1), size:_.size(data)});
            }
        }).catch(function(err){
            reject(err);
        });    
    });
    return promise;
}

//Scrap settings
var scrapjob = false;
var testcron = false;
var wait = false;
var waitTimeout;
var tweetsNumber = 0;
var i = 1;

module.exports = {
    //Data mining over tweet ids in the temp table (use loadIds to load the ids to the 'temptweets' table...)
    scrapTweets: function(req,res){
        if(scrapjob){
            res.send({success:false, error:"A data mining process is still running. Please wait until completion to start another."});
        }
        //Check for IDs in the temptweets table
        getIds().then(function(checkData){
            if(!checkData || checkData.size <= 1){
                console.log("No tweets to mine...");
                res.send({success:true, msg:"No tweets to mine in temp DB..."});
            }else{ //Start cron job to mine tweets
                scrapjob = setInterval(function(){
                    if(!wait){
                        getIds().then(function(data){
                                var idString = data.string;
                                tweetsNumber += data.size || 0;
                                if(!data || data.size <= 1){
                                    console.log("No tweets to mine...");
                                    db.tweets.tempCheckComplete().then(function(totalTweets){
                                        console.log("TOTAL Complete Tweets in DB:",totalTweets.count ||totalTweets, "Total Gather this time:",tweetsNumber);
                                        clearInterval(scrapjob);
                                        scrapjob = false;
                                        console.log("Data mining process successfully completed!");
                                    }).catch(function(error){
                                        console.log("Error during DB check...");
                                        console.log(error);
                                        clearInterval(scrapjob);
                                        scrapjob = false;
                                    }); 
                                }else{
                                    twitter.tempGetTweet(idString).then(function(response){
                                        if(response.success == true){
                                            if(response.remaining <= 0){
                                                wait = true;
                                                waitTimeout = setTimeout(function(){
                                                    wait = false;
                                                },response.reset || 5000);
                                            }
                                            else{
                                                db.tweets.tempCheckRemaining().then(function(tweetsRemaining){
                                                    var tweetsLeft = tweetsRemaining.count || tweetsRemaining;
                                                    var time = Math.round(3*tweetsLeft/(50)) || 0;
                                                    var hrs = ~~(time / 3600);
                                                    var mins = ~~((time % 3600) / 60);
                                                    var secs = time % 60;
                                                    console.log("Requests Remaining: ",response.remaining," Tweets Remaining: ",tweetsLeft, "Tweets collected: ",tweetsNumber, " Time Left:",hrs,"h",mins,"min",secs,"s");
                                                });
                                            }
                                        }
                                    }).catch(function(err){
                                        console.log(err);
                                    });
                                }
                            }).catch(function(err){
                                clearInterval(scrapjob);
                                scrapjob = false;
                                console.log("Not able to get IDs from DB...");
                                var errorData = new Date()+" - Not able to getIds() - "+" ErrorType:"+JSON.stringify(err);
                                fs.writeFile('debug.log', errorData, function (errr) {
                                  if (errr) return console.log(errr);
                                });
                            });  
                    }else{
                        twitter.statusf('statuses').then(function(data){
                            if(data.resources['statuses']["/statuses/lookup"]["remaining"] != undefined){
                                if(data.resources['statuses']["/statuses/lookup"]["remaining"] != 0){
                                    console.log("Wait time is over!");
                                    wait = false;
                                    clearTimeout(waitTimeout);
                                }
                            }
                        }).catch(function(err){
                            if(_.find(err,'code') != 88){
                                console.log(err);    
                            }
                        });
                    }
                },4000);
                res.send({success:true, msg:"Data mining process started! Check the server console for more information."});   
            }
        }).catch(function(err){
            console.log(err);
            //Couldn't get ids...
            res.send({success:false, error:"Not able to get IDs in the temptweets. Have you loaded tweets to the temp DB using a CSV file?"});
        });   
    },
    
    //Load Ids to the table 'temptweets'
    loadIds: function(req,res){
        var fileName = req.query.filename || false;
        if(!fileName){
            res.send({success:false, err:"Invalid file name."});
        }
        var tweets = [];
        if(fileName){
            var stream = fs.createReadStream(path.resolve("./csv/", fileName));
                stream.on("open",function(){
                    stream.pipe(csv.parse({headers: true}))
                    .validate(function (row) {
                        if(typeof row.tweet_id != 'string'){
                            return false;
                        }else{
                            return true;
                        }
                    })
                    .on("data", function (row) {
                       tweets.push(row); 
                    })
                    .on("end",function(){
                        db.tweets.insertId(tweets).then(function(){
                             res.send({success:true, err:false});
                        });
                    });
                });
                stream.on('error',function(error){
                    console.log(path.resolve("/csv/", fileName))
                    res.send({success:false,err:"Error! Unable to stream file: "+fileName, error:error});
                })    
        }
        else{
            res.send({success:false, err: 'No File Path!'});
        }
    },
    //Add content from temp table to DB...
    uploadDB: function(req,res){
        db.tweets.tempUpload().then(function(data){
            res.send({success:true, msg:"Data uploaded successfully!"});
        }).catch(function(err){
            console.log(err);
            res.send({success:false, error:"Not able to send temp data to main DB."});
        })
    },
    //Clear table temp
    clearTemp: function(){
        return new Promise(function(resolve,reject){
            db.tweets.tempClear().then(function(){
                resolve(true);
            }).catch(function(err){
                console.log(err);
                reject(err);
            });
        });
    }
}