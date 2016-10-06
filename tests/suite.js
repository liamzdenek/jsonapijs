var frisby = require('frisby');
var Promise = require('bluebird');

var common = require('./common.js')

function index_requests(environment, INDEX_URL) {
    //////////////////////////////

    common.wrap_success(frisby.create('/'))
        .get(INDEX_URL)
    .toss()

    //////////////////////////////

    frisby.create('Servers MUST respond with a 406 Not Acceptable status code if a request’s Accept header contains the JSON API media type and all instances of that media type are modified with media type parameters.')
        .get(INDEX_URL)
        .addHeader("Content-Type", "application/vnd.api+json;charset=utf8")
        .expectStatus(415)
    .toss()

    //////////////////////////////

    frisby.create('Servers MUST respond with a 406 Not Acceptable status code if a request’s Accept header contains the JSON API media type and all instances of that media type are modified with media type parameters.')
        .get(INDEX_URL)
        .addHeader("Content-Type", "application/vnd.api+json")
        .addHeader("Accept", "application/vnd.api+json;charset=utf8,application/vnd.api+json;someparameter=abcd")
        .expectStatus(406)
    .toss()

    //////////////////////////////

    frisby.create('Contrapositive: Servers MUST respond with a 406 Not Acceptable status code if a request’s Accept header contains the JSON API media type and all instances of that media type are modified with media type parameters.')
        .get(INDEX_URL)
        .addHeader("Content-Type", "application/vnd.api+json")
        .addHeader("Accept", "application/vnd.api+json;charset=utf8,application/vnd.api+json")
        .expectStatus(200)
    .toss()

    //////////////////////////////

}


module.exports = function(environment) {

    let URL = environment.URL;
    let INDEX_URL = environment.URL;

    environment.cache = {};

    index_requests(environment, INDEX_URL);

    for(let resource_name in environment.config.resources) {
        resource = environment.config.relationships[resource_name];
        console.log("RESOURCE: ", resource_name);
        resource_requests(environment, URL, resource_name);
    
        let resource_id = environment.cache[resource_name];
        console.log("Resource id: ", resource_id);
        resource_id.then(function(resource_ids) {
            resource_update_requests(environment, URL, resource_name, resource_ids);
        })
    };

    for(let resource_name in environment.config.relationships) {
        console.log("Environment cache: ", environment.cache);
        for(let relationship_name in environment.config.relationships[resource_name]) {
            let resource_id = environment.cache[resource_name];
            resource_id.then(function(resource_id) {
                relationship_requests(environment, URL, resource_name, relationship_name, resource_id); 
            })
        }
    }
}

function resource_requests(environment, URL, resource_name) {
    let RESOURCE_URL = URL + '/' + resource_name;
   
    environment.cache[resource_name] = new Promise(function(resolve,reject) {
        ///////// resource index ////////////
        common.wrap_success(frisby.create('Resource Index'))
            .get(RESOURCE_URL)
            .afterJSON(function(json) {
                if(!json.data || !json.data[0]) {
                    return;
                }
                let ida = json.data[0].id;
                ///////// resource one ///////////
                common.wrap_success(frisby.create('Resource get one'))
                    .get(RESOURCE_URL + '/' + ida)
                    .expectJSONTypes({
                        data: Object,
                    })
                .toss();

                if(!json.data[1]) {
                    resolve([ida]);
                    return;
                }
                let idb = json.data[1].id;
                resolve([ida,idb])
                ///////// resource many ///////////
                common.wrap_success(frisby.create('Resource get many'))
                    .get(RESOURCE_URL + '/' + ida + ',' + idb)
                    .expectJSONTypes({
                        data: Array,
                    })
                .toss();

                    
                // A server MUST respond with 404 Not Found when processing a request to fetch a single resource that does not exist, except when the request warrants a 200 OK response with null as the primary data (as described above).
                frisby.create('Resource \''+resource_name+'\' get 404')
                    .get(RESOURCE_URL + '/' + 'fakeasdfasdfasdfadfadsf')
                    .expectStatus(200)
                    .addHeader("Content-Type", "application/vnd.api+json")
                    .afterJSON(function(json) {
                        if(!Array.isArray(json.data)) {
                            expect(json.data).toBe(null, "A server MUST respond to a successful request to fetch an individual resource with a resource object or null provided as the response document’s primary data.");
                        } else {
                            expect(json.data.length).toBe(0);
                        }
                    })
                .toss();
            })
            .after(function() {
                reject();
            })
        .toss();
    })
}

function resource_update_requests(environment, URL, resource_name) {
    console.log("Resource update requests");
    let RESOURCE_URL = URL + '/' + resource_name;
    environment.cache[resource_name].then(function(ids) {
        common.wrap_success(frisby.create('Update One')
            .patch(RESOURCE_URL+"/"+ids[0],{
                id: ids[0],
                type: resource_name,
                attributes: {
                    "asdf": "123new",
                }
            }, {json: true})
        ) // wrap success needs to be after .patch() because {json: true} automatically adds a content type header that we must override
            .expectStatus(200)
            .afterJSON(function(json) {
                expect(json).toBe(null)
                console.log("Update One ", json);
            })
        .toss();
    })
}

function relationship_requests(environment, URL, resource_name, relationship_name, resource_ids) {

    resource_ida = resource_ids[0];

    let RESOURCE_URL = URL + '/' + resource_name + '/' + resource_ida;

    common.wrap_success(frisby.create('Relationship '+resource_name+'.'+relationship_name+' by one'))
        .get(RESOURCE_URL + '/relationships/' + relationship_name)
        .expectStatus(200)
        .afterJSON(function(json) {
            expect(json.data).not.toBe(null)
            expect(typeof json.data).toBe("object");
        })
    .toss();

    if(resource_ids.length >= 2) {
        resource_idb = resource_ids[1];
        common.wrap_success(frisby.create('Relationship '+resource_name+'.'+relationship_name+' by many'))
            .get(RESOURCE_URL + ',' + resource_idb + '/relationships/' + relationship_name)
            .expectStatus(200)
            .afterJSON(function(json) {
                expect(json.data).not.toBe(null)
                expect(typeof json.data).toBe("object");
            })
        .toss();
    }

    common.wrap_success(frisby.create('Relationship Include '+resource_name+'.'+relationship_name+' by one'))
        .get(RESOURCE_URL + '?include=' + relationship_name)
        .expectStatus(200)
        .afterJSON(function(json) {
            expect(json.data).not.toBe(null)
            expect(typeof json.data).toBe("object");
            expect(json.included).not.toBe(null);
            expect(Array.isArray(json.included)).toBe(true)
        })
        .afterJSON(function(json) {
            if(!json.included[0]) {
                return;
            }
            let second_type = json.included[0].type;
            if(!environment.config.relationships[second_type]) {
                return;
            }
            let second_rel = Object.keys(environment.config.relationships[second_type])[0];
            //if(environment.config.relationships[second_type]
            common.wrap_success(frisby.create('Relationship '+resource_name+' ?include='+relationship_name+","+relationship_name+"."+second_rel))
                .get(RESOURCE_URL + '?include='+relationship_name+","+relationship_name+"."+second_rel)
                .expectStatus(200)
                .afterJSON(function(json) {
                    expect(json.data).not.toBe(null)
                    expect(typeof json.data).toBe("object");
                    expect(json.included).not.toBe(null);
                    expect(Array.isArray(json.included)).toBe(true)
                })
            .toss();
        })
    .toss();

}
