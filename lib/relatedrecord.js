function RelatedRecord(type, id) {
    this.type = type;
    this.id = id;
}

function RelatedRecordBuilder() {
    this._type = null;
    this._id = null;    
}

RelatedRecordBuilder.prototype.type = function(type) {
    this._type = type.toString();
    return this;
}

RelatedRecordBuilder.prototype.id = function(id) {
    this._id = id.toString();
    return this;
}

RelatedRecordBuilder.prototype.build = function() {
    return RelatedRecord(this.type, this.id);
} 

module.exports = function() {
    return RelatedRecordBuilder();
}
