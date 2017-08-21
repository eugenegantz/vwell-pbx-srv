'use strict';

const
	modCrypto       = require('crypto'),
	egUtils         = require('eg-utils'),
	FabMod          = require('fabula-object-model'),
	appCfg          = require('./../../config/app-config.js'),
	pbxCfg          = appCfg.external_services.pbx,
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


	/**
	 * Авторизация пользователя
	 * */
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
				+ ' SELECT userId'
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

		return Promise.resolve();
	}


	/**
	 * Отправить SMS
	 * */
	gsmSendSMS(req) {
		let args = reqUtils.getArgs(req),
			{ tel, msg } = args;

		if (!tel)
			return Promise.reject('arg.tel suppose to be not empty string');

		if (!msg)
			return Promise.reject('arg.msg suppose to be not empty string');

		tel = egUtils.tel.mob.normalize(tel + '').replace(/^\+7/, '8');

		return this._login(req).then(() => {
			return EgPBXPool.getInstance(pbxCfg).then(pbx => {
				return pbx.gsmSendSMS({
					msg,
					tel,
					spanId: pbxCfg.span_id
				});
			});
		});
	}


	/**
	 * Позвонить через дозвон из АТС
	 * */
	dial(req) {
		let args = reqUtils.getArgs(req);

		args.from = egUtils.tel.mob.normalize(args.from + '').replace(/^\+7/, '8');
		args.to = egUtils.tel.mob.normalize(args.to + '').replace(/^\+7/, '8');

		return this._login(req).then(() => {
			return EgPBXPool
				.getInstance(pbxCfg)
				.then(pbx => pbx.dial(args));
		});
	}

}


API._instances = [];


module.exports = API;