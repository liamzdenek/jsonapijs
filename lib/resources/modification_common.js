let Promise = require('bluebird');

module.exports = function(verb, req, save) {

    console.log("Arena config rels: ", req.arena.config.relationships);
    let relationships = req.get_relationships();
    console.log("Relationships: ", relationships);
    let promises = [];
    for(let rel_name in relationships) {
        if(relationships[rel_name]["pre_"+verb]) {
            promises.push(relationships[rel_name]["pre_"+verb](req, rel_name));
        }
    }
    return Promise.all(promises)
        .then(function() {
            let promise = new Promise(save)
            return promise.then(function() {
                let promises = [];
                for(let rel_name in relationships) {
                    if(relationships[rel_name]["post_"+verb]) {
                        promises.push(relationships[rel_name]["post_"+verb](req, rel_name));
                    }
                }
                return Promise.all(promises)
            }).then(function() { return promise; })
        })
}


