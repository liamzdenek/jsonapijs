var Promise = require('bluebird')
var Request = require('../request.js');
var IncludeInstructions = require('../includeinstructions.js')
//var Resource = require('../resource.js');
let RelatedRecord = require("../relatedrecord.js");

function Alias(relationship) {
	this.relationship = relationship
}

Alias.prototype.denote = function(arena, req, rel_name) {
    console.log("DENOTING Alias ", rel_name, req.response);
    for(let i in req.response) {
        let record = req.response[i];
        console.log("Record", record);
        record.set_relationship_links(rel_name, {
            "related": "/"+record.type+"/"+record.id+"/relationships/"+rel_name
        });
    }
}

Alias.prototype.include = function(arena, originreq, rel_name) {
	console.log("ORIGINREQ: ", originreq.response[0]);
	let parts = this.relationship.split(".");
	let ids = originreq.response.map((r) => r.id);
	let nrel_name = parts.shift();
	let rel = arena.config.get_relationship_by_resource(originreq.resource, nrel_name);
	let nres_name = "";


	exec = (preq) => {
		console.log("PREQ: ", preq);
		console.log("PARTS: ", parts);
		if(parts.length == 0) {
			return [];
		}
		let ids = [];
		if(Array.isArray(preq)) {
			nres_name = preq[0].type;
			ids = preq.map((v) => v.id);
		} else {
			if(preq && preq.response.length == 0) {
				return [];
			}
			nres_name = preq.response[0].type;
			ids = preq.response.map((v) => v.id)
		}
		nrel_name = parts.shift();
		console.log("PARTS: ", parts);
		console.log("GOT HERE, ", arena);
		console.log("REQUESTING: ", nres_name+"."+nrel_name);
		let nrel = arena.config.get_relationship_by_resource(nres_name, nrel_name);


		let nreq = Request()
			.resource(nres_name)
			.kind("get_by_ids")
			.data(ids)
			.output(false)
			.include(false)
			.dependencies(new IncludeInstructions(nrel_name))

		/*
		if(v.length == 1) {
			nreq.origin(this, originreq, rel_name);
		}
		*/

		nreq = nreq.build()

		console.log("PUSHING NEW REQ: ", nreq);
		return arena.push_request(nreq).then(() => nreq)
			.catch((e) => {throw e;})
			;

	}

	return rel.include(arena, originreq, nrel_name)
	.then((d) => {
		console.log("NREL SENT BACK: ", d);
		console.log("*".repeat(100));
		let e = exec(d)
		return e;
	})
	.catch((e) => { console.log("GOT THE ERROR: ", e)})
	.then((d) => {
		console.log("FINAL: ", d);
		console.log("*".repeat(50));
		console.log("FINAL 2: ", d.response[0].relationships[nrel_name])

		// todo: cannot relate to individual records yet, so all the records are related to all the target records. bit crap
		d.response.forEach((record) => {
			let rels = record.relationships[nrel_name].data
			rels = Array.isArray(rels) ? rels : [rels];

			rels.forEach((rel) => {
				originreq.response.forEach((orecord) => {
					console.log("PUSHING TO ORECORD: ", rel);
					
					orecord.push_relationship(rel_name, rel)
				})
			});
		})
	})
	.catch((e) => { console.log("GOT THE ERROR: ", e)})
	/*
	let nresource = originreq.resource;
	let ids = originreq.records.map((r) => r.id);
	function exec(v) {
		let nrel_name = parts.shift();
		let req = Request()
			.resource(resource)
			.kind("get_by_ids")
			.data(
	}
	console.log("CALLING NEXT");
	return exec().then((d) => {
		console.log("FINALLY: ", d);	
	}).catch(function(error) {
		console.log(error.stack)	
	});*/
}	

Alias.prototype.back_propegate = function(arena, originreq, destreq, rel_name) {
	console.log("BACK PROPEGATING: ", originreq, destreq);
}

module.exports = Alias;
