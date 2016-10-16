let Promise = require('bluebird');
let Exception = require('./../exception.js');

function Protector(builder) {
    this.role_storage_resource = builder._role_storage_resource;
    this.protected_resource = builder._protected_resource;
    this.required = builder._required;
}

Protector.prototype.query = function(req) {
    // protector runs all of the required functions
    // if any one of them returns true, short circuit and forward the query to the protected resource
    
    let check = function(i) {
        let failure = function(err) {
            return Promise.reject([
                Exception()
                    .status(err[0] ? err[0].status || 403 : 403)
                    .title("Authorization error: You do not have permission to execute this query. See next error.")
                .build(),
            ].concat(err[0] == undefined || Array.isArray(err) || typeof err == "string" || err.constructor.name == "Exception" ? err : err[0]));
        }.bind(this);

        if(!this.required[i]) {
            return Promise.reject("No Matcher provided explicit authorization or explicit failure");
        }

        let promise = this.required[i].check(this,req);

        if(!promise) {
            return check(i+1);
        }

        return promise.then(function(data) {
            if(data != null) {
                return data;
            }
            return check(i+1)//this.protected_resource.query(req)
        }, failure);
    }.bind(this)

    return check(0);
}

function ProtectorBuilder() {
    this._required = [];
}

ProtectorBuilder.prototype.build = function() {
    if(!this._role_storage_resource) {
        throw "Protector requires a role_storage_resource";
    }
    if(!this._protected_resource) {
        throw 'Protector requires a protected .resource'
    }
    if(!this._required || this._required.length == 0) {
        throw 'Protector requires a non-empty requirement set';
    }
    return new Protector(this);
}

ProtectorBuilder.prototype.role_storage_resource = function(resource) {
    this._role_storage_resource = resource;
    return this;
}

ProtectorBuilder.prototype.resource = function(resource) {
    this._protected_resource = resource;
    return this;
}

ProtectorBuilder.prototype.require = function(required) {
    if(!required) {
        throw ".require() expects argument to be not-null";
    }
    this._required.push(required);

    return this;
}

module.exports = ProtectorBuilder;
