var mongoose = require('mongoose');
var _ = require('lodash');
var CompanyService = require('../services/companyService');
var ExportFileService = require('../services/exportFileService');

module.exports = function(wagner) {
    // Init mongoose
    var dbURI = require("../config/env.json")[process.env.NODE_ENV || 'local']["MONGO_URI"];
    var dbOptions = {
        server: {
            socketOptions: {
                keepAlive: 1
            }
        }
    };
    mongoose.Promise = global.Promise;
    //    mongoose.connect(dbURI, dbOptions);

    var connectWithRetry = function() {
        return mongoose.connect(dbURI, dbOptions, function(err) {
            if (err) {
                console.error('Failed to connect to mongo on startup - retrying in 5 sec', err);
                setTimeout(connectWithRetry, 5000);
            } else {
                console.info("Yay we've got connection!");

            }
        });
    };
    connectWithRetry();


    // Models & Services
    var company = mongoose.model('Company', require('./company'));
    var exportFile = mongoose.model('ExportFile', require('./exportFile'));
    var companyService = new CompanyService(company);
    var exportFileService = new ExportFileService(exportFile);

    var handlers = {
        CompanyService: companyService,
        ExportFileService: exportFileService
    };

    _.each(handlers, function(value, key) {
        wagner.factory(key, function() {
            return value;
        });
    });
};