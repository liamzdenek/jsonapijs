function Request(resource, kind, data, should_output, should_included, is_singular, dependencies, origin) {
    this.resource = resource;
    this.kind = kind;
    this.data = data;
    this.should_output = should_output; 
    this.should_included = should_included;
    this.is_singular = is_singular;
    this.dependencies = dependencies;
    this.origin = origin;
    this.response = null;
}

function RequestBuilder() {
    this._resource = null;
    this._kind = null;
    this._data = null;
    this._should_output = false;
    this._should_include = false;
    this._dependencies = null;
    this._origin = null;
}

RequestBuilder.prototype.resource = function(resource) {
    this._resource = resource;
    return this;
}

RequestBuilder.prototype.kind = function(kind) {
    this._kind = kind;
    return this;
}

RequestBuilder.prototype.data = function(data) {
    this._data = data;
    return this;
}

RequestBuilder.prototype.output = function(should_output) {
    this._should_output = should_output;
    return this;
}

RequestBuilder.prototype.include = function(should_include) {
    this._should_include = should_include;
    return this;
}

RequestBuilder.prototype.dependencies = function(dep) {
    this._dependencies = dep;
    return this;
}

RequestBuilder.prototype.origin = function(relationship, origin, relationship_name) {
    this._origin = {relationship:relationship, request:origin, relationship_name: relationship_name};
    return this;
}

RequestBuilder.prototype.is_singular = function(is_singular) {
    this._is_singular = is_singular;
    return this;
}

RequestBuilder.prototype.build = function() {
    if(!this._resource) {
        throw "RequestBuilder must have Resource defined";
    }
    if(!this._kind) {
        throw "RequestBuilder must have Kind defined";
    }
    return new Request(this._resource, this._kind, this._data, this._should_output, this._should_include, this._is_singular, this._dependencies, this._origin); 
}

module.exports = function() {
    return new RequestBuilder();
}
