const express = require('express'),
	  path = require('path'),
	  favicon = require('serve-favicon'),
	  logger = require('morgan'),
	  cookieParser = require('cookie-parser'),
	  bodyParser = require('body-parser'),
	  mongoose = require('mongoose'),
	  passport = require('passport'),
	  LocalStrategy = require('passport-local').Strategy,
	  routes = require('./routes/index'),
	  users = require('./routes/users'),
	  app = express(),
	  Account = require('./models/account');

mongoose.Promise = require('bluebird');

// view engine setup
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');
// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(express.static(__dirname + '/public'));
app.use('/', routes);

// passport config
passport.use(new LocalStrategy(Account.authenticate()));

// mongoose
mongoose.connect('mongodb://localhost/trycatch');

// catch 404 and forward to error handler
app.use(function notFoundHandler(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function devErrorHandler(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function productionErrorHandler(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});


module.exports = app;
