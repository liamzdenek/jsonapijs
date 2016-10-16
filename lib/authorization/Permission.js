let Promise = require('bluebird');
let Request = require('./../request.js');
let Exception = require('./../exception.js');

function Permission(perm_node) {
    if(!perm_node) {
        throw "Permission requires the perm_node to be not null";
    }
    this.perm_node = perm_node;
}

Permission.prototype.append_req_kind = function() {
    return new PermissionMatcherBuilder()
        .perm_node(this.perm_node)
        .permute_node(function(matcher, req) {
                return matcher.perm_node+"."+req.kind
        })
    .build();
}

function PermissionMatcherBuilder() {
    this._perm_node = null;
    this._permute_node = null;
}

PermissionMatcherBuilder.prototype.perm_node = function(perm_node) {
    this._perm_node = perm_node;
    return this;
}

PermissionMatcherBuilder.prototype.permute_node = function(fn) {
    this._permute_node = fn;
    return this;
}

PermissionMatcherBuilder.prototype.build = function() {
    if(!this._perm_node) {
        throw "PermissionMatcherBuilder requires a perm_node";
    }
    return new PermissionMatcher(this);
}

function PermissionMatcher(builder) {
    this.perm_node = builder._perm_node;
    this.permute_node = builder._permute_node;
}

PermissionMatcher.prototype.check = function(protector, req) {
    let node = null;
    if(this.permute_node && typeof this.permute_node == "function") {
        node = this.permute_node(this, req);
    } else {
        node = this.perm_node;
    }

    let newreq = Request()
        .resource(protector.role_storage_resource)
        .kind("session_has_role")
        .data(node)
    .build();

    return req.arena.push_request(newreq).then(function(status) {
        if(!status) {
            return Promise.reject(Exception()
                .title("The RoleStorage could not find the role "+node)
            .build())
        }
        let realreq = req.clone();
        realreq.resource = protector.protected_resource;
        return req.arena.push_request(realreq).then(function(data) {
            return req.repair_type(data);
        });
    }.bind(this));
}

module.exports = function(perm_node) { return new Permission(perm_node); }
