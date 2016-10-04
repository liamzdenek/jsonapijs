var Record = require("./../record.js");
var Promise = require("bluebird");

function RamResource() {
    var data = {};

    this.push = function(id, attributes) {
        data[id] = attributes;
    }

    this.query = function(req) {
        console.log("RamResource got req: ", req);
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
        } else {
            throw "RamResource doesn't know how to handle query kind: "+req.kind;
        }
    }.bind(this)

    this.get_index = function(req) {
        console.log("get index");
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
        console.log("IN RamResource Create");
        return create_common(req, function(resolve, reject) {
            console.log("got req: ", req);

            if(req.data.id != null && req.data.id in data) {
                reject("already exists -- TODO: this needs to send 409 Conflict");
                return;
            }
            if(!"id" in req.data || req.data.id == null) {
                return reject("403 Forbidden, this resource requires a client-generated ID");
            }
            req.arena.push_after(this.check_rollback.bind(null,req))
            data[req.data.id] = JSON.parse(JSON.stringify(req.data.attributes));
            resolve([req.data]);
        }.bind(this))
    }.bind(this);

    this.check_rollback = function(req, promise) {
        promise.catch(function() {
            console.log("Running rollback: ", promise);
            delete data[req.id];
        })
        console.log("Checking rollback: ", promise);
        console.log("Test", this)
    }.bind(this);
}

function create_common(req, save) {

    console.log("Arena config rels: ", req.arena.config.relationships);
    let relationships = req.get_relationships();
    console.log("Relationships: ", relationships);
    let promises = [];
    for(let i in relationships) {
        if(relationships[i].pre_save) {
            promises.push(relationships[i].pre_save(req));
        }
    }
    return Promise.all(promises)
        .then(function() {
            let promise = new Promise(save)
            return promise.then(function() {
                let promises = [];
                for(let i in relationships) {
                    if(relationships[i].post_save) {
                        promises.push(relationships[i].post_save(req));
                    }
                }
                return Promise.all(promises)
            }).then(function() { return promise; })
        })
}

module.exports = function() {
    return new RamResource();
}
