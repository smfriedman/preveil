
var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;
var vision = require('@google-cloud/vision')({
  projectId: 'washuhackaton',
  keyFilename: 'hackKey.json'
});

blacklist_dictionary = {}; 
var cur_index = 0; 

var unirest = require("unirest");

var Disorders_Collection = "Disorders";
var Blacklist_Collection = "Blacklist"; 

var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect('mongodb://hack:hack@ds161475.mlab.com:61475/disorders', function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });

  db.collection(Blacklist_Collection).find({}).toArray(function (err, result) {
for (i = 0; i < result.length; i++){
	curr_index = result[i].assoc_id; 
	if (blacklist_dictionary[result[i].assoc_id] == undefined)
			{
			blacklist_dictionary[result[i].assoc_id] = [];
			}
			blacklist_dictionary[result[i].assoc_id].push(result[i].word); 
			var req = "https://wordsapiv1.p.mashape.com/words/" + result[i].word+"/synonyms"; 
			unirest.get(req).header("X-Mashape-Key", "Nc1aRmyqNMmshbNnO1R8JLcveWkyp1zPQsPjsntEh0rRyWomN3").header("Accept", "application/json").end(function (result) {
  				if (result.status == 200){
          console.log("status " + result.body);
          console.log("synonyms " + result.body.synonyms);
          if (result.body.synonyms != undefined){
            console.log(result.body.synonyms);  
           // console.log("s" + s); 
           var s = result.body.synonyms; 
          for (var j = 0; j<s.length; j++){
            console.log("si" + s[j]); 
  	blacklist_dictionary[curr_index].push(s[j]);
  }
}
}
	}); 

}
	console.log(blacklist_dictionary); 
}); 
});




// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

// Disorders API Routes


app.get("/Disorders", function(req, res) {
  console.log(blacklist_dictionary); 
	db.collection(Disorders_Collection).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get Disorders.");
    } else {
      res.status(200).json(docs);
    }
  });
});


app.get("/Blacklist/:id", function(req, res) { //get all blacklist words for disorder based on ID
	 db.collection(Blacklist_Collection).find({ assoc_id: parseInt(req.params.id) }).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get Blacklist.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/check", function(req, res) { //check if picture is match
	 var is_match = false;
	var images = [req.query.url]; 
	var returned = false; 
	var sensitivity = 100; 
	if (req.query.sensitivity !=undefined){
		sensitivity = req.query.sensitivity; 
	}
	if (req.query.background_url != undefined){
		images.push(req.query.background_url); 
	}
	else {
		images.push('https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_Blank.svg'); //temp- push blank object
	}
	console.log(images); 

	vision.detectLabels(images, {verbose: true}, function (err, labels) {
    if (err) {
      return err;
    } 
    var disorder = blacklist_dictionary[req.query.disorder_id]; 
    
    var matches = []; 
    console.log(labels); 
    
    for (var i = 0; i< labels.length; i++){
    	console.log(labels[i]); 
    	for (var k = 0; k<labels[i].length; k++){
    	for (var j = 0; j<disorder.length; j++){
			if (labels[i][k].desc.toLowerCase() == disorder[j].toLowerCase()){
				if (labels[i][k].score>(100-sensitivity)){
				matches.push(labels[i]); 
				is_match = true; 
			}
    		}
    	}
    	}
	}
    
    }); 
    

  vision.detectSafeSearch(images, { verbose: true }, function(err, safeSearch, apiResponse) {
  if (err){
  	return err; 
  }

  console.log(safeSearch); 
  
for (var i = 0; i<safeSearch.length; i++){
	var v = safeSearch[i].violence; 
	console.log(v); 
  if (v=="POSSIBLE" || v == "LIKELY" || v == "VERY_LIKELY"){
  	is_match = true; 
  	
  }
}
  res.status(200).json({"is_match": is_match, "id": req.query.pic_id});
});


	 
});



function detectLabels (inputFile, id, callback) {
  // Make a call to the Vision API to detect the labels
  //vision.detectLabels(inputFile, { verbose: true }, function (err, labels) { //NOTE: this also returns score!!!
  	vision.detectLabels(inputFile, function (err, labels) {
    if (err) {
      return callback(err);
    }
    var disorder = blacklist_dictionary[id]; 
    console.log(disorder); 
    var matches = []; 
    var labels = false; 
    for (var i = 0; i< labels.length; i++){
    	for (var j = 0; j<disorder.length; j++){
		if (labels[i].toLowerCase() == disorder[j].toLowerCase()){
			matches.push(labels[i]); 
			labels = true; 
		}
    }
    }
    console.log('result:', JSON.stringify(labels, null, 2));
    console.log('matches:', matches); 
    callback(null, labels);
  });
}





