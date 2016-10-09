let uuid = require('node-uuid');

function UUIDGeneratorResource(resource) {
    this.resource = resource;
}

UUIDGeneratorResource.prototype.query = function(req) {
    if(req.kind == "create") {
        req.data.id = uuid.v1();
    }
    return this.resource.query(req);
}

UUIDGeneratorResource.prototype.get_relationships = function() {
    return this.resource.get_relationships ? this.resource.get_relationships() : {};
}

module.exports = function(resource) {
    return new UUIDGeneratorResource(resource);
}
