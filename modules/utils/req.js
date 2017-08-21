'use strict';

const
	FabMod = require('fabula-object-model'),
	fabUtils = FabMod.prototype._getModule('utils');


module.exports = {

	getParams(req) {
		let method = req.method.toLowerCase(),
			params = 'post' === method ? req.body : req.query;

		if (params.fb64json) {
			try {
				let obj = JSON.parse(
					fabUtils.awwsBase64.decode(
						params.fb64json
					)
				);

				if (typeof obj === 'object')
					params = obj;

			} catch (e) {
				console.log(e);
			}
		}

		return params;
	},


	getArgs(req) {
		return this.getParams(req).argument || {};
	},


	/**
	 * Проверяет имеет ли право домен запрашивать данный контроллер (страницу).
	 * Вызывается в контексте контроллера
	 * */
	detectCORS(route, req) {
		if (typeof route.cors == 'undefined')
			return true;

		if (!Array.isArray(route.cors))
			throw new Error('route.cors suppose to be Array');

		if (!route.cors.length)
			return true;

		let origin = this.getReqOrigin(req),
			k = route.cors.indexOf(origin);

		return !!~k && route.cors[k];
	},


	getReqOrigin(req) {
		/*
		 * req.header - Шапка
		 * req.header.origin // К примеру: 192.168.3.100 или print.sborka.biz:8082
		 * Firefox не передает req.header.origin при запросе с одного и того же домена, только req.header.host
		 * */
		return req.headers.origin || (req.headers.host ? (req.protocol + "://" + req.headers.host) : "");
	}

};