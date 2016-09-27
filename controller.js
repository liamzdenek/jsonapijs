var Request = require("./request.js");
var IncludeInstructions = require("./includeinstructions.js");

function Controller(config) {
    this.config = config;

    this.get_index = function(req, rep) {
        let resource_name = req.params["resource"];
        //let resource = this.config.getResource(resource_name);
        
        let arena = this.config.new_arena();
        
        let request = Request()
            .resource(resource_name)
            .kind("getIndex")
            .output(true)
            .dependencies(IncludeInstructions(req.query.include))
            .build();

        arena.push_request(request);

        arena.resolve();

        let output = arena.get_output();
        rep.json(output);
    }.bind(this)
    
    this.get_by_ids = function(req, rep) {
        let resource_name = req.params["resource"];
        //let resource = this.config.getResource(resource_name);
        
        let arena = this.config.new_arena();
        
        let ids = req.params["ids"].split(",");

        let request = Request()
            .resource(resource_name)
            .kind("getByIds")
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
