let Request = require("../request.js");
let Exception = require("../exception.js");

function AuthorizationResource(user_finder, password_checker) {
    this.user_finder = user_finder;
    this.password_checker = password_checker;
}

AuthorizationResource.prototype.query = function(req) {
    if(req.kind == "get_by_ids" && req.data.length == 1 && req.data[0] == "mine") {
        return this.get_by_ids(req);
    } else if(req.kind == "create") {
        return this.create(req);
    } else if(req.kind == "delete") {
        return this.delete(req);
    }
    return Promise.reject(Exception()
        .status(400)
        .title("AuthorizationResouce only accepts POST /"+req.resource+" and GET/DELETE /"+req.resource+"/mine requests")
    .build());
}

AuthorizationResource.prototype.get_by_ids = function(req) {
    return Promise.reject("unimplemented");
}

AuthorizationResource.prototype.create = function(req) {
    return this.user_finder(req)
        .then(function(user) {
            return this.password_checker(req, user)
        }.bind(this))
        .then(function() {
            return Promise.reject("TODO: generate a session");
        });
}

function AuthorizationResourceBuilder() {
    this.user_finder = null;
    this.password_checker = null;
}

AuthorizationResourceBuilder.prototype.default_user_finder = function(resource, field) {
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

AuthorizationResourceBuilder.prototype.literal_password_checker = function(field) {
    this.password_checker = function(req, user) {
        if(user.attributes[field] == req.data.attributes[field]) {
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

AuthorizationResourceBuilder.prototype.build = function() {
    if(this.user_finder == null || !this.password_checker) {
        throw "AuthorizationResource requires both a user_finder function and a password_checker function";
    }
    return new AuthorizationResource(this.user_finder, this.password_checker);
}

module.exports = function() {
    return new AuthorizationResourceBuilder();
}
