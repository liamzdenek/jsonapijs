let Protector = require('./Protector.js');

function RBAC(builder) {
    this.role_storage_resource  = builder._role_storage_resource;
}

RBAC.prototype.protect = function() {
    return new Protector()
        .role_storage_resource(this.role_storage_resource);
}

function RBACBuilder() {}

RBACBuilder.prototype.role_storage_resource = function(resource) {
    this._role_storage_resource = resource;
    return this;
}

RBACBuilder.prototype.build = function() {
    return new RBAC(this);
}

module.exports = function() { return new RBACBuilder(); };
