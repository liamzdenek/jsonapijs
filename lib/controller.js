var Request = require("./request.js");
var IncludeInstructions = require("./includeinstructions.js");

function Controller(config) {
    this.config = config;

    this.dummy = {
        "meta": {
            "copyright": "todo",
        },
        "jsonapi": {
            "version": "1.0",
        }
    };

    // if this function returns true, the action does not execute
    this.pre_action = function(req, rep) {
        rep.set('Content-Type', 'application/vnd.api+json');

        {
            let content_type = req.get("Content-Type")
            if(content_type) {
                content_type = content_type.split(",");
                let found = false;
                for(let i in content_type) {
                    let entry = content_type[i];
                    entry = entry.split(";");
                    if(entry[1] == undefined && entry[0] == "application/vnd.api+json") {
                        found = true;
                    }
                };
                if(found == false) {
                    rep.status(415);
                    rep.json(this.dummy);
                    return true;
                }
            }
        }

        {
            let accept = req.get("Accept");
            if(accept) {
                accept = accept.split(",");
                let quit = false;
                for(let i in accept) {
                    let entry = accept[i];
                    entry = entry.split(";");
                    if(entry[1] != undefined && entry[0] == "application/vnd.api+json") {
                        quit = true;
                    } else if(entry[1] == undefined && entry[0] == 'application/vnd.api+json') {
                        quit = false;
                        break;
                    }
                };
                if(quit) {
                    rep.status(406);
                    rep.json(this.dummy);
                    return true;
                }
            }
        }

        return false;
    }

    this.get_root = function(req, rep) {
        if(this.pre_action(req,rep)){ return; }
        rep.json(this.dummy);
    }.bind(this)

    this.get_index = function(req, rep) {
        if(this.pre_action(req,rep)){ return; }
        let resource_name = req.params["resource"];
        //let resource = this.config.getResource(resource_name);
        
        let arena = this.config.new_arena();
        
        let request = Request()
            .resource(resource_name)
            .kind("get_index")
            .output(true)
            .dependencies(IncludeInstructions(req.query.include))
            .build();

        arena.push_request(request);

        arena.resolve().then(function() {
            let output = arena.get_output();
            rep.json(output);
        });
    }.bind(this)
    
    this.get_by_ids = function(req, rep) {
        if(this.pre_action(req,rep)){ return; }
        let resource_name = req.params["resource"];
        //let resource = this.config.getResource(resource_name);
        
        let arena = this.config.new_arena();
        
        let ids = req.params["ids"].split(",");

        let request = Request()
            .resource(resource_name)
            .kind("get_by_ids")
            .output(true)
            .data(ids)
            .dependencies(IncludeInstructions(req.query.include))
            .is_singular(ids.length == 1)
            .build();

        arena.push_request(request);

        arena.resolve().then(function() {;
            let output = arena.get_output();
            rep.json(output);
        })
    }.bind(this)

    this.get_relationship = function(req, rep) {
        if(this.pre_action(req,rep)){ return; }

        if(req.query.include) {
            rep.status(400);
            rep.json({
                "meta": {
                    "reason": "/:resource/:id/relationships/:relationship requests do not support the include param",
                }
            });
            return;
        }

        let arena = this.config.new_arena();

        let resource_name = req.params["resource"];
        let relationship_name = req.params["relationship"];
        let ids = req.params["ids"].split(",");

        let request = Request()
            .resource(resource_name)
            .kind("get_by_ids")
            .output(true)
            .data(ids)
            .dependencies(IncludeInstructions(relationship_name))
            .is_singular(false) // makes looping a bit later on easier
            .build();

        arena.push_request(request);

        arena.resolve().then(function(data) {
            console.log("Arena resolved, ", data);            
            let t_output = arena.get_output();

            let output = {data: []};

            console.log("TRANSFORMING ", t_output);
            // transform the output format
            for(let i in t_output.data) {
                let record = t_output.data[i]
                console.log("A", record);
                console.log("B", relationship_name);
                if(!("relationships" in record) || !(relationship_name in record.relationships)) {
                    continue;
                    //console.log("Record does not have a relationship set when it should have");
                    //return Promise.reject("Record does not have a relationship set when it should have");
                }
                console.log("C");
                let data = record.relationships[relationship_name].data;
                console.log("Q");
                if(t_output.data.length != 1) {
                    console.log("D");
                    output.data = output.data.concat(data);
                } else {
                    console.log("E");
                    output.data = data;
                }
            }

            rep.json(output);

            // this is largely the same as this.get_by_ids but with an implied relationship include,
        }).catch(function(data) {
            console.log("Arena caught, ",data);
            rep.status(500);
            rep.json({
                "data": null,
                "meta": {
                    "error": data,
                }
            })
        })

    }.bind(this)
}

module.exports = function(config) {
    return new Controller(config);
}