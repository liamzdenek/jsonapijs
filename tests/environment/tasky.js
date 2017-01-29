var express = require('express')
    ,port = process.env.PORT || 3000
    ,ja = require('./../../lib/')
    ,jauthe = require("./../../lib/authentication")
    ,jautho = require("./../../lib/authorization")
    ;

var app = express();

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});


var config = ja.Config();

var mysql = ja.MySQLResource()
    .connection_object({
        host: 'localhost',
        user: 'liam',
        password: '',
        database: "tasky",
    })
.build();

let users, orgs;
{
    users = mysql.table("user", "id");
	config.push_resource("users", users);
}
{
	orgs = mysql.table("org", "id");
	config.push_resource("orgs", orgs);
}
{
	let user__org__membership = mysql.table("user__org__membership", "id");
	config.push_resource("user__org__membership", user__org__membership);
	/*
	let rel = ManyToMany({
		src: "user",
		src_col: "id",
		resource: user__org__membership,
		resource_src_id: "user_id",
		resource_dst_id: "org_id",
		dst: "org",
		dst_col: "id"
	})
	config.push_relationship("users", "org"
	*/
	ja.ManyToMany(config, {
		src: "users",
		src_to_join_name: "org_join",
		join_to_dst_name: "org",
		src_id: "user_id",
		resource: "user__org__membership",
		dst_id: "org_id",
		dst_to_join_name: "user_join",
		join_to_src_name: "user",
		dst: "orgs"
	});
}
{
	let sessions = ja.RamResource();
    sessions.push("123e4567-e89b-12d3-a456-426655440000", {"user_type": "users", "user_id": "1"});

	let authentication = jauthe.AuthenticationResource()
		.default_user_finder("users", "email")
		.literal_password_checker("pw_hash")
		.session_resource(ja.UUIDGeneratorResource(sessions))
	.build();
	
	config.push_resource("session", authentication);
}
let rbac;
{
	let roles = mysql.table("user__role", "id");
	rbac = jautho.RBAC()
			.role_storage_resource(jautho.SimpleRoleStorage("session", roles))
	.build();
}
/*
{
    config.push_relationship("cats", "owner",
        ja.IdByLocalField()
            .resource_name("users")
            .field_name("owner_id")
            .required(true)
        .build()
    );
}
*/

ja.Routes(config, app);

app.listen(port, function() {
    console.log("Listening");
});

module.exports = {
    app: app,
    config: config,
    URL: "http://localhost:3000",
}
