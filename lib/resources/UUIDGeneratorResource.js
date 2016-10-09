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

module.exports = function(resource) {
    return new UUIDGeneratorResource(resource);
}
