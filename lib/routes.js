module.exports = function(config, app) {
    let controller = config.get_controller();
    app.get("/", controller.get_root);
    app.get("/:resource", controller.get_index);
    app.get("/:resource/:ids", controller.get_by_ids);
    app.get("/:resource/:ids/relationships/:relationship", controller.get_relationship);
    //app.get("/:resource/:id/:relationship", ResourceController.getRelationshipByIds);
}
