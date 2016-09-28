var express = require('express')
    ,bodyparser = require('body-parser')
    ,port = process.env.PORT || 3000
    ,ja = require('./lib')
    ;

var app = express();

app.use( bodyparser.json() );

var config = ja.Config();

{
    let cats = ja.RamResource();
    cats.push("cat1", {"asdf": "123", "owner_id": "person1"});
    cats.push("cat2", {"asdf": "223", "owner_id": "person2"});
    cats.push("cat3", {"asdf": "323", "owner_id": "person3"});
    cats.push("cat4", {"asdf": "423", "owner_id": "person4"});
    config.push_resource("cats", cats);
}
{
    let people = ja.RamResource();
    people.push("person1", {"asdf": "123"});
    people.push("person2", {"asdf": "223"});
    people.push("person3", {"asdf": "323"});
    people.push("person4", {"asdf": "423"});
    config.push_resource("people", people);
}
{
    let posts = ja.RamResource();
    posts.push("1", {"body": "adfadfasdfasdfasdf", "author_id": "person1"});
    posts.push("2", {"body": "adfadfasdfasdfasdf", "author_id": "person1"});
    posts.push("3", {"body": "adfadfasdfasdfasdf", "author_id": "person1"});
    posts.push("4", {"body": "adfadfasdfasdfasdf", "author_id": "person1"});
    config.push_resource("posts", posts);
}
{
    config.push_relationship("cats", "owner", ja.LocalIdByField("owner_id", "people"));
}
{
    config.push_relationship("people", "posts", ja.ForeignIdByField("author_id", "posts"));
}

ja.Routes(config, app);

app.listen(port, function() {
    console.log("Listening");
});
