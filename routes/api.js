var bodyparser = require('body-parser');
var express = require('express');
var status = require('http-status');

module.exports = function(wagner) {
    var api = express.Router();

    api.use(bodyparser.json());

    api.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });


    api.get('/', function(req, res) {
        res.json({
            message: 'Up and ready!'
        });
    });


    api.get('/company', wagner.invoke(function(CompanyService) {
        return function(req, res) {
            CompanyService.find(handleMany.bind(null, res));
        };
    }));
    api.post('/company', wagner.invoke(function(CompanyService) {
        return function(req, res) {
            if (req.body._id) {
                CompanyService.update({ _id: req.body._id }, req.body, handleOne.bind(null, res));
            } else {
                CompanyService.createCompany(handleOne.bind(null, res));
            }
        };
    }));


    api.get('/company/:company_id', wagner.invoke(function(CompanyService) {
        return function(req, res) {
            CompanyService.findById(req.params.company_id, handleOne.bind(null, res));
        };
    }));




    // No used
    api.put('/company/:company_id', wagner.invoke(function(CompanyService) {
        return function(req, res) {
            CompanyService.update({ _id: req.params.company_id }, req.body, handleOne.bind(null, res));
        };
    }));


    // Export Files
    api.get('/exportfile', wagner.invoke(function(ExportFileService) {
        return function(req, res) {
            ExportFileService.find(handleMany.bind(null, res));
        };
    }));

    api.get('/exportfile/:exportfile_id', wagner.invoke(function(ExportFileService) {
        return function(req, res) {
            ExportFileService.findById(req.params.exportfile_id, handleOne.bind(null, res));
        };
    }));

    api.post('/exportfile/create', wagner.invoke(function(ExportFileService) {
        return function(req, res) {
            ExportFileService.create(handleOne.bind(null, res));
        };
    }));

    api.post('/exportfile/query', wagner.invoke(function(ExportFileService) {
        return function(req, res) {
            ExportFileService.findByCriteria(req.body, handlMany(null, exportFiles));
        };
    }));

    api.post('/exportfile/equip', wagner.invoke(function(ExportFileService) {
        return function(req, res) {
            ExportFileService.addEquipment(req.body, handleOne.bind(null, res));
        };
    }));

    return api;
};

function handleMany(res, error, result) {
    if (error) {
        return res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.toString() });
    }
    if (!result) {
        return res.status(status.NOT_FOUND).json({ error: 'Not found' });
    }
    res.json(result);
}

function handleOne(res, error, result) {
    if (error) {
        return res.status(status.INTERNAL_SERVER_ERROR).json({ error: error.toString() });
    }
    if (!result) {
        return res.status(status.NOT_FOUND).json({ error: 'Not found' });
    }
    res.json(result);
}