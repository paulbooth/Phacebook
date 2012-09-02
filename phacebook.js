var apiKey = '363584837051315';
var secretKey = '3672c2b90cfbec3ad232978a94451617';
//var access_token = null; // For Facebook
//var my_user = null; // The current Facebook user, so we don't request a bunch

var argv = process.argv;
var https = require('https');

var hostUrl = 'http://thepaulbooth.com:3000';

var express = require('express'),
    app = express();

app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

var MemoryStore = require('connect').session.MemoryStore;
app.use(express.cookieParser());
app.use(express.session({ secret: "phacebook", store: new MemoryStore({ reapInterval:  60000 * 10 })}));

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
        req.session = {access_token: output.replace(/access_token=/,"").replace(/&expires=\d+$/, "")};

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
        req.session = { user:JSON.parse(output), access_token: req.session.access_token};
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
  var locals = {name: my_user.name, access_token: req.session.access_token}
  console.log("user:")
  console.log(JSON.stringify(my_user, undefined, 2));
  console.log(req.session.access_token);
  res.render('index.jade', locals);
  //res.send("CHATTING IT UP, " + my_user.name + ", with: <ul><li>" + ONLINE.join('</li><li>') + '</li></ul>');
});


app.listen(3000);
