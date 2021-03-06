let Promise = require('bluebird');
let Request = require('./../request.js');
let Exception = require('./../exception.js');
let IncludeInstructions = require('./../includeinstructions.js');

function Relationship(rel_name) {
    if(!rel_name) {
        throw "relationship requires the rel_name argument to be not null";
    }
    this.rel_name = rel_name;
}

Relationship.prototype.matches_session_user = function() {
    return new RelationshipSessionUserMatcher(this.rel_name);
}


function RelationshipSessionUserMatcher(rel_name) {
    if(!rel_name) {
        throw "relationship requires the rel_name argument to be not null";
    }
    this.rel_name = rel_name;
}

RelationshipSessionUserMatcher.prototype.check = function(protector, req) {
    console.log("PROTECTOR: ", protector);
    console.log("PROTECTOR-REQ: ", req);

    if(req.kind.substr(0,3) != "get") {
        return null;
    }

    let newreq = Request()
        .resource(protector.session_resource)
        .kind("get_session_user")
        .is_singular(true)
        .output(false)
        .include(false)
    .build();

    let arenareq = req.arena.push_request(newreq);
    
    let realreq = req.clone();
    realreq.real_resource = realreq.resource;
    realreq.resource = protector.protected_resource;
    realreq.dependencies = req.dependencies || IncludeInstructions();
    realreq.dependencies.push_hidden(this.rel_name);
    realreq.should_output = false;
    realreq.should_include = false;
    realreq.never_output = true;
    req.arena.push_request(realreq);

    return Promise.all([arenareq, realreq.promise, realreq.after_rels.promise]).then(function(data) {
        let session_records = data[0];
        let resource_records = data[1];
        console.log("RESOURCE RECORDS: ", resource_records);
        let session_user = session_records[0].relationships["logged_in_as"].data; // TODO: get this not hardcoded
        for(let i = resource_records.length-1; i >= 0; i--) {
            let record = resource_records[i];
            let resource_user = record.relationships[this.rel_name].data;
            console.log("session_user", session_user);
            console.log("resource_user", resource_user);
            if(session_user.type != resource_user.type || session_user.id != resource_user.id) {
                console.log("DELETE: ", i);
                resource_records.splice(i,1);
            }
        }
        if(resource_records.length == 0) {
            return Promise.reject(Exception()
                .title("None of the requested records' ["+this.rel_name+"] relationship matches your session user")
            .build());
        }
        return Promise.resolve(req.repair_type(resource_records));
    }.bind(this));
}

module.exports = function(rel_name){ return new Relationship(rel_name); }
