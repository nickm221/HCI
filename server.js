// We first require our express package
var express = require('express');
var bodyParser = require('body-parser');
var userData = require('./data.js');
var bcrypt = require("bcrypt-nodejs");
var cookieParser = require('cookie-parser')
// This package exports the function to create an express instance:
var app = express();

// We can setup Jade now!
app.set('view engine', 'ejs');

// This is called 'adding middleware', or things that will help parse your request
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());
// This middleware will activate for every request we make to 
// any path starting with /assets;
// it will check the 'static' folder for matching files 
app.use('/assets', express.static('static'));

// Setup your routes here!

var authenticate = function(request, response, next) {
	var sessId = request.cookies["sessID"];
	
	if (sessId == undefined)
	{
		response.render("pages/login", { pageTitle: "iBowl is an aplication that can be used to track your bowling progress.  Keep track of your games' scores, statistics, and more to become a better bowler!" });
	} else 
	{
		userData.isLoggedIn(sessId).then(function(status) {
			if(status) {
				//console.log("here1");
				response.locals.user = status;
				next();
			}
			else {
				//console.log("here");
				response.render("pages/login", { pageTitle: "iBowl is an aplication that can be used to track your bowling progress.  Keep track of your games' scores, statistics, and more to become a better bowler!" });
			}
		});
	}
}


app.get("/", cookieParser(), authenticate, function (request, response) { 
		var sessId = request.cookies["sessID"]; 
		response.render("pages/scoreboard", { pageTitle: "Welcome ", username: "" }); //Should redirect to profile

});

app.get("/scoreboard", cookieParser(), authenticate, function (request, response) {
	var sessId = request.cookies["sessID"];
	response.render("pages/scoreboard", { pageTitle: "Welcome ", username: ""}); //Should redirect to profile

});

app.get("/home", function (request, response) {
    response.render("pages/home", { pageTitle: "Welcome Home" });
});

app.post("/login", function (request, response) {
	var username = request.body.username;
	var password = request.body.password;
	
	if(!username) {
		response.render("pages/login", { pageTitle: "Please enter a valid username." });
	}
	else if(!password) { 
		response.render("pages/login", { pageTitle: "Please enter a valid password." });
	}
	console.log("[*] Testing to see if username exists..");
	userData.validLogin(username).then(function(storedPass) {
		console.log("[*] Does username exist? storedPass = ", storedPass);
		var passwordsMatch = bcrypt.compareSync(password, storedPass);
		if (passwordsMatch === true) {
			//generate a new sessId 
			console.log("[*] Assigning New Session Id for ", username );
			userData.assignNewSessionId(username).then(function(newSessId) {	
				console.log("We just generated a session Id of: ", newSessId);
				//create a new cookie for the user and assign it the value of sessId
				//redirect the user to the scores page 
				response.cookie("sessID", newSessId);
				response.render("pages/scoreboard", { pageTitle: "Welcome, ", username: username}); //Should redirect to scoreboard
			});
		}
		else {
			response.render("pages/login", { pageTitle: "You have provided an invalid username and password.  Please try again." });
		}
	});
});

app.post("/signup", function (request, response) {
	var username = request.body.username;
	var password = request.body.password;
	
	if(!username) {
		response.render("pages/login", { pageTitle: "Please enter a valid username." });
	}
	else if(!password) {
		response.render("pages/login", { pageTitle: "Please enter a valid password." });
	}
	if(password.length < 5) {
		response.render("pages/login", { pageTitle: "Your password must be atleast 5 characters long." });
	}
	userData.userNameAlreadyExists(username).then(function(result) {
		if(result) {
			response.render("pages/login", { pageTitle: "This username already exists.  Please pick a different one." });
		}
		else {
			userData.createUser(username, password);
			response.render("pages/login", { pageTitle: "Thanks for signing up! You can now login below" });
		}
	});
});

app.post("/logout", cookieParser(), function (request, response) {
		var sessId = request.cookies["sessID"];
		//console.log("SESSIONID " ,sessId);
		userData.clearSessId(sessId);
		var anHourAgo = new Date();
		//console.log(anHourAgo);
		anHourAgo.setHours(anHourAgo.getHours() - 1);
		//console.log(anHourAgo);
		console.log("[*] Session ID has been Cleared...");
		response.cookie("sessID", "", { expire: anHourAgo });
		response.clearCookie("sessID");
		console.log("[*] Cookie has been Cleared...");
		console.log("[!] User has been logged out.");
		response.render("pages/login", { pageTitle: "You have been successfully logged out" });
});

// We can now navigate to localhost:3000
app.listen(3000, function () {
    console.log('Your server is now listening on port 3000! Navigate to http://localhost:3000 to access it');
});
