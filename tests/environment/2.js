var express = require('express')
    ,port = process.env.PORT || 3000
    ,ja = require('./../../lib/')
    ,jautho = require("./../../lib/authorization")
    ;

var app = express();

var config = ja.Config();

var mysql = ja.MySQLResource()
    .connection_object({
        host: 'localhost',
        user: 'root',
        password: '',
        database: "ja",
    })
.build();

{
    let cats = ja.RamResource();
    cats.push("cat1", {"asdf": "123", "owner_id": "1"});
    cats.push("cat2", {"asdf": "223", "owner_id": "2"});
    cats.push("cat3", {"asdf": "323", "owner_id": "3"});
    cats.push("cat4", {"asdf": "423", "owner_id": "4"});
    config.push_resource("cats", cats);
}
{
    let users = ja.RamResource();
    users.push("1", {"asdf": "123"});
    users.push("2", {"asdf": "223"});
    users.push("3", {"asdf": "323"});
    users.push("4", {"asdf": "423"});
    config.push_resource("users", users);
}
{
    let authorization = jautho.AuthorizationResource()
    
    .build();

    config.push_resource("session", authorization);
}
{
    config.push_relationship("cats", "owner",
        ja.IdByLocalField()
            .resource_name("users")
            .field_name("owner_id")
            .required(true)
        .build()
    );
}
{
    config.push_relationship("users", "pets",
        ja.IdByForeignField()
            .field_name("owner_id")
            .resource_name("cats")
        .build()
    );
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