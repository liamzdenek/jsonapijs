"use strict";

var Promise = require("bluebird");
var Exception = require("./exception.js");

function Arena(config, req, rep) {
    this.config = config;
    this.req = req;
    this.rep = rep;
    this.requests = [];
    this.after = [];
}

Arena.prototype.push_after = function(cb) {
    this.after.push(cb);
}

Arena.prototype.push_request = function(req) {
    if(!Object.getPrototypeOf(req) == "Request") {
        throw "pushRequest only accepts instances of Request";
    }
    let promise = this.check_and_mark(req)
    if(promise == null && req.promise == null) {
        throw "check_and_mark returned null"
    }
    if(req.promise == null) {
        req.promise = promise;
    }
    req.has_iterated = false;
    console.log("Pushing new request ", req, promise);
    this.requests.push(req);
    return promise;
}

Arena.prototype.resolve = function() {
    let ret = this._resolve()
    let afters = function() {
        if(this.has_looped_after) { // TODO: afters is called 3 times on create posts and i dont know why
            return;
        }
        this.has_looped_after = true;
        console.log("Looping through after: ", this.after);
        let new_promises = [];
        this.after.forEach(function(func) {
            console.log("CALLING AFTER: ", func);
            let new_promise = func(ret);
            if(new_promise) {
                new_promises.push(new_promise);
            }
        })

        if(new_promises.length != 0) {
            return Promise.all(new_promises).then(ret);
        }

        return ret;
    }.bind(this);
    return ret.then(afters, afters);
}

Arena.prototype._resolve = function() {
    //this.sanity_check(); // ensure that every dependency is in requests
    
    //console.log("Resolving REQs", this.requests);
    let promises = [];
    for(let i = 0; i < this.requests.length; i++) {
        try {
            if(!this.requests[i].has_iterated) {
                let promise = this.requests[i].promise;
                promise = promise.catch(function(err) {
                    console.log("Caught error", err);
                    return Promise.reject(err); 
                });

                promises.push(promise);
                this.requests[i].has_iterated = true;
            }
        } catch(e) {
            return Promise.reject(e);
        }
    }
    console.log("PROMISES: ", promises);
    
    if(promises.length == 0) {
        return Promise.resolve();
    }
    
    return Promise.all(promises)
        .then(function() {
            return this.resolve()
        }.bind(this));
}

Arena.prototype.check_and_mark = function(req) {
    // TODO: check dependencies
    if("promise" in req && req["promise"] != null) {
        return null;
    }


    if(req.dependencies) {
        for(let i in req.dependencies.include) {
            let relationship_name = req.dependencies.include[i];
            let relationship = this.config.get_relationship_by_resource(req.resource, relationship_name);
            if(!relationship) {
                req.promise = Promise.reject(Exception()
                    .status(400)
                    .title("Relationship "+relationship_name+" does not exist")
                .build());
                return req.promise
            }
        }

        for(let relationship_name in req.dependencies.children) {
            if(req.dependencies.include.includes(relationship_name)) {
                continue;
            }
            let relationship = this.config.get_relationship_by_resource(req.resource, relationship_name);
            if(!relationship) {
                req.promise = Promise.reject(Exception()
                    .status(400)
                    .title("Relationship "+relationship_name+" does not exist")
                .build());
                return req.promise
            }
        }
    }


    let resource = this.config.get_resource(req.resource);

    req.arena = this;

    req.promise = resource.query(req);

    if(!req.promise) {
        return Promise.reject(Exception()
            .status(500)
            .title("Resource "+req.resource+" .query() returned "+req.promise+" for "+req.kind+" -- expected promise")
        .build());
    }

    req.promise = req.promise.then(function(result){
        console.log("Req then: ", result);
        req.response = result;

        let rels = req.get_relationships();
        console.log("RELS: ", rels);
        for(let relationship_name in rels) {
            rels[relationship_name].denote(this, req, relationship_name);
        }

        if(req.dependencies) {
            for(let i in req.dependencies.include) {
                let relationship_name = req.dependencies.include[i];
                let relationship = this.config.get_relationship_by_resource(req.resource, relationship_name);
                console.log("Handling relationship", relationship_name);
                relationship.include(this, req, relationship_name);
            }

            for(let relationship_name in req.dependencies.children) {
                if(req.dependencies.include.includes(relationship_name)) {
                    continue;
                }
                let relationship = this.config.get_relationship_by_resource(req.resource, relationship_name);
                relationship.include(this, req, relationship_name);

            }
        }

        if(req.origin) {
            req.origin.relationship.back_propegate(this, req.origin.request, req, req.origin.relationship_name);
        }
        return result;
    }.bind(this));

    return req.promise;
}

Arena.prototype.get_output = function(res) {
    let data = []; // may be a singular item, no guarantees
    let included = [];

    let promises = [];
    for(let i in this.requests) {
        promises.push(this.requests[i].promise)
    }

    console.log("Output requests", this.requests);

    let err_handler = function(err) {
        console.log("Got err: ", err);
        if(err instanceof Error) {
            return Promise.resolve({meta:{error: {
                name: err.name,
                message: err.message,
                stack: err.stack,
            }}});
        } else if(err.constructor.name == "Exception") {
            if(err && err.status) {
                res.status(err.status);
            }
            return Promise.resolve({errors: [
                err
            ]});
        } else if(Array.isArray(err) && err.length != 0 && err[0].constructor.name == "Exception") {
            if(err[0].status) {
                res.status(err[0].status);
            }
            return Promise.resolve({errors: err})
        }
        return Promise.resolve({errors: [
            {"title": err},
        ]})
    };

    //console.log("PRE THEN: ", promises);

    return Promise.all(promises).then(function(then) {
        //console.log("GOT THEN: ", then);
        for(let i in this.requests) {
            let request = this.requests[i];
            request.filter_fields(this.config);
            if(request.should_output) {
                if(request.is_singular) {
                    data = request.response[0] || null;
                } else if(Array.isArray(request.response)) {
                    data = data.concat(request.response);
                } else {
                    data.push(request.response);
                }
            }

            if(request.should_included) {
                if(Array.isArray(request.response)) {
                    included = included.concat(request.response);
                } else {
                    included.push(request.response);
                }
            }
        }
        let obj = {
            data: data,
        }
        if(included.length > 0) {
            obj.included = included
        }
        console.log("Sending output", obj);
        return Promise.resolve(obj);
    }.bind(this), err_handler).catch(err_handler);
}

module.exports = function(config) {
    return new Arena(config)
}
