var Request = require('../request.js');
var Exception = require("../exception.js");
let RelatedRecord = require("../relatedrecord.js");
let IdByForeignField = require("./IdByForeignField.js");
let IdByLocalField = require("./IdByLocalField.js");

function ManyToMany(config, {src, src_id, src_to_join_name, join_to_dst_name, resource, dst_to_join_name, join_to_src_name, dst, dst_id}) {
	
	// from src to dst
	config.push_relationship(src, src_to_join_name,
		IdByForeignField()
			.field_name(src_id)
			.resource_name(resource)
		.build()
	);
	config.push_relationship(resource, join_to_dst_name,
		IdByLocalField()
			.field_name(dst_id)
			.resource_name(dst)
			.required(true)
		.build()
	);
	
	// from dst to src
	config.push_relationship(dst, dst_to_join_name,
		IdByForeignField()
			.field_name(dst_id)
			.resource_name(resource)
		.build()
	);
	config.push_relationship(resource, join_to_src_name,
		IdByLocalField()
			.field_name(src_id)
			.resource_name(src)
			.required(true)
		.build()
	);
}

module.exports = ManyToMany
