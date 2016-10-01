var frisby = require('frisby');

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
    };

    for(let resource_name in environment.config.relationships) {
        if(environment.cache[resource_name]) {
            for(let relationship_name in environment.config.relationships[resource_name]) {
                relationship_requests(environment, URL, resource_name, relationship_name, environment.cache[resource_name]); 
            }
        }
    }
}

function resource_requests(environment, URL, resource_name) {
    let RESOURCE_URL = URL + '/' + resource_name;
    
    ///////// resource index ////////////
    common.wrap_success(frisby.create('Resource Index'))
        .get(RESOURCE_URL)
        .afterJSON(function(json) {
            if(!json.data || !json.data[0]) {
                return;
            }
            let ida = json.data[0].id;
            environment.cache[resource_name] = ida;
            ///////// resource one ///////////
            common.wrap_success(frisby.create('Resource get one'))
                .get(RESOURCE_URL + '/' + ida)
                .expectJSONTypes({
                    data: Object,
                })
            .toss();

            if(!json.data[1]) {
                return;
            }
            let idb = json.data[1].id;
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
                    console.log(json);
                    if(!Array.isArray(json.data)) {
                        expect(json.data).toBe(null, "A server MUST respond to a successful request to fetch an individual resource with a resource object or null provided as the response document’s primary data.");
                    } else {
                        expect(json.data.length).toBe(0);
                    }
                })
            .toss();
        })
    .toss();
}

function relationship_requests(environment, URL, resource_name, resource_id, relationship_name) {

    let RESOURCE_URL = URL + '/' + resource_name + '/' + resource_id;

    /*
    common.wrap_success(frisby.create('Relationship'))
        .get(RESOURCE_URL + '/relationships/' + relationship_name)
        .expectStatus(200)
        .afterJSON(function(json) {
        })
    .toss();
    */
}
