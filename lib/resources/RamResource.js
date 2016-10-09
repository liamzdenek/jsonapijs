var Request = require("./../request.js");
var Record = require("./../record.js");
var Promise = require("bluebird");
var Exception = require("./../exception.js");
var create_common = require("./create_common.js");
var update_common = require("./update_common.js");
var delete_common = require("./delete_common.js");

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
        } else if(req.kind == "delete") {
            return this.delete(req);
        }
        return Promise.reject(Exception()
            .status(500)
            .title("RamResource doesn't know how to handle query kind: "+req.kind)
        .build());
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
                return reject(Exception()
                    .status(409) // conflict
                    .title("already exists")
                .build());
            }
            if(!"id" in req.data || req.data.id == null) {
                return reject(Exception()
                    .status(403)
                    .title("this resource requires a client-generated ID")
                .build());
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
        if(req.data.id == null) {
            return Promise.reject(Exception()
                .status(403)
                .title("updates must include an id")
            .build());
        }

        if(!(req.data.id in data)) {
            return Promise.reject(Exception()
                .status(404)
                .title("Resource does not exist, cannot be updated")
            .build());
        }
        return update_common(req, function(resolve, reject) {

            if(req.data.id == req.data.document.id) {
                // attribte replacement
                req.arena.push_after(this.check_rollback_update.bind(null,req.data,JSON.parse(JSON.stringify(data[req.data.id]))));
                data[req.data.id] = Object.assign(data[req.data.id], req.data.document.attributes)
            } else {
                // Id reassignment
                req.arena.push_after(this.check_rollback_create.bind(null,data[req.data.document.id]));
                req.arena.push_after(this.check_rollback_update.bind(null,req.data.id,JSON.parse(JSON.stringify(data[req.data.id]))));
                data[req.data.document.id] = Object.assign(data[req.data.id], req.data.document.attributes);
                delete data[req.data.id];
            }
            resolve([
                Record()
                    .type(req.resource)
                    .id(req.data.document.id)
                    .attributes(req.data.document.attributes)
                .build()
            ]);
        }.bind(this));
    }.bind(this);

    this.check_rollback_update = function(req, state, promise) {
        promise.catch(function(data) {
            console.log("TODO: Rollback update "+data.stack);
            data[req.id] = state; 
        });
    }.bind(this)

    this.delete = function(req) {
        console.log("DELETE GOT REQ: ",req);
        if(!(req.data in data)) {
            return Promise.reject(Exception()
                .status(404)
                .title("No such record, cannot delete it")
            .build());
        }

        return delete_common(req, function(resolve, reject) {
            req.arena.push_after(this.check_rollback_update.bind(null, req, data[req.data]))
            delete data[req.data];
            resolve([]);
        }.bind(this));
    }.bind(this);
}

module.exports = function() {
    return new RamResource();
}
