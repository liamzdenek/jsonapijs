let Promise = require('bluebird');
let Request = require('./../request.js'); 

function SimpleRoleStorage(session_resource, roles_resource) {
    if(!session_resource) {
        throw "SimpleRoleStorage requires session_resource to be provided";
    }
    if(!roles_resource) {
        throw "SimpleRoleStorage requires roles_resource to be provided";
    }
    this.session_resource = session_resource;
    this.roles_resource = roles_resource;
}

SimpleRoleStorage.prototype.query = function(req) {
    if(req.kind == "session_has_role") {
        return this.session_has_role(req);
    }
    return Promise.reject("SimpleRoleStorage query unimplemented");
}

SimpleRoleStorage.prototype.session_has_role = function(req) {
    let get_session_req = Request()
        .resource(this.session_resource)
        .kind("get_session_user")
    .build();

    let desired = req.data;

    let check_match = function(db, needed) {
        let db_ = db.split(".");
        let needed_ = db.split(".");
        let i = 0;
        OUTER: for(let i = 0; i < Math.min(db_.length, needed_.length); i++) {
            let db_frag = db_[i];
            let needed_frag = needed_[i];
            if(db_frag == needed_frag) {
                continue;
            }
            let t = [[db_frag, needed_frag], [needed_frag, db_frag]];
            for(let j = 0; j < t.length; j++) {
                let a = t[j][0];
                let b = t[j][1];

                if(a == b) {
                    continue OUTER;
                }
                if(a == "*") {
                    continue OUTER;
                }
                let a_parts = a.split("*");
                if(b.substr(0, a_parts[0].length) != a_parts[0]) {
                    return false;
                }
                if(b.substr(a_parts[0].length+1) != a_parts[1]) {
                    return false;
                }
            };
        }
        return true;
    }

    return req.arena.push_request(get_session_req).then(function(user) {
        let session_id = user[0].id;
        let user_id = user[0].relationships["logged_in_as"].data.id;

        let get_perms_req = Request()
            .resource(this.roles_resource)
            .kind("get_by_field_name")
            .data({field_name: "user_id", ids: [user_id]})
        .build();

        return req.arena.push_request(get_perms_req).then(function(perms) {
            for(let i = 0; i < perms.length; i++) {
                let perm = perms[i];
                console.log("COMPARING: ", perm.attributes.node, desired);
                if(check_match(perm.attributes.node, desired)) {
                    console.log("EQUAL");
                    return Promise.resolve(true);
                } 
            }
            return Promise.resolve(false);
        }.bind(this));
    }.bind(this))
}

module.exports = function(session_resource, roles_resource) { return new SimpleRoleStorage(session_resource, roles_resource); }
