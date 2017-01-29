let Request = require("../request.js");
let Exception = require("../exception.js");
let AuthenticationRelationship = require("./AuthenticationRelationship.js");

function AuthenticationResource(user_finder, password_checker, session_resource, relationship, field_filter, user_resource) {
    this.user_finder = user_finder;
    this.password_checker = password_checker;
    this.session_resource = session_resource;
    this.relationship = relationship;
    this.field_filter = field_filter;
    this.user_resource = user_resource;
}

AuthenticationResource.prototype.query = function(req) {
    if(req.kind == "get_by_ids" && req.data.length == 1 && req.data[0] == "mine") {
        return this.get_by_ids(req);
    } else if(req.kind == "create") {
        return this.create(req);
    } else if(req.kind == "delete") {
        return this.delete(req);
    } else if(req.kind == "get_session_user") {
        return this.get_session_user(req);
    }
    return Promise.reject(Exception()
        .status(400)
        .title("AuthenticationResouce only accepts POST /"+req.resource+" and GET/DELETE /"+req.resource+"/mine requests")
    .build());
}
AuthenticationResource.prototype.prepare_output = function(req, output) {
    for(let i in output) {
        let record = output[i];
        record.type = req.resource;
    }
    return output;
}
AuthenticationResource.prototype.will_mount = function(config) {
    this.field_filter.forEach(function(k) {
        config.exclude_field(this.user_resource, k);
    }.bind(this));
}
AuthenticationResource.prototype.get_session_user = function(req) {
    return this.get_by_ids(req)
}
AuthenticationResource.prototype.get_by_ids = function(req) {
    if(!req.arena.req.get("Authorization")) {
        return Promise.reject(Exception()
            .status(400)
            .title("Expected Authorization header to be non-empty")
        .build());
    }
    let auth_header = req.arena.req.get("Authorization").split(" ");
    if(auth_header.length != 2) {
        return Promise.reject(Exception()
            .status(400)
            .title("Expected Authentication header to contain exactly one space")
        .build());
    }
    if(auth_header[0] != "Bearer") {
        return Promise.reject(Exception()
            .status(400)
            .title("This API only accepts Authorization: Bearer ....")
        .build());
    }
    let id = auth_header[1];

    let newreq = Request()
        .resource(this.session_resource)
        .kind("get_by_ids")
        .data([id])
        .is_singular(true)
    .build();

    return req.arena.push_request(newreq).then(function(output) {
        console.log("SESSION RESOURCE: ", output);
        if(!Array.isArray(output)) {
            return Promise.reject(Exception()
                .status(500)
                .title("Resource sent AuthenticationResource an invalid response")
            );
        }
        if(output.length != 1) {
            // session cannot be found
            return Promise.resolve([]);
        }
        return this.prepare_output(req, output);
    }.bind(this), function(err) {
        console.log("SESSION ERROR: ", err);
        return Promise.reject(err);
    });
}

AuthenticationResource.prototype.create = function(req) {
    let tuser = null;
    return this.user_finder(req)
        .then(function(user) {
            tuser = user;
            return this.password_checker(req, user)
        }.bind(this))
        .then(function() {
            let newreq = Request()
                .resource(this.session_resource)
                .kind("create")
                .data({type: req.resource, attributes:{user_type: tuser.type, user_id: tuser.id}})
                .is_singular(true)
            .build();

            return req.arena.push_request(newreq).then(function(output) {
                if(!Array.isArray(output) || output.length != 1) {
                    return Promise.reject("Expected session creation resposne to return exactly one record");
                }
                return this.prepare_output(req, output);
            }.bind(this))
        }.bind(this));
}

AuthenticationResource.prototype.delete = function() {
    return Promise.reject("unimplemented");
}

AuthenticationResource.prototype.get_relationships = function() {
    //console.log("IN GET RELS: ", this.relationship);
    return {
        "logged_in_as": this.relationship,
    }
}

function AuthenticationResourceBuilder() {
    this.user_finder = null;
    this.user_resource = null;
    this.password_checker = null;
    this._password_field = null;
    this._username_field = null;
    this._session_resource = null;
    this._relationship = null; // defualt provided in build() 
}

AuthenticationResourceBuilder.prototype.default_user_finder = function(resource, field) {
    this.user_resource = resource;
    this._username_field = field;
    this.user_finder = function(req) {
        console.log("USER FINDER REQ: ", req);
        let newreq = Request()
            .resource(resource)
            .kind(field == "id" ? "get_by_ids" : "get_by_field_name")
            .data(field == "id" ? req.data.attributes[field] : {field_name: field, ids: [req.data.attributes[field]]})
            .is_singular(true)
        .build();

        console.log("NEWREQ: ", newreq);
        return req.arena.push_request(newreq).then(function(data) {
            console.log("FOUND USERS: ", data);
            if(!data || !data[0]) {
                return Promise.reject(Exception()
                    .status(400)
                    .title("Couldn't find user OR the password is incorect")
                    //.meta({debug: "actually user"})
                .build())
            }
            return data[0];
        });
    };
    return this;
}

AuthenticationResourceBuilder.prototype.literal_password_checker = function(field) {
    this._password_field = field;
    this.password_checker = function(req, user) {
        console.log("FIELD: ", field);
		if(user.attributes[field] == req.data.attributes['password']) {
            return Promise.resolve();
        }
        return Promise.reject(Exception()
            .status(400)
            .title("Couldn't find user OR the password is incorrect")
        	//.meta({debug: "actually password -- got: "+req.data.attributes[field]+" -- "+user.attributes[field]})
        .build());
    };
    return this;
}

//AuthenticationResourceBuilder.prototype.bcrypt_password_checker = function(field) {
//	this._password_field = field;
//	this.password_checker = function(req, user) {
//		var bcrypt = require('bcryptjs');
//		var salt = bcrypt.genSaltSync(10);
//		var hash = bcrypt.hashSync("B4c0/\/", salt);
//		if(user.attributes[field]
//	}
//}

AuthenticationResourceBuilder.prototype.session_resource = function(session_resource) {
    this._session_resource = session_resource;
    return this;
}

AuthenticationResourceBuilder.prototype.build = function() {
    if(this.user_finder == null || !this.password_checker) {
        throw "AuthenticationResource requires both a user_finder function and a password_checker function";
    }
    if(!this._session_resource) {
        throw "AuthenticationResource requires a session_resource to be provided";
    }
    if(!this._relationship) {
        this._relationship = AuthenticationRelationship()
            .type_attribute("user_type")
            .id_attribute("user_id")
        .build();
    }
    return new AuthenticationResource(this.user_finder, this.password_checker, this._session_resource, this._relationship, [this._password_field/*, this._username_field*/], this.user_resource);
}

module.exports = function() {
    return new AuthenticationResourceBuilder();
}
