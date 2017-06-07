var Alexa = require('alexa-sdk');
var Twit = require('twit');
var sentiment = require('sentiment');

var T; 

var Handler = {
	'NewSession': function()
	{
		T = new Twit({
			consumer_key: 'MrgT49viBzq4ZhCEECnUIL4r4',
			consumer_secret: '2LqSBOgl25fpoNjpbDn5vZTMshlXqZ0rSVWLQaP6QpSWoveKfc',
			app_only_auth: true
		});
		this.emit(':ask','Welcome.', 'Welcome.');
	},
	'TwitterAnalysis': function()
	{
		var company = this.event.request.intent.slots.Company.value;
		var scores = [];
		var alexa = this;
		T.get('search/tweets', { q: "@" + company, count: 100}, function(err, data) {
			var tweets = data.statuses;
			var positiveTweet = null;
			var posScore = 0;
			var negScore = 0;
			var negativeTweet = null;
			var sum = 0;
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

			console.log("SUM OF SCORES : ", sum);

			var response = "";

			if(sum < 0 && positiveTweet !== null)
			{
				response = company + " has a negative reception recently on Twitter. ";
				response += "Here is what someone is saying, " + negativeTweet;
				if(positiveTweet !== null)
					response += "Here is something positive being said, " + positiveTweet;
			}
			else if(sum < 10)
			{
				response = company + " has a mixed reception recently on Twitter. "; 
				if (negativeTweet !== null)
					response += "Listen to this bad tweet, " + negativeTweet;
				if (positiveTweet !== null)
					response += "On a lighter note, someone said, " + positiveTweet;
			}
			else
			{
				response = company + " has a positive reception recently on Twitter.";
				if (negativeTweet !== null)
					response += "Listen to this negative tweet, " + negativeTweet;
				if (positiveTweet !== null)
					response += "Someone positively tweeted, " + positiveTweet;
			}
			alexa.emit(':tell', response);
		});

	},


}
exports.handler = function(event, context, callback) {
	var alexa = Alexa.handler(event,context);
	alexa.registerHandlers(Handler);
	alexa.execute();
}
