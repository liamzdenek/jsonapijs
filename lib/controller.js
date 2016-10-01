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

        arena.resolve();

        let output = arena.get_output();
        rep.json(output);
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

        arena.resolve();

        let output = arena.get_output();
        rep.json(output);
    }.bind(this)
}

module.exports = function(config) {
    return new Controller(config);
}
