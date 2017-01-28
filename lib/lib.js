module.exports = {
    MySQLResource: require(__dirname+'/resources/MySQLResource.js'),
    RamResource: require(__dirname+'/resources/RamResource.js'),
    RedisConnection: require(__dirname+'/resources/RedisResource.js'),
    UUIDGeneratorResource: require(__dirname+'/resources/UUIDGeneratorResource.js'),
    IdByLocalField: require(__dirname+'/relationships/IdByLocalField.js'),
    IdByForeignField: require(__dirname+'/relationships/IdByForeignField.js'),
    Config: require(__dirname+'/config.js'),
    Routes: require(__dirname+'/routes.js'),
	ManyToMany: require(__dirname+'/relationships/ManyToMany.js'),
}
