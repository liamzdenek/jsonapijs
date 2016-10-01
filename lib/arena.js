function Arena(config) {
    this.config = config;
    this.requests = [];
}

Arena.prototype.push_request = function(req) {

    if(!Object.getPrototypeOf(req) == "Request") {
        throw "pushRequest only accepts instances of Request";
    }
    this.requests.push(req);
}

Arena.prototype.resolve = function() {
    //this.sanity_check(); // ensure that every dependency is in requests
    return new Promise(function(resolve, reject) {
        console.log("Resolving ", this.requests);
        let promises = [];
        for(let i in this.requests) {
            let promise = this.check_and_mark(this.requests[i]);
            if(!promise) {
                promises.push(promise);
            }
        }
        if(promises.len > 0) {
            console.log("PROMISE ALL: ", promises);
            Promise.all(promises).then(function() {
                console.log("PROMISE ALL COMPLETE");
                this.resolve().then(function() {
                    resolve();
                });
            })
        } else {
            resolve();
        }
    }.bind(this));
}

Arena.prototype.is_resolved = function() {
    for(var i in this.requests) {
        if(!this.requests[i].response) {
            return false;
        }
    }
    return true;
}

Arena.prototype.check_and_mark = function(req) {
    // TODO: check dependencies
    console.log(req);
    if(req.promise) {
        return req.promise;
    }

    let resource = this.config.get_resource(req.resource);

    req.promise = resource.query(req).then(function(result){
        req.response = result;

        for(let i in req.dependencies.include) {
            let relationship_name = req.dependencies.include[i];
            let relationship = this.config.get_relationship_by_resource(req.resource, relationship_name);
            if(!relationship) {
                throw "Relationship "+relationship_name+" does not exist";
            }
            relationship.handle(this, req, relationship_name);
        }

        for(let relationship_name in req.dependencies.children) {
            if(req.dependencies.include.includes(relationship_name)) {
                continue;
            }
            let relationship = this.config.get_relationship_by_resource(req.resource, relationship_name);
            if(!relationship) {
                throw "Relationship "+relationship_name+" does not exist";
            }
            relationship.handle(this, req, relationship_name);

        }

        if(req.origin) {
            req.origin.relationship.back_propegate(this, req.origin.request, req, req.origin.relationship_name);
        }

        return data;
    }, function(err) {
        throw "TODO: "+err
    });

    return req.promise;
}

Arena.prototype.get_output = function() {
    let data = []; // may be a singular item, no guarantees
    let included = [];

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
    return obj;
}

module.exports = function(config) {
    return new Arena(config)
}
