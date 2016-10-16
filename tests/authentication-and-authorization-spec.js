var frisby = require('frisby');
var environment = require('./environment/authentication_and_authorization.js');
var common = require('./common.js');
var uuid = require('node-uuid');
let static_test_id = '123e4567-e89b-12d3-a456-426655440000';

var BASE_URL = environment.URL

common.wrap_success(frisby.create('Create Session')
    .post(BASE_URL+"/session/",{
        data: {
            type: "session",
            attributes: {
                "username": "223",
                "password": "abcd",
            },
        }
    },{json: true})
)
    .afterJSON(function(json) {
        expect(uuid.parse(json.data.id)).not.toBe(null);
        let id = json.data.id;
        check_login(id, "2");
    })
.toss();

check_login(static_test_id, "1");
check_cats_permissions(static_test_id);

function check_login(id, user_id) {
    common.wrap_success(frisby.create('Check Session'))
        .get(BASE_URL+"/session/mine")
        .addHeader("Authorization", "Bearer "+id)
        .afterJSON(function(json) {
            console.log("CHECK LOGIN: ", json);
            expect(json.data.relationships.logged_in_as.data.type).toBe("users", "Expected a user relationship to be specified in the relationships section");
            expect(json.data.relationships.logged_in_as.data.id).toBe(user_id, "Expected a user relationship to be specified in the relationships section");
        })
    .toss();

    common.wrap_success(frisby.create('Check Session'))
        .get(BASE_URL+"/session/mine?include=logged_in_as")
        .addHeader("Authorization", "Bearer "+id)
        .afterJSON(function(json) {
            console.log("INCLUDED: ", JSON.stringify(json));
            expect(json.included.length).toBe(1,"Expected included to contain the user record");
        })
    .toss();

    common.wrap_success(frisby.create('Ensure /users/2 does not send back "password" field'))
        .get(BASE_URL+"/users/2")
        .afterJSON(function(json) {
            expect(typeof json.data).toBe("object", "Expected exactly one response object in the top-level data");
            expect("password" in json.data.attributes).toBe(false, "The attributes of the primary response data should not contain the 'password' key");
            expect("username" in json.data.attributes).toBe(true, "The attributes of the primary response should contain the 'password' key");
        })
    .toss()
}

function check_cats_permissions(id) {
    common.wrap_success(frisby.create('Ensure /cats/cat1\?include=owner returns one cat and one included user'))
        .get(BASE_URL+"/cats/cat1?include=owner")
        .addHeader("Authorization", "Bearer "+id)
        .afterJSON(function(json) {
            expect(typeof json.data).toBe("object", "Expected exactly one response object in the top-level data");
            expect(json.data.type).toBe("cats");
            expect(json.data.id).toBe("cat1");
            expect(Array.isArray(json.included)).toBe(true, "Expected top-level included to be an array");
            expect(json.included[0].type).toBe("users");
            expect(json.included[0].id).toBe("1");
        })
    .toss();
    frisby.create('Ensure /cats/cat2\?include=owner returns an error')
        .get(BASE_URL+"/cats/cat2?include=owner")
        .addHeader("Authorization", "Bearer "+id)
        .addHeader("Content-Type", "application/vnd.api+json")
        .expectStatus(403)
        .afterJSON(function(json) {
            expect(typeof json.data).toBe("undefined", "Expected json.data to be undefined");
            expect(Array.isArray(json.errors)).toBe(true, "Expected json.errors to be an array");
            expect(json.errors.length).not.toBe(0, "Expected json.errors to be non-empty");
        })
    .toss();
}
