let Request = require("../request.js");
let Exception = require("../exception.js");
let AuthenticationRelationship = require("./AuthenticationRelationship.js");
let bcrypt = require('bcryptjs');

function BcryptResource(field, resource) {
	this.resource = resource;
	this.field = field;
}

BcryptResource.prototype.query = function(req) {
	if(req.kind == "create") {
		return this.create(req);
	}
	return this.resource.query(req);
}

BcryptResource.prototype.create = function(req) {
	var salt = bcrypt.genSaltSync(10);
	var hash = bcrypt.hashSync(req.data.attributes[this.field], salt);
	req.data.attributes[this.field] = hash;
	return this.resource.create(req);
}

module.exports = BcryptResource;
