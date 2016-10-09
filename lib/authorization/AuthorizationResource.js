let Exception = require("../exception.js");

function AuthorizationResource() {
    this._blank = false;
}

AuthorizationResource.prototype.query = function(req) {
    if(req.kind == "get_by_ids" && req.data.length == 1 && req.data[0] == "mine") {
        return this.get_by_ids(req);
    } else if(req.kind == "create") {
        return this.create(req);
    } else if(req.kind == "delete") {
        return this.delete(req);
    }
    return Promise.reject(Exception()
        .status(400)
        .title("AuthorizationResouce only accepts POST /"+req.resource+" and GET/DELETE /"+req.resource+"/mine requests")
    .build());
}

AuthorizationResource.prototype.get_by_ids = function(req) {
    return Promise.reject("unimplemented");
}

AuthorizationResource.prototype.create = function(req) {
    return Promise.reject("unimplemented");
}

function AuthorizationResourceBuilder() {
    this._blank = false;
}

AuthorizationResourceBuilder.prototype.build = function() {
    return new AuthorizationResource();
}

module.exports = function() {
    return new AuthorizationResourceBuilder();
}
