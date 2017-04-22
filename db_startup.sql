--store tweets 
-- Add more fields as desired.
CREATE TABLE tweets(
	counter 		 SERIAL 						PRIMARY KEY,
	id 				 TEXT 						NOT NULL,
	tweet_created_at TIMESTAMP with time zone	NOT NULL,
	userid			 TEXT						NOT NULL,
	tweet 			 TEXT						NOT NULL,
	coordinates		 TEXT,
	favorite_count	 INT,
	retweet_count	 INT,
	html			 TEXT,
	status	         VARCHAR(20)			DEFAULT 'unknown', -- positive, negative or unknown
	classification   TEXT,
	twitter_response TEXT
);

-- only unique tweets
	CREATE UNIQUE INDEX t_i ON tweets(id);

-- store hashtags
CREATE TABLE hashtags(
	id					SERIAL PRIMARY KEY,
	name				TEXT NOT NULL,
	status			    VARCHAR(20)		DEFAULT 'unknown',
	fool				BOOLEAN 	DEFAULT 'f'
);

-- store unique hashtags
	CREATE UNIQUE INDEX h_n ON hashtags(name);

CREATE TABLE hashtagmap(
	tweetid		TEXT NOT NULL,
	hashtagid 	INT  NOT NULL,
	PRIMARY KEY (tweetid,hashtagid)
);

-- only unique mapping
	CREATE UNIQUE INDEX h_m ON hashtagmap(tweetid,hashtagid);

-- store tweets in a temporary table.
CREATE TABLE temptweets(
	counter 		SERIAL 						PRIMARY KEY,
	id 				TEXT 						NOT NULL,
	tweet_created_at 		TIMESTAMP with time zone	,
	userid			TEXT						,
	tweet 			TEXT						,
	coordinates		TEXT,
	favorite_count	INT,
	retweet_count	INT,
	html			 TEXT,
	status 			TEXT 						DEFAULT 'unknown',
	classification  TEXT,
	twitter_response TEXT
);

-- only unique tweets
	CREATE UNIQUE INDEX tempi ON temptweets(id);

-- store hashtags and its relevance for the topic
CREATE TABLE temphashtags(
	id					SERIAL PRIMARY KEY,
	name				TEXT NOT NULL,
	status			    VARCHAR(20)		DEFAULT 'unknown',
	fool				BOOLEAN 	DEFAULT 'f'
);

-- store unique hashtags
	CREATE UNIQUE INDEX temphash ON temphashtags(name);

CREATE TABLE temphashtagmap(
	tweetid		TEXT NOT NULL,
	hashtagid 	INT  NOT NULL,
	PRIMARY KEY (tweetid,hashtagid)
);

-- only unique mapping
	CREATE UNIQUE INDEX temph_map ON temphashtagmap(tweetid,hashtagid);