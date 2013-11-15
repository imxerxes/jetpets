var config = {};

config.ask_about_social_networking = true;

config.twitter = {};

config.twitter.consumer_key = process.env.TWITTER_KEY || 'u3XVu0WLRHLfiHiAAOSl3A';
config.twitter.consumer_secret =  process.env.TWITTER_SECRET || 'R9TdcKXodHCJrwU6EYLkKxDxL3bwpYrWV1xK7MhsU';

module.exports = config;