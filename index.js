var Alexa = require('alexa-sdk');
var Twit = require('twit');

var T; 

var Handler = {
	'NewSession': function()
	{
		var alexa = this;

		T = new Twit({
			consumer_key: 'MrgT49viBzq4ZhCEECnUIL4r4',
			consumer_secret: '2LqSBOgl25fpoNjpbDn5vZTMshlXqZ0rSVWLQaP6QpSWoveKfc',
			app_only_auth: true
		});
		T.get('search/tweets', { q: 'JavaScript', count: 10}, function(err, data) {
			var tweets = data.statuses;
			for(var i = 0; i < tweets.length; i++) {
				console.log(tweets[i].text);
			}
			alexa.emit(':tell', "All done, bye bye.");
		});
	},
	'TwitterAnalysis': function()
	{
	},


}
exports.handler = function(event, context, callback) {
	var alexa = Alexa.handler(event,context);
	alexa.registerHandlers(Handler);
	alexa.execute();
}
