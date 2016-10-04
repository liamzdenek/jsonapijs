var express = require('express')
    ,port = process.env.PORT || 3000
    ,ja = require('./../../lib/')
    ;

var app = express();

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
    config.push_relationship("cats", "owner", ja.IdByLocalField().resource_name("people").field_name("owner_id").build());
}
{
    config.push_relationship("people", "posts", ja.IdByForeignField().field_name("author_id").resource_name("posts").build());
}
{
    config.push_relationship("people", "pets", ja.IdByForeignField().field_name("owner_id").resource_name("cats"));
}

ja.Routes(config, app);

app.listen(port, function() {
    console.log("Listening");
});

module.exports = {
    app: app,
    config: config,
    URL: "http://localhost:3000",
}
