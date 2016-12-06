var MongoClient = require('mongodb').MongoClient,
 settings = require('./config.js'),
 Guid = require('guid'),
 bcrypt = require("bcrypt-nodejs");

var fullMongoUrl = settings.mongoConfig.serverUrl + settings.mongoConfig.database;
var exports = module.exports = {};

MongoClient.connect(fullMongoUrl)
    .then(function(db) {
        return db.createCollection("users");
    }).then(function (users) {
        
		//1.  Create a new User & insert them in the DB
		exports.createUser = function(username, password) {
            if (!username)  return Promise.reject("You must provide a username");
            if (!password)  return Promise.reject("You must provide a valid password");
			var encPass = bcrypt.hashSync(password);
			console.log("[*] Creating User Entry...");
            return users.insertOne({ _id: Guid.create().toString(), username: username, encryptedPassword: encPass, currentSessionId: null, scores: [] }).then(function(newDoc) {
                return newDoc.insertedId;
            });
        }
        

		
		//3.  Get a user by sessionID
		exports.getUserbySessId = function(sessId) {
			return users.find({ "currentSessionId": sessId }).limit(1).toArray().then(function(listOfUsers) {
                if (listOfUsers.length === 0) return Promise.reject("No Users found with session ID ", sessId);

                return listOfUsers[0].username;
            });
		}
		
		//4.  Get a user by username and password
		exports.getUserByUserAndPass = function(user, pass) {
			if(!user) return Promise.reject("No Users found with username ", user);
			if(!pass) return Promise.reject("No Users found with password ", pass);
			return users.find({ "username": user }).limit(1).toArray().then(function(listOfUsers) {
                if (listOfUsers.length === 0) return Promise.reject("This username does not exist.");
				
				var valid = bcrypt.compareSync(pass, listOfUsers[0].encryptedPassword);
				if(valid == false) return Promise.reject("The user entered an invalid password.");
				
                return listOfUsers[0];
            });	
		}
		
		//5.  Check to see if a username already exists in the DB
		exports.userNameAlreadyExists = function(user) {
			 return users.find({ username: user }).limit(1).toArray().then(function(listOfUsers) {
                if (listOfUsers.length === 0) return false;

                return true;
            });
		}
		
		//6.  Assign a user a new sessionID by username
		exports.assignNewSessionId = function(user) {
			if(!user) Promise.reject("You must provide a valid username.");
			users.updateOne({ username: user }, { $set: {"currentSessionId": Guid.create().toString()} });
			return users.find({ username: user }).limit(1).toArray().then(function(listOfUsers) {
                if (listOfUsers.length === 0) Promise.reject("User not found.");
				
                return listOfUsers[0].currentSessionId;
            });
		}
		
		//7.  Check to see if a user provided a known username, if so: return the hashed password.
		exports.validLogin = function(username) { 
			return users.find({ username: username }).limit(1).toArray().then(function(listOfUsers) {
                if (listOfUsers.length === 0) Promise.reject("Invalid Credentials.");
				
				return listOfUsers[0].encryptedPassword;
			});
		}
		
		//10.  Clear Session ID for Log out
		exports.clearSessId = function(sessId) {
			if(!sessId) Promise.reject("You must provide a valid sessionID.");
			return users.updateOne({ currentSessionId: sessId }, { $set: {"currentSessionId": undefined} });
        }		
		
		//11. is a user logged in?
		exports.isLoggedIn = function(sessId) {
			if (sessId == undefined)
			{
				return Promise.reject("You msut provide a valid sessionID.");
			}
			return users.find({ currentSessionId: sessId }).limit(1).toArray().then(function(listOfUsers) {
                if(listOfUsers.length === 0) return false;
                
				return true;
			});
		}
    });
