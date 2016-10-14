function SimpleRoleStorage(resource) {
    this.resource = resource;
}

SimpleRoleStorage.prototype.query = function(req) {
    return Promise.reject("SimpleRoleStorage query unimplemented");
}

module.exports = function() { return new SimpleRoleStorage(); }
