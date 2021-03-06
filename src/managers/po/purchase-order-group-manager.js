'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var PurchaseOrderGroup = DLModels.po.PurchaseOrderGroup;

module.exports = class PurchaseOrderGroupManager {
    constructor(db, user) {
        this.db = db;
        this.user = user;

        this.PurchaseOrderGroupCollection = this.db.use(map.po.collection.PurchaseOrderGroup);
    }

    read(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);

        return new Promise((resolve, reject) => {
            var deleted = {
                _deleted: false
            };
            var query = _paging.keyword ? {
                '$and': [deleted]
            } : deleted;

            if (_paging.keyword) {
                var regex = new RegExp(_paging.keyword, "i");
                var filterPODLNo = {
                    'PODLNo': {
                        '$regex': regex
                    }
                };

                var $or = {
                    '$or': [filterPODLNo]
                };

                query['$and'].push($or);
            }

            this.PurchaseOrderGroupCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(PurchaseOrderGroups => {
                    resolve(PurchaseOrderGroups);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getById(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleByQuery(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getByIdOrDefault(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleOrDefaultByQuery(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.PurchaseOrderGroupCollection
                .single(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getSingleOrDefaultByQuery(query) {
        return new Promise((resolve, reject) => {
            this.PurchaseOrderGroupCollection
                .singleOrDefault(query)
                .then(fabric => {
                    resolve(fabric);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    create(purchaseOrderGroup) {
        return new Promise((resolve, reject) => {
            this._validate(purchaseOrderGroup)
                .then(validPurchaseOrderGroup => {
                    this.PurchaseOrderGroupCollection.insert(validPurchaseOrderGroup)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    _validate(purchaseOrderGroup) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = purchaseOrderGroup;

            if (!valid.PODLNo || valid.PODLNo == '')
                errors["PODLNo"] = "Nomor PODL tidak boleh kosong";
            if (valid.supplier) {
                if (!valid.supplierId || valid.supplierId == '')
                    errors["supplierId"] = "Nama Supplier tidak terdaftar";
            }
            else 
                errors["supplierId"] = "Nama Supplier tidak boleh kosong";
            if (!valid.deliveryDate || valid.deliveryDate == '')
                errors["deliveryDate"] = "Tanggal Kirim tidak boleh kosong";
            if (!valid.termOfPayment || valid.termOfPayment == '')
                errors["termOfPayment"] = "Pembayaran tidak boleh kosong";
            if (!valid.paymentDue || valid.paymentDue == '')
                errors["paymentDue"] = "Tempo Pembayaran tidak boleh kosong";
            if (valid.deliveryFeeByBuyer == undefined || valid.deliveryFeeByBuyer.toString() === '')
                errors["deliveryFeeByBuyer"] = "Pilih salah satu ongkos kirim";
            if (valid.usePPn == undefined || valid.usePPn.toString() === '')
                errors["usePPn"] = "Pengenaan PPn harus dipilih";
            if (valid.usePPh == undefined || valid.usePPh.toString() === '')
                errors["usePPh"] = "Pengenaan PPh harus dipilih";

            if (valid.items) {
                errors["items"] = "Harus ada minimal 1 nomor PO"
            }

            // 2c. begin: check if data has any error, reject if it has.
            for (var prop in errors) {
                var ValidationError = require('../../validation-error');
                reject(new ValidationError('data podl does not pass validation', errors));
            }

            valid.stamp(this.user.username, 'manager');
            resolve(valid);
        });
    }
}
