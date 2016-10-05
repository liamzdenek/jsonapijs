"use strict";

var Promise = require("bluebird");

function Arena(config) {
    this.config = config;
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
    console.log("Pushing new request ", req);
    let promise = this.check_and_mark(req)
    req.promise = promise;
    req.has_iterated = false;
    this.requests.push(req);
    return promise;
}

Arena.prototype.resolve = function() {
    let ret = this._resolve()
    let afters = function() {
        console.log("Looping through after: ", this.after);
        for(let i in this.after) {
            this.after[i](ret);
        }
    }.bind(this);
    ret.then(afters, afters);
    return ret;
}

Arena.prototype._resolve = function() {
    //this.sanity_check(); // ensure that every dependency is in requests
    
    console.log("Resolving REQs", this.requests);
    let promises = [];
    for(let i = 0; i < this.requests.length; i++) {
        try {
            if(req.has_iterated) {
                let promise = this.requests[i].promise;
                promise = promise.catch(function(err) {
                    console.log("Caught error", err);
                    return Promise.reject(err); 
                });

                promises.push(promise);
            }
        } catch(e) {
            return Promise.reject(e);
        }
    }
    
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
                req.promise = Promise.reject("Relationship "+relationship_name+" does not exist");
                return req.promise
            }
        }

        for(let relationship_name in req.dependencies.children) {
            if(req.dependencies.include.includes(relationship_name)) {
                continue;
            }
            let relationship = this.config.get_relationship_by_resource(req.resource, relationship_name);
            if(!relationship) {
                req.promise = Promise.reject("Relationship "+relationship_name+" does not exist");
                return req.promise
            }
        }
    }


    let resource = this.config.get_resource(req.resource);

    req.arena = this;

    req.promise = resource.query(req).then(function(result){
        console.log("Req then: ", result);
        req.response = result;

        if(req.dependencies) {
            for(let i in req.dependencies.include) {
                let relationship_name = req.dependencies.include[i];
                let relationship = this.config.get_relationship_by_resource(req.resource, relationship_name);
                console.log("Handling relationship", relationship_name);
                relationship.handle(this, req, relationship_name);
            }

            for(let relationship_name in req.dependencies.children) {
                if(req.dependencies.include.includes(relationship_name)) {
                    continue;
                }
                let relationship = this.config.get_relationship_by_resource(req.resource, relationship_name);
                relationship.handle(this, req, relationship_name);

            }
        }

        if(req.origin) {
            req.origin.relationship.back_propegate(this, req.origin.request, req, req.origin.relationship_name);
        }
        return result;
    }.bind(this));

    return req.promise;
}

Arena.prototype.get_output = function() {
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
        }

        return Promise.resolve({meta:{error: err}})
    };

    console.log("PRE THEN: ", promises);

    return Promise.all(promises).then(function(then) {
        console.log("GOT THEN: ", then);
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
