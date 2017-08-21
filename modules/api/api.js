'use strict';

const
	modCrypto       = require('crypto'),
	FabMod          = require('fabula-object-model'),
	appCfg          = require('./../../config/app-config.js'),
	pbxCfg          = appCfg.external_services.pbx,
	EgPBX           = require('eg-pbx'),
	EgPBXPool       = require('./../pbx/m-pbx-pool.js'),
	reqUtils        = require('./../utils/req.js');

function sha1(str) {
	return modCrypto
		.createHash('sha1')
		.update(str)
		.digest('hex');
}


class API {

	constructor() {
		API._instances.push(this);
	}


	static getInstance() {
		return this._instances[0] || new API();
	}


	_login(req) {
		let fab         = FabMod.getInstance(),
			db          = fab.getDBInstance(),
			dbUtils     = fab.create('dbUtils'),
			args        = reqUtils.getArgs(req);

		if (
			'agent' === (args.login + '').toLowerCase()
			&& args.login2
		) {
			let query = ''
				+ ' SELECT agentId'
				+ ' FROM Agents'
				+ ' WHERE'
				+   ` FIO & nameShort = '${args.login2}'`;

			return new Promise((resolve, reject) => {
				db.dbquery({
					query,
					callback(dbres, err) {
						if (err = dbUtils.fetchErrStrFromRes(dbres))
							return reject(err);

						resolve(dbres);
					}
				});

			}).then(dbres => {
				if (!dbres.recs[0])
					return Promise.reject('Не удалось установить пользователя');

				let dbSha1 = sha1('Agent' + (dbres.recs[0].agentId * 57));

				if (args.sha1 != dbSha1)
					return Promise.reject('Не удалось авторизировать пользователя');
			});
		}

		if (args.login) {
			let query = ''
				+ ' SELECT agentId'
				+ ' FROM Users'
				+ ' WHERE '
				+   ` userId = '${args.login}'`
				+   ` AND sha1 = '${args.sha1}'`;

			return new Promise((resolve, reject) => {
				db.dbquery({
					query,
					callback(dbres, err) {
						if (err = dbUtils.fetchErrStrFromRes(dbres))
							return reject(err);

						resolve(dbres);
					}
				});

			}).then(dbres => {
				if (!dbres.recs[0])
					return Promise.reject('Не удалось установить пользователя');
			});
		}

		if (args.secret != appCfg.secret)
			return Promise.reject('Ошибка авторизации');
	}


	dial(req) {
		let pbx = new EgPBX(),
			args = reqUtils.getArgs(req);

		this._login(req).then(() => {
			console.log('success');

			return Promise.resolve();

			return EgPBXPool
				.getInstance(pbxCfg)
				.then(() => pbx.dial(args));
		});
	}

}


API._instances = [];


module.exports = API;