# README #
### Twitter - Data Mining Tool ###
Data mining API developed to process data from Twitter. It allows developers to query Twitter and save tweets in a PostgreSQL database seamlessly. Ideal tool for Machine Learning modeling, especially for supervised learning. 

* Query Twitter Search API (REST).
* Use a Map to set the area where you want to perform the query.
* Give a status for each tweet manually.
* Scrap specific tweets using CSV files.
* It has many endpoints already implemented.
* Fully integrated with PostgreSQL using pg-promise library (https://github.com/vitaly-t/pg-promise).
* Including debugging tools and logs.
* Responsive front-end layout using jQuery and Bootstrap 3

![alt text](https://github.com/jeanpro/twitter-pg-mining/blob/master/meta/main.png?raw=true  "The API")


### Main libraries
##### FrontEnd
* jQuery (v3.2.1) 
* Twitter's Bootstrap (v3.3.7) 
* Font Awesome (v4.7.0)

##### Backend 
* NodeJS (v6.10.0) 
* PostgreSQL (v9.6)
* ExpressJS (v4.14.0)
* pg-promise (v5.3.4) - https://github.com/vitaly-t/pg-promise


### How do I get set up? ###

0. Install NodeJS and PostgreSQL...
1.  Run the `db_startup.sql` to create the tables in a PostgreSQL database. 
2.  Edit the files `/config/auth.js` and `/config/settings.js` with:
    * Twitter API OAuth keys (Use API keys instead of user keys for higher rates)
    * Google Maps API key
    * PostgreSQL URL
3. `npm install`
4. `npm start`

### API Endpoints ###
Following a quick description of the endpoints:

* GET `/api/tweets` - Get all tweets
* GET `/api/tweets/:id` - Get tweet by ID
* GET `/api/tweets/get/count` -  Get the number of tweets in the DB
* GET `/api/tweets/get/all` -  Get all tweet ids
* GET `/api/tweets/today` - Get today's tweets
* GET `/api/tweets/html/:id`  - Get html for tweet
* GET `/api/tweets/status/:id`  - Get tweet's status field (custom field)
----------
* POST `/api/tweets` - Add tweet
* POST `/api/tweets/batch` - Add multiple tweets
* POST `/api/tweets/html/` - Add embed HTML to the DB
* PUT `/api/tweets/:id` - Update tweet by ID
----------
* GET `/api/hashtag/:id` - Get hashtag by ID
* POST `/api/hashtag`  - Add hashtag
* POST `/api/link` -  Link hashtag to tweet

### Tweet Status ###

This feature enables users to quickly segment tweets into three categories or **statuses**:

1. Positve
2. Negative
3. Unknown

Just by click over the tweet before saving it to the DB.

![alt text](https://github.com/jeanpro/twitter-pg-mining/blob/master/meta/status.png?raw=true "How to tag different tweets")

### Load tweets and labels using CSV ###
You can quick load tweets and labels using a CSV file:

1. Put the .csv file in the csv folder
	* The file should have the following format: 
	
	* ![alt text](https://github.com/jeanpro/twitter-pg-mining/blob/master/meta/csv.png?raw=true  "CSV file example")

	* The first line is the header. Each following line should contain a pair (label,tweeet_id). If you just want to mine tweets without label, create a dummy column for the labels. 
2. Load the CSV file by clicking in the **Load CSV** button.
3. Insert the file name and click **Load IDs to Temp DB**.
4. After adding the IDs and labels, click in **Start Data Mining**.
5. You will receive a message saying that the process started.
6. You can see the process in the console.
7. All tweets mined with CSV files will go to _temptweets_ table - **temporary database**.
8. After checking the tweets and cleaning the dataset you can safely upload them to the main DB.
9. The complete Twitter Response is stored in the twitter_response column as JSON.



### How the database works? ###
* Basically, there are two DBs in one: the _main DB_ and a _temporary DB_ (temp* tables).
* The tweets loaded from the CSV will go automatically to the _temporary tables_ (temptweets, temphashtags, etc). 
* You can check the information and, once it is ok, you can update the _main DB_ with the data from the _temp* tables_ using the buttom **Temp Data -> DB**.
* Everytime you load new CSV file the Temp DB **will be erased**. 
* This temp DB thing was an important function for what I was doing... 
* In order to not spend API requests everything I wanted to view a tweet, I created the GET HTML feature.
	1. Save tweets in the database using the **Save** button.
	2. Click **Get HTMLs** to get all embeded HTML tags for each tweet in the list.
	3. All HTML will be stored in the DB.
	4. You can refer to this HTML tags every time you want to embed the tweet in your website.

### Contribution guidelines ###
##### Comments
* If you have better ideas to implement feel free to contact me.
* If you want a specific modification, let me know too.

### Who do I talk to? ###

* Jean Phelippe Ramos de Oliveira, MSc.
* jean.phelippe92@gmail.com