var Alexa = require('alexa-sdk');
var Twit = require('twit');
var sentiment = require('sentiment');
var WordPOS = require('wordpos');
var yw = require('weather-yahoo');
var tickertape = require('tickertape'),

getSymbol = tickertape.getSymbol,
getName = tickertape.getName;

var yahooFinance = require('yahoo-finance');

var wordpos;
var T; 




var Handler = {
	'NewSession': function()
	{
		T = new Twit({
			consumer_key: 'MrgT49viBzq4ZhCEECnUIL4r4',
			consumer_secret: '2LqSBOgl25fpoNjpbDn5vZTMshlXqZ0rSVWLQaP6QpSWoveKfc',
			app_only_auth: true
		});
		wordpos = new WordPOS();
		this.emit(':ask','Welcome.', 'Welcome.');
	},
	'TwitterAnalysis': function()
	{
		var company = this.event.request.intent.slots.Company.value;
		var scores = [];
		var alexa = this;
		T.get('search/tweets', { q: "\"@" + company.replace(/ /g,'') + "\"", count: 100}, function(err, data) {
			var tweets = data.statuses;
			var positiveTweet = null;
			var posScore = 0;
			var negScore = 0;
			var negativeTweet = null;
			var sum = 0;

			//calculate sentiment score and find example neg/pos tweet for recent data on company
			for(var i = 0; i < tweets.length; i++) {
				scores[i] = sentiment(tweets[i].text);
				sum += scores[i].score;
				if(scores[i].score < negScore)
				{
					negativeTweet = tweets[i].text;
					negScore = scores[i].score;
				}
				if(scores[i].score > posScore)
				{
					positiveTweet = tweets[i].text;
					posScore = scores[i].score;

				}
			}
			console.log('SCORES: ' + scores)
			console.log("SUM OF SCORES : ", sum);


			var negFreqTable = {};
			var posNouns = {};
			var positiveTweets = [];
			var negativeTweets = [];

			//separate positive and negative scores/tweets into separate structures
			for(var i = 0; i < scores.length; i++)
			{
				console.log('score.... : ' + scores[i]);
				if(scores[i].score > 0)
				{
					positiveTweets.push(scores[i]);
				}
				else if(scores[i].score < 0)
				{
					negativeTweets.push(scores[i]);
				}
			}

			var allNegTweets = [];
			console.log('negativetweets:' + negativeTweets);

			//gather all tweets' tokens into one structure
			for(var i =0; i < negativeTweets.length; i++)
			{
				var tweet = negativeTweets[i].tokens.join(' ');
				tweet.toLowerCase();
				allNegTweets.push(tweet);
			}

			delete allNegTweets["@" + company.replace(/ /g,'')];	//required search to have exact match of company name, remove, redundant for considering words

			var negIndicators = [];
			var posIndicators = [];

			console.log('ALLNEGTWEETS: ' + allNegTweets.join(' '));
			//get parts of speech (nouns atm) from list of words
			wordpos.getNouns(allNegTweets.join(' '), function(negNouns){
				
				//count occurence of each noun
				negNouns.forEach(function(noun){
					if(!negFreqTable[noun])
					{
						negFreqTable[noun]= 1;
					}
					else
					{
						negFreqTable[noun]+= 1;
					}
				});

				//sort words based on frequency
				var topNegWords = Object.keys(negFreqTable).map(function(key) {
					return [key, negFreqTable[key]];
				});
				topNegWords.sort(function(first, second) {
					return second[1] - first[1];
				});
				console.log("top negative words: " + topNegWords);

				//grab only the word and not frequency for output
				for(var i =0; i <topNegWords.length; i++)
				{
					if(!(!isNaN(parseFloat(topNegWords[i][0])) && isFinite(topNegWords[i][0])))
						negIndicators.push(topNegWords[i][0]);
				}
				console.log('>>INDICATORS: ' + negIndicators);
				negIndicators.splice(4,5); 
				console.log('>>splicedindicators: ' + negIndicators);
				readable = [];
				for(var i = 0; i < 5; i++)
				{
					readable.push(negIndicators[i]);
				}
			}).then(function(){
				var response = "";

				if(sum < 0 && negativeTweet !== null)
				{
					response = company + " has a negative reception recently on Twitter. \n";
					if(readable.length > 0)
					{
						response += 'The top negative indicative nouns are, \n';
						response += readable.join(', ') + "\n";
					}	
					response += "Also, here is what someone is saying, " + negativeTweet ;
					
				}
				else if(sum < 20)
				{
					response = company + " has a mixed reception recently on Twitter. \n"; 
					if(readable.length > 0)
					{
						response += 'The top negative indicative nouns are, \n';
						response += readable.join(', ') + "\n";
					}	
					if (negativeTweet !== null)
						response += "Here is what one user is saying, " + negativeTweet + " \n";
					if (positiveTweet !== null)
						response += "On a lighter note, someone also said, " + positiveTweet;
				}
				else
				{
					response = company + " has a positive reception recently on Twitter. \n";
					//response += 'The top five positive indacting nouns are, \n';
					//response += indicators.join(' ') + "\n";
					if (positiveTweet !== null)
						response += "Here is what someone is tweeting, " + positiveTweet;
				}

				response.replace(/(?:https?|ftp)[\n\S]+/g, '');		//remove urls from output response

				alexa.emit(':tell', response);
			}).catch(console.log)
			
		});

	},
	'TwitterWeather': function()
    {
        var company = this.event.request.intent.slots.Company.value.toLowerCase();
        var alexa = this;

        T.get('users/lookup', {screen_name: company.replace(/ /g, '')}, function (err, data) {
            var message = "";
            yw.getSimpleWeather(data[0].location).then(function(res){
                message = "Today's date is " + res.forecast[0].date + ", " + res.forecast[0].day + ". " + company + " is located at " + data[0].location +
                            ", and the highest temperature that it will reach is " + res.forecast[0].high + " degrees fahrenheit and the lowest temperature that it will reach is " + res.forecast[0].low +
                            ". Overall, the weather is " + res.forecast[0].text + ".";
            	alexa.emit(':tell', message);
            });
                        
        });
    },
    'StockAnalysis': function()
	{
		var dict = {
  			"apple": "AAPL",
  			"amazon": "AMZN",
  			"microsoft": "MSFT",
  			"capital one": "COF",
        	"capital 1": "COF",
  			"chase bank": "JPM",
  			"jp morgan chase": "JPM",
  			"wells fargo": "WFC",
  			"bank of america": "BAC",
  			"facebook": "FB",
  			"google": "GOOGL",
  			"disney": "DIS",
  			"yahoo": "YHOO",
  			"walmart": "WMT",
  			"nike": "NKE",
  			"verizon": "VZ",
  			"american express": "AXP",
  			"nokia": "ADR",
  			"salesforce": "CRM",
  			"accenture": "ACN",
  			"comcast": "CMCSA",
  			"coca cola": "KO",
  			"cisco": "CSCO",
  			"chevron": "CVX",
  			"workday": "WDAY"
		};

	    var alexa = this;
			var companyName = this.event.request.intent.slots.Company.value.toLowerCase();
	    console.log(companyName);
			var companySymbol = dict[companyName];
	    //console.log(companySymbol);
	    if (dict[companyName] == null) {
	      alexa.emit(':tell', "Sorry, the company stock information for " + companyName + " can not be found.");
	    } else {
	      yahooFinance.quote({
	        symbol: companySymbol,
	        modules: ['financialData' ] // see the docs for the full list 
	      }, function (err, quotes) {
	          var currPrice = quotes.financialData["currentPrice"];
	          var recMean = quotes.financialData["recommendationMean"];
	          var recKey = quotes.financialData["recommendationKey"];
	          var numberOfAnalystOpinions = quotes.financialData["numberOfAnalystOpinions"];

	          alexa.emit(':tell', "The current stock price of " + companyName + " is $" + currPrice + "." + " Considering " + numberOfAnalystOpinions + " analyst opinions I recommend to " + recKey + " this company's stock today with a recommendation mean of " + recMean);

	    });

    	}
	},
	'TwitterTrends': function()
	{
		    var response = "Here are the top five events trending in your area. ";
		    var alexa = this;
    		T.get('trends/place', {id: 23424977}, function (err, data) {
        	for (var i = 0; i < 5; i++) {
            	response += data[0].trends[i].name
                	+ " with a tweet volume of : "
                	+ data[0].trends[i].tweet_volume + "   ";
        	}

       		alexa.emit(':tell', response);


			});
	}
}

exports.handler = function(event, context, callback) {
	var alexa = Alexa.handler(event,context);
	alexa.registerHandlers(Handler);
	alexa.execute();
}
