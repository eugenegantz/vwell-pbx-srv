'use strict';

const
	modCrypto       = require('crypto'),
	modWs           = require('ws'),
	ajax            = require('eg-node-ajax'),
	moment          = require('moment'),
	egUtils         = require('eg-utils'),
	FabMod          = require('fabula-object-model'),
	appCfg          = require('./../../config/app-config.js'),
	awwsCfg         = require('./../../config/db-config-awws.js'),
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

		this._eventPrefix = 'pbx-srv-event';
	}


	/**
	 * @return {API}
	 * */
	static getInstance() {
		return this._instances[0] || new API();
	}


	/**
	 * Авторизация пользователя
	 * @return {Promise}
	 * */
	_login(req) {
		let dburl       = awwsCfg.dbconfigs[0].faburl.replace(/[\/]$/ig, '') + '/',
			fab         = FabMod.getInstance(),
			fabUtils    = fab.create('utils'),
			args        = reqUtils.getArgs(req),
			dtNow       = moment();

		let u = {
			'Agent': '-A',
			'Client': '-C'
		};

		if (args.secret) {
			if (args.secret != appCfg.secret)
				return Promise.reject('Ошибка авторизации');

			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			ajax.req({
				method: 'GET',
				decodeFrom: 'win-1251',
				url: dburl + 'auth?' + fabUtils.awwsBase64.encode(''
					+ `{`
					+ ` Src:'main'`
					+ `, Sql:'Login${u[args.login] || ''}'`
					+ `, Conf:'well'`
					+ `, Login:'${args.login}'`
					+ `, Login2:'${args.login2}'`
					+ `, Sha1:'${args.sha1}'`
					+ `, Tm:'${dtNow.format('mm:ss')}'`
					+ ` }`
				),
				callback(err, res) {
					if (err)
						return reject(err);

					res = JSON.parse(res.responseText);

					if (res.Err)
						return reject('Ошибка авторизации: ' + res.Err);

					resolve(res);
				}
			});
		});
	}


	send(req) {
		let args = reqUtils.getArgs(req),
			timeout = args.timeout || 15000;

		return this._login(req).then(() => {
			return EgPBXPool.getInstance(pbxCfg).then(pbx => {
				args.fields = args.fields || {};

				// Если оператор запросил ожидание ответа,
				// но не назначил actionId, принудительно присвоить actionId
				if (args.callbackAwait && !args.fields.actionId)
					args.fields.actionId = Math.random() + '';

				if (args.fields.actionId) {
					return Promise.race([
						pbx.send(args.fields).then(() => {
							return new Promise(resolve => {
								pbx.on('action-id-' + args.fields.actionId, data => {
									resolve({ event: data.fields });
								});
							})
						}),

						new Promise((r, reject) => {
							setTimeout(() => {
								reject('send(): timeout');
							}, timeout);
						})
					]);
				}

				return pbx.send(args.fields);
			});
		});
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


	/**
	 * Перенаправить звонок
	 * */
	redirect(req) {
		let args = reqUtils.getArgs(req);

		return this._login(req).then(() => {
			return EgPBXPool
				.getInstance(pbxCfg)
				.then(pbx => pbx.redirect(args));
		});
	}


	/**
	 * Подписаться на событие
	 * */
	onEvent(req) {
		let ws = req.ws,
			args = reqUtils.getArgs(req),
			{ name, event = {} } = args;

		// Либо назв. события
		// Либо объект события
		// Либо все события
		name = ((name || event.name || '') + '').toLowerCase();

		if (!ws)
			return Promise.resolve();

		delete event.name;

		return this._login(req).then(() => {
			let handler = e => {
				if (event) {
					// Если поля события совпадают
					let evMatch = Object.keys(event).every(k => {
						return (event[k] + '').toLowerCase() == (e[k] + '').toLowerCase();
					});

					if (evMatch)
						return ws.send(JSON.stringify(e));

				} else if (!name || name == e.name.toLowerCase()) {
					// Если название события совпадают
					ws.send(JSON.stringify(e));
				}
			};

			ws[req._once ? 'once' : 'on'](this._eventPrefix + '__' + name, handler);
		});
	}


	/**
	 * Подписаться на одноразовое событие
	 * */
	onceEvent(req) {
		req._once = 1;

		return this
			._login(req)
			.then(() => this.onEvent(req));
	}


	/**
	 * Запустить событие
	 * */
	dispatchEvent(req) {
		let wss = req.wss,
			args = reqUtils.getArgs(req),
			{ event } = args;

		if (!wss)
			return Promise.resolve();

		if (!event || typeof event != 'object')
			return Promise.reject('vwell-pbx-srv.on(): req.argument.event должен быть объект');

		event.name = (event.name + '').toLowerCase();

		return this._login(req).then(() => {
			if (wss) {
				wss.clients.forEach(ws => {
					if (ws.readyState === modWs.OPEN) {
						ws.emit(this._eventPrefix + '__' + event.name, event);
						ws.emit(this._eventPrefix + '__', event);
					}
				});
			}
		});
	}


	/**
	 * Удалить событие
	 * */
	rmEvent(req) {
		let ws = req.ws,
			args = reqUtils.getArgs(req),
			{ name, event = {} } = args;

		// Либо назв. события
		// Либо объект события
		// Либо все события
		name = ((name || event.name || '') + '').toLowerCase();

		if (!ws)
			return Promise.resolve();

		return this
			._login(req)
			.then(() => {
				ws.removeAllListeners(this._eventPrefix + '__' + name);
			});
	}

}


API._instances = [];


module.exports = API;