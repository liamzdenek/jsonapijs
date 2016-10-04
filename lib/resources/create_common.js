module.exports = function(req, save) {

    console.log("Arena config rels: ", req.arena.config.relationships);
    let relationships = req.get_relationships();
    console.log("Relationships: ", relationships);
    let promises = [];
    for(let i in relationships) {
        if(relationships[i].pre_save) {
            promises.push(relationships[i].pre_save(req));
        }
    }
    return Promise.all(promises)
        .then(function() {
            let promise = new Promise(save)
            return promise.then(function() {
                let promises = [];
                for(let i in relationships) {
                    if(relationships[i].post_save) {
                        promises.push(relationships[i].post_save(req));
                    }
                }
                return Promise.all(promises)
            }).then(function() { return promise; })
        })
}


