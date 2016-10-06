var Request = require("./../request.js");
var Record = require("./../record.js");
var Promise = require("bluebird");
var create_common = require("./create_common");

function RamResource() {
    var data = {};

    this.push = function(id, attributes) {
        data[id] = attributes;
    }

    this.query = function(req) {
        //console.log("RamResource got req: ", req);
        if(req.kind == "get_index") {
            return this.get_index(req);
        } else if(req.kind == "get_by_ids") {
            return this.get_by_ids(req);
        } else if(req.kind == "get_by_field_name" && req.data.field_name == "id") {
            req.data = req.data.ids;
            return this.get_by_ids(req);
        } else if(req.kind == "get_by_field_name") {
            return this.get_by_field_name(req);
        } else if(req.kind == "create") {
            return this.create(req);
        } else if(req.kind == "update") {
            return this.update(req);
        } else {
            return Promise.reject("RamResource doesn't know how to handle query kind: "+req.kind);
        }
    }.bind(this)

    this.get_index = function(req) {
        return new Promise(function(resolve, reject) {
            let result = [];
            for(k in data) {
                let datum = data[k];
                // the object may be manipulated and we dont want it to point to the true copy
                datum = JSON.parse(JSON.stringify(datum))
                result.push(
                    Record()
                        .type(req.resource)
                        .id(k)
                        .attributes(datum)
                        .build()
                );
            }
            resolve(result);
        });
        
    }.bind(this);

    this.get_by_ids = function(req) {
        return new Promise(function(resolve,reject) {
            let result = [];
            for(i in req.data) {
                let id = req.data[i];
                let datum = data[id];
                if(datum) {
                    // the object may be manipulated and we dont want it to point to the true copy
                    datum = JSON.parse(JSON.stringify(datum))
                    result.push(
                        Record()
                            .type(req.resource)
                            .id(id)
                            .attributes(datum)
                            .build()
                    );
                }
            }
            resolve(result);
        })
    }.bind(this);

    this.get_by_field_name = function(req) {
        return new Promise(function(resolve, reject) {
            let result = [];
            for(i in data) {
                let datum = data[i];
                if(req.data.ids.includes(datum[req.data.field_name])) {
                    // the object may be manipulated and we dont want it to point to the true copy
                    datum = JSON.parse(JSON.stringify(datum))
                    result.push(
                        Record()
                            .type(req.resource)
                            .id(i)
                            .attributes(datum)
                            .build()
                    );
                }
            }
            resolve(result);
        });
    }.bind(this);

    this.create = function(req) {
        return create_common(req, function(resolve, reject) {

            if(req.data.id != null && req.data.id in data) {
                return reject("already exists -- TODO: this needs to send 409 Conflict");
            }
            if(!"id" in req.data || req.data.id == null) {
                return reject("403 Forbidden, this resource requires a client-generated ID");
            }
            req.arena.push_after(this.check_rollback_create.bind(null,req))
            data[req.data.id] = JSON.parse(JSON.stringify(req.data.attributes));
            resolve([req.data]);
        }.bind(this))
    }.bind(this);

    this.check_rollback_create = function(req, promise) {
        promise.catch(function() {
            console.log("Running rollback: ", promise);
            delete data[req.id];
        })
    }.bind(this);

    this.update = function(req) {
        return new Promise(function(resolve, reject) {
            if(req.data.id == null) {
                return reject("403 Forbidden - updates must include an id");
            }

            if(!(req.data.id in data)) {
                return reject("404 Not Found -- resource does not exist, cannot be updated");
            }


            if(req.data.id == req.data.document.id) {
                req.arena.push_after(this.check_rollback_update.bind(null,req.data,JSON.parse(JSON.stringify(data[req.data.id]))));
                data[req.data.id] = Object.assign(data[req.data.id], req.data.document.attributes)
            } else {
                req.arena.push_after(this.check_rollback_create.bind(null,data[req.data.document.id]));
                req.arena.push_after(this.check_rollback_update.bind(null,req.data.id,JSON.parse(JSON.stringify(data[req.data.id]))));
                data[req.data.document.id] = Object.assign(data[req.data.id], req.data.document.attributes);
                delete data[req.data.id];
            }
            resolve([req.data.document]);

            /*
            let newreq = Request()
                .res)
            .build();*/

            //return req.arena.push_request();
        }.bind(this));
    }.bind(this);

    this.check_rollback_update = function(req, state, promise) {
        promise.catch(function(data) {
            console.log("TODO: Rollback update "+data.stack);
            data[req.id] = state; 
        });
    }.bind(this)
}

module.exports = function() {
    return new RamResource();
}
