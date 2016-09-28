module.exports = function(config, app) {
    let controller = config.get_controller();
    app.get("/:resource", controller.get_index);
    app.get("/:resource/:ids", controller.get_by_ids);
    //app.get("/:resource/:id/:relationship", ResourceController.getRelationshipByIds);
}
