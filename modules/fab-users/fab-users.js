'use strict';

const
	FabMod = require('fabula-object-model'),
	ObjectA = FabMod.getModule('ObjectA');

class FabUsers {

	constructor() {
		this.data = [];
		this.dataRefByUserId = ObjectA.create({});

		FabUsers._instances.push(this);
	}


	/**
	 * @return {FabUsers}
	 * */
	static getInstance(...arg) {
		return FabUsers._instances[0] || new FabUsers(...arg);
	}


	/**
	 * @return {Promise}
	 * */
	load() {
		let fab = FabMod.getInstance(),
			db = fab.getDBInstance(),
			query = 'SELECT UserID, UserName, sha1 FROM Users';

		return db
			.pDBQuery({ query })
			.then(dbres => {
				let dataRefByUserId = {};

				dbres.recs.forEach(row => {
					dataRefByUserId[row.UserID] = row;
				});

				this.data = dbres.recs;
				this.dataRefByUserId = ObjectA.create(dataRefByUserId);
			});
	}

}


FabUsers._instances = [];


module.exports = FabUsers;