let Promise = require('bluebird');
let Exception = require('./../exception.js');

function Protector(builder) {
    this.session_resource = builder._session_resource;
    this.role_storage_resource = builder._role_storage_resource;
    this.protected_resource = builder._protected_resource;
    this.required = builder._required;
}

Protector.prototype.query = function(req) {
    // protector runs all of the required functions
    // if any one of them returns true, short circuit and forward the query to the protected resource
    let checks = [];
    for(let i in this.required) {
        let check = this.required[i].check(this, req);
        if(check){
            checks.push(check);
        }
    }
    return Promise.any(checks).then(function() {
        return this.protected_resource.query(req)
    }.bind(this), function(err) {
        return Promise.reject([
            Exception()
                .status(err[0] ? err[0].status || 403 : 403)
                .title("Authorization error: You do not have permission to execute this query. See next error.")
            .build(),
        ].concat(err[0]));
    });
}

function ProtectorBuilder() {
    this._required = [];
}

ProtectorBuilder.prototype.build = function() {
    if(!this._session_resource) {
        throw "Protector requires a session_resource";
    }
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

ProtectorBuilder.prototype.session_resource = function(resource) {
    this._session_resource = resource;
    return this;
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
