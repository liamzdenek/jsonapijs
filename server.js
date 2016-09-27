var express = require('express')
    ,bodyparser = require('body-parser')
    ,port = process.env.PORT || 3000
    ,RamResource = require('./resources/RamResource.js')
    ;

var app = express();

app.use( bodyparser.json() );

var config = require('./config.js')();

{
    let cats = RamResource();
    cats.push("cat1", {"asdf": "123"});
    cats.push("cat2", {"asdf": "223"});
    cats.push("cat3", {"asdf": "323"});
    cats.push("cat4", {"asdf": "423"});
    config.push_resource("cats", cats);
}
{
    let people = RamResource();
    people.push("person1", {"asdf": "123"});
    people.push("person2", {"asdf": "223"});
    people.push("person3", {"asdf": "323"});
    people.push("person4", {"asdf": "423"});
    config.push_resource("people", people);
}

require('./routes.js')(config, app);

app.listen(port, function() {
    console.log("Listening");
});
