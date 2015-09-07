var express = require('express');
var url = require('url');
var app = express();
var http = require('http').Server(app);
var dirname = '/Users/Pragya/Documents/fse/project-1';
var io = require('socket.io')(http);
var users = [];

// Make sure the database file exists, if not create one
var fs = require('fs');
var file = dirname + '/messages.db';
var exists = fs.existsSync(file);

// If the file is empty, sqlite will create it for us
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(file);

db.serialize(function() {
  if(!exists) {
    db.run("CREATE TABLE messages (username TEXT, message TEXT, timestamp TEXT)");
  }
});

app.use(express.static(dirname));

app.get('/', function(request, response){
   	response.redirect("/index.html");
});

// Login
io.on('connection', function(socket){
	console.log('socket connected ' + socket.id);
	// User entering
	socket.on('user entered', function(username) {
		console.log('user: ' + username);
		if (userIsLoggedIn(username)) {
			socket.emit('username error', 'This user is already logged in');
		} else {
			users.push({name: username, id: socket.id});
			db.all('SELECT * from messages ORDER BY timestamp', function(err, rows) {
				if(err !== null) {
      				console.log(err);
    			} else {
    				console.log(rows);
      				socket.emit('user validated', username, rows);
    			}
			});
		}
	});

	// Message sent
	socket.on('chat message', function(data) {
		console.log('message: ' + data.msg);
		data.name = getUserFromId(socket.id);
		var sqlRequest = "INSERT INTO 'messages' (username, message, timestamp) " +
               "VALUES('" + data.name + "', '" + data.msg + "', '" + data.timestamp + "')";
        db.run(sqlRequest);
		io.emit('chat message', data);
	});

	// Logout
	socket.on('logout', function(){
		logoutUser(socket.id);
		console.log('user disconnected ' + socket.id);
		socket.emit('logged out');
	});

	socket.on('disconnect', function(){
		logoutUser(socket.id);
		console.log('socket disconnected ' + socket.id);
		socket.emit('logged out');
	});
});

http.listen(3000, function(){
  console.log('listening on http://localhost:3000');
});

function userIsLoggedIn(username) {
	for (var i = 0; i < users.length; i++) {
		var user = users[i];
		if (user.name === username) {
			return true;
		}
	}
	return false;
}

function getUserFromId(socketId) {
	for (var i = 0; i < users.length; i++) {
		var user = users[i];
		if (user.id === socketId) {
			return user.name;
		}
	}
	return "";
}

/** Logout the user with given socket id
* Loop through users and filter out users who have the given socket id.
* 
*/
function logoutUser(socketId) {
	users = users.filter(function(user){
  		return (user.id != socketId);
	});
}