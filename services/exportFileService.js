var Promise = require('bluebird');
var mongoose = require('mongoose');
// Load Chance
var Chance = require('chance');
// Instantiate Chance so it can be used
var chance = new Chance();

// models
var ObjectID = require('mongodb').ObjectID;
var companySchema = require('../models/company');
var Company = mongoose.model('Company', companySchema);
var equipmentSchema = require('../models/equipment');
var goodSchema = require('../models/good');
var splitGoodsPlacementSchema = require('../models/splitGoodsPlacement');
//var exportFileSchema = require('../models/exportFile');

var Equipment = mongoose.model('Equipment', equipmentSchema);
var Good = mongoose.model('Good', goodSchema);
//var ExportFile = mongoose.model('ExportFile', exportFileSchema);
var SplitGoodsPlacement = mongoose.model('SplitGoodsPlacement', splitGoodsPlacementSchema);


function ExportFileService(ExportFile) {


    // {"file_owner": "WA92828", "booking_number": "BK-B6O2J1"}
    // {"file_owner": "CT28709", "booking_number": "BK-A9F4C4", "equipment_number": "MMMU9953715"}
    // db.getCollection('exportfiles').createIndex({'file_owner': 1})
    // db.getCollection('exportfiles').createIndex({'booking_info.booking_number': 1})
    // db.getCollection('exportfiles').createIndex({'equipments.number': 1})
    // db.getCollection('exportfiles').createIndex({'modified_at': 1})
    // db.getCollection('exportfiles').find( {$and: [{file_owner: 'OK07913'}, {modified_at: {$gt: new Date(2005,0,1)}}, {modified_at: {$lt: new Date(2015,8,31)}}]})
    // db.getCollection('exportfiles').find({file_owner: 'OK07913', modified_at: {$gt: new Date(2005,0,1)}, modified_at: {$lt: new Date(2015,8,31)}})


    this.findByCriteria = function (criteria, next) {
        var queryCriteria = {};
        if (criteria.file_owner !== undefined) {
            queryCriteria.file_owner = criteria.file_owner;
        }
        if (criteria.booking_number !== undefined) {
            queryCriteria['bookingInfo.bookingNumber'] = criteria.booking_number;
        }
        if (criteria.equipment_number !== undefined) {
            queryCriteria['equipments.number'] = criteria.equipment_number;
        }
        queryCriteria.modified_at = {
            $gt: new Date(2005, 0, 1)
        };
        queryCriteria.modified_at = {
            $lt: new Date()
        };
        console.log(queryCriteria);
        ExportFile.find(queryCriteria).limit(10).exec(function (err, exportFiles) {
            if (err) {
                next(err);
            }
            next(null, exportFiles);
        });
    };


    this.findById = function (id, next) {
        ExportFile.findById(id, function (err, exportFile) {
            if (err) {
                next(err);
            }
            next(null, exportFile);
        });
    };


    // Search all limited to 20
    this.find = function (next) {
        ExportFile.find().limit(20).exec(function (err, exportFiles) {
            if (err) {
                next(err);
            }
            next(null, exportFiles);
        });
    };

    this.create = function (payload, next) {
        var ef = new ExportFile();
        ef.file_owner = payload.file_owner;
        ef.createdOn = new Date();
        ef.modifiedOn = ef.created_at;
        ef.bookingInfo.bookingNumber = payload.bookingNumber;
    };

    this.addEquipment = function (payload, next) {
//        var objectId = new ObjectID(exportfileId);
        var objectId = new ObjectID(payload.exportfileId);
        var query = { _id: objectId };
        var update = { $push: { equipments: payload.equipment } };
        findAndModify(query, [], update, { 'new': true })
            .then(function (exportFile) {
                next(null, exportFile);
            });
    };

    this.removeEquipment2Calls = function (exportfileId, payload, next) {
        var objectId = new ObjectID(exportfileId);
        var query = { _id: objectId };
        var updateSGP = { $pull: { 'splitGoodsPlacement': { equipmentNumber: payload.equipment.number } } };
        var updateEQD = { $pull: { equipments: { number: payload.equipment.number } } };
        Promise.join(findAndModify(query, [], updateEQD, { 'multi': false }), findAndModify(query, [], updateSGP, { 'multi': false }),
            function (err, exportFile) {
                next(err, exportFile);
            });
    };


    this.removeEquipment = function (exportfileId, payload, next) {
        var bulk = ExportFile.initializeOrderedBulkOp();

        bulk.find({ '_id': new ObjectID(exportfileId) })
            .updateOne({ '$pull': { 'splitGoodsPlacement': { 'equipmentNumber': payload.equipment.number } } });
        bulk.find({ '_id': new ObjectID(exportfileId) })
            .updateOne({ '$pull': { 'equipments': { 'number': payload.equipment.number } } });

        bulk.execute(function (err, result) {
            if (err) {
                next(err);
            }
            next(null, result);
        });
    };


    this.updateEquipment = function (exportfileId, payload, next) {
        var objectId = new ObjectID(exportfileId);
        var query = { _id: objectId };
        var update = { $pull: { equipments: { number: payload.equipment.number } } };
        findAndModify(query, [], update, { 'multi': false })
            .then(function (err, exportFile) {
                var update = { $push: { equipments: payload.equipment } };
                findAndModify(query, [], update, { 'new': true })
                    .then(function (err, exportFile) {
                        next(err, exportFile);
                    });
            });

    };

    this.addGood = function (payload, next) { };

    this.addSplitGoodPartition = function (payload, next) { };

    this.addAgent = function (payload, next) { };

    this.create = function (next) {
        var exportFile = new ExportFile();
        countCompanies().then(function (count) {
            Promise.join(findOneCompany(count), findOneCompany(count), findOneCompany(count), findOneCompany(count),
                function (forwarder, shippingAgent, terminal, depot) {
/*                    exportFile.shippingAgent = company2Nad(shippingAgent);
                    exportFile.freightForwarder = company2Nad(forwarder);
                    exportFile.containerTerminal = company2Nad(terminal);
                    exportFile.containerDepot = company2Nad(depot);
*/
                    exportFile.shippingAgent = shippingAgent;
                    exportFile.freightForwarder = forwarder;
                    exportFile.containerTerminal = terminal;
                    exportFile.containerDepot = depot;


                    // equipments
                    var numEquip = Math.floor(Math.random() * 4) + 1;
                    console.log('numEquip=' + numEquip);
                    for (var i = 0; i < numEquip; i++) {
                        var equipment = new Equipment({
                            number: 'MMMU' + chance.integer({
                                min: 1000000,
                                max: 9999999
                            }),
                            reference: 'ref1',
                            type: '2200',
                            unitGrossWeight: 'KG',
                            totalGrossWeight: chance.integer({
                                min: 13000,
                                max: 13999
                            }),
                            unitNetWeight: 'KG',
                            totalNetWeight: chance.integer({
                                min: 12000,
                                max: 12999
                            })
                        });
                        exportFile.equipments.push(equipment);
                    }
                    // Goods
                    for (var j = 0; j < numEquip; j++) {
                        var good = new Good({
                            id: j,
                            taricCode: '' + chance.integer({
                                min: 5000000,
                                max: 9999999
                            }),
                            description: "TEXTILES_" + j,
                            package: {
                                quantity: j + 10,
                                code: 'BR',
                                description: 'BARRIL'
                            },
                            situation: 'A',
                            splitGoodsPlacement: []
                        });
                        // var sgp = {
                        //         good_id: j,
                        //         equipment_number: exportFile.equipments[j].number,
                        //         pacjage_quantity: (j + 20),
                        //         gross_weight: (22000 + (j+20) * 10),
                        //         _id: exportFile.equipments[j]._id
                        // };
                        // good.split_goods_placement.push(sgp);
                        exportFile.goods.push(good);
                    }
                    // split_goods_placement
                    for (var k = 0; k < numEquip; k++) {
                        var sgp = new SplitGoodsPlacement({
                            equipmentNumber: exportFile.equipments[k].number,
                            packageQuantity: (k + 20),
                            gross_weight: (22000 + (k + 20) * 10),
                            _id: exportFile.equipments[k]._id
                        });
                        exportFile.splitGoodsPlacement.push(sgp);
                    }

                    exportFile.bookingInfo = {
                        bookingNumber: 'BK-' + chance.postal().replace(' ', ''),
                        events: {
                            notifiedOn: newDate()
                        }
                    };
                    exportFile.createdOn = newDate();
                    exportFile.modifiedOn = exportFile.createdOn;
                    exportFile.fileType = 'EF_FF';
                    exportFile.fileOwner = exportFile.freightForwarder.code;
                    exportFile.save(function (err) {
                        if (err) {
                            next(err);
                        }
                        next(null, exportFile);
                    });
                });
        });
    };


    this.update = function (id, json, next) {
        var exportFile = new ExportFile(json);
        exportFile.log(id + "===" + exportFile._id);
        if (id === exportFile._id) {
            exportFile.modificationOn = new Date();
            Company.update({
                _id: exportFile._id
            }, exportFile, {
                    upsert: false
                }, function (err) {
                    if (err) {
                        next(err);
                    }
                    next(null, exportFile);
                });
        } else {
            // next();
        }
    };

    function findOneCompany(count) {
        return new Promise(function (resolve, reject) {
            var rand = Math.floor(Math.random() * count);
            Company.findOne().skip(rand).exec(function (err, company) {
                if (err) {
                    reject(err);
                }
                resolve(company);
            });
        });
    }

    function countCompanies() {
        return new Promise(function (resolve, reject) {
            Company.count({}, function (err, count) {
                if (err) {
                    reject(err);
                }
                resolve(count);
            });
        });
    }

    function newDate() {
        return new Date(
            chance.integer({
                min: 2005,
                max: 2015
            }),
            chance.integer({
                min: 0,
                max: 11
            }),
            chance.integer({
                min: 1,
                max: 28
            }),
            chance.integer({
                min: 0,
                max: 23
            }),
            chance.integer({
                min: 0,
                max: 59
            }),
            chance.integer({
                min: 0,
                max: 59
            }),
            chance.integer({
                min: 0,
                max: 999
            }));
    }

    function company2Nad(company) {
        var nad = {
            code: company.code,
            name: company.name,
            email: company.email,
            addressTitle: company.addressTitle,
            address: company.address,
            city: company.city,
            region: company.region,
            postalCode: company.postalCode,
            country: company.country,
            phone: company.phone,
            fax: company.fax
        };
        return nad;
    }

    function findAndModify(query, sort, doc, options, callback) {
        return new Promise(function (resolve, reject) {
            ExportFile.findAndModify(query, sort, doc, options, function (err, exportFile) {
                if (err) {
                    reject(err);
                }
                resolve(exportFile);
            });
        });
    }
}

module.exports = ExportFileService;
