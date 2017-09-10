'use strict';

const
	FabMod  = require('fabula-object-model'),
	DBModel = FabMod.getModule('DBModel'),
	dbUtils = FabMod.getModule('dbUtils');

DBModel.prototype.pDBQuery = function(arg) {
	return new Promise((resolve, reject) => {
		arg.callback = (dbres, err) => {
			if (err = dbUtils.fetchErrStrFromRes(dbres))
				return reject(err);

			resolve(dbres);
		};

		this.dbquery(arg);
	});
};