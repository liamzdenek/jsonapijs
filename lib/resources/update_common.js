module.exports = function(req, save) {

    console.log("Arena config rels: ", req.arena.config.relationships);
    let relationships = req.get_relationships();
    console.log("Relationships: ", relationships);
    let promises = [];
    for(let rel_name in relationships) {
        if(relationships[rel_name].pre_update) {
            promises.push(relationships[rel_name].pre_update(req, rel_name));
        }
    }
    return Promise.all(promises)
        .then(function() {
            let promise = new Promise(save)
            return promise.then(function() {
                let promises = [];
                for(let rel_name in relationships) {
                    if(relationships[rel_name].post_update) {
                        promises.push(relationships[i].post_update(req, rel_name));
                    }
                }
                return Promise.all(promises)
            }).then(function() { return promise; })
        })
}


