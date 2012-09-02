var apiKey = '363584837051315';
var secretKey = '3672c2b90cfbec3ad232978a94451617';
//var access_token = null; // For Facebook
//var my_user = null; // The current Facebook user, so we don't request a bunch

var argv = process.argv;
var https = require('https');

var hostUrl = 'http://thepaulbooth.com:3000';

var express = require('express'),
    app = express();

// noduino stuff
var requirejs = require('requirejs');
requirejs.config({nodeRequire: require});



var MemoryStore = require('connect').session.MemoryStore;
app.use(express.cookieParser());
app.use(express.session({ secret: "phacebook", store: new MemoryStore({ reapInterval:  60000 * 10 })}));

app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

// First part of Facebook auth dance
app.get('/', function(req, res){
  var redirect_url = 'https://www.facebook.com/dialog/oauth?client_id=' + apiKey +
   '&redirect_uri=' + hostUrl + '/perms' +
   '&scope=publish_actions&state=authed'
  console.log("REDIRECTIN' From /")
  console.log(redirect_url);
  console.log("REQUEST HEADERS:" + JSON.stringify(req.headers));
  res.redirect(redirect_url);
});

// Second part of Facebook auth dance
app.get('/perms', function(req, res){
  var state = req.query['state'];
  var code = req.query['code'];
  // console.log("req.query:" + JSON.stringify(req.query))
  // console.log("hit /perms")
  // console.log("Code:");
  // console.log(code);
  if (state == 'authed') {
    console.log('sick. Facebook PERMED us.')
    var redirect_path = '/oauth/access_token?' +
    'client_id=' + apiKey +
    '&redirect_uri=' + hostUrl + '/perms' +
    '&client_secret=' + secretKey +
    '&code=' + code;// + '&destination=chat';
    var options = {
      host: 'graph.facebook.com',
      port: 443,
      path: redirect_path
    };

    https.get(options, function(fbres) {
      // console.log('STATUS: ' + fbres.statusCode);
      // console.log('HEADERS: ' + JSON.stringify(fbres.headers));
      var output = '';
      fbres.on('data', function (chunk) {
          output += chunk;
      });

      fbres.on('end', function() {
        // parse the text to get the access token
        req.session.access_token = output.replace(/access_token=/,"").replace(/&expires=\d+$/, "");

        // console.log("ACCESS TOKEN:" + access_token)
        res.redirect('/basicinfo');
      });
    }).on('error', function(e) {
      console.log('ERROR: ' + e.message);
    });
  } else {
    console.error("WHAT THE HECK WE AREN'T AUTHED?????? %s", state);
  }
});

// Gets the basic user info and redirects to the chat page
app.get('/basicinfo', function(req, res) {
  if (!req.session.access_token) {
    console.log("NO ACCESS TOKEN AT Basic info.")
    res.redirect('/'); // go home to start the auth process again
    return;
  }
  var options = {
      host: 'graph.facebook.com',
      port: 443,
      path: '/me?access_token=' + req.session.access_token
    };
  https.get(options, function(fbres) {
    // console.log('CHATSTATUS: ' + fbres.statusCode);
    //   console.log('HEADERS: ' + JSON.stringify(fbres.headers));

      var output = '';
      fbres.on('data', function (chunk) {
          //console.log("CHUNK:" + chunk);
          output += chunk;
      });

      fbres.on('end', function() {
        req.session.user = JSON.parse(output);
        res.redirect('/phacebook');
      });
  });
});

// The page for phacebook
app.get('/phacebook', function(req, res) {
  if (!req.session.access_token) {
    console.log("NO ACCESS TOKEN AT CHAT.")
    res.redirect('/'); // Start the auth flow
    return;
  }
  var locals = {name: req.session.user.name, access_token: req.session.access_token}
  console.log("user:")
  console.log(JSON.stringify(req.session.user, undefined, 2));
  console.log(req.session.access_token);
  if (req.session.tryingtopushbutton) {
    res.redirect('/buttonpush')
  } else {
    res.render('index.jade', locals);
  }
  //res.send("CHATTING IT UP, " + my_user.name + ", with: <ul><li>" + ONLINE.join('</li><li>') + '</li></ul>');
});

// we got a button push
app.get('/buttonpush', function(req, res) {
  console.log('trying button  push')
  if (!req.session.access_token) {
    console.log("NO ACCESS TOKEN AT button down.")
    req.session.tryingtopushbutton = true;
    res.redirect('/'); // Start the auth flow
    console.log("redirected away!");
    return;
  }
  req.session.tryingtopushbutton = false;
  var locals = {name: req.session.user.name, access_token: req.session.access_token}
  console.log("user:")
  console.log(JSON.stringify(req.session.user, undefined, 2));
  console.log(req.session.access_token);
  var options = {
      host: 'graph.facebook.com',
      port: 443,
      method: 'POST',
      path: '/me/thephantomphacebook:push?button=http://thepaulbooth.com:3000/objects/button.html&access_token=' + req.session.access_token
    };
  https.request(options, function(fbres) {
    // console.log('CHATSTATUS: ' + fbres.statusCode);
    //   console.log('HEADERS: ' + JSON.stringify(fbres.headers));

      var output = '';
      fbres.on('data', function (chunk) {
          //console.log("CHUNK:" + chunk);
          output += chunk;
      });

      fbres.on('end', function() {
        console.log('posted:');
        console.log(output);
      });
      fbres.on('err', function(err) {
        console.log('error');
        console.log(err);
      }
  });
  //res.send("CHATTING IT UP, " + my_user.name + ", with: <ul><li>" + ONLINE.join('</li><li>') + '</li></ul>');
});

// this breaks the server - need an arduino attached to server :(
// app.get('/connect', function(req, res) {

//   var LEDlist = [];

//   var buttonDown = function(){
//     LEDlist[0].setOn();
//     console.log("On!");
//   }

//   var buttonUp = function(){
//     LEDlist[0].setOff();
//   }

//   requirejs(['public/scripts/libs/Noduino', 'public/scripts/libs/Noduino.Serial', 'public/scripts/libs/Logger'], function (NoduinoObj, NoduinoConnector, Logger) {
//     var Noduino = new NoduinoObj({'debug': true, host: 'http://thepaulbooth.com:300'}, NoduinoConnector, Logger);
//     Noduino.connect(function(err, board) {
//       if (err) { return console.log(err); }

//       board.withLED({pin: 13}, function(err, LED) { LEDlist[0] = LED;});
//       board.withAnalogInput({pin:  'A0'}, function(err, AnalogInput) { 
//         AnalogInput.on('change', function(a) {
//           console.log(a);
//           if (a.value == 1023) {
//             //HACK: This is expecting a potentiometer changing signal between 0 and 1023
//             // Button just is an analog input with/without 5V for on/off
//             buttonDown();
//           } else {
//             buttonUp();
//           }
//         });
//       });
//     });
//   });

// });



console.log("starting server");
app.listen(3000);
console.log("that was cool");



