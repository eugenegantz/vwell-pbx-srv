'use strict';

const
	_ = require('lodash'),
	API = require('./../modules/api/api.js');

module.exports = (wss, ws, req) => {
	let p = Promise.resolve();

	req = JSON.parse(req);

	let api = API.getInstance(),

		{
			method = '',
			reqId = Math.random().toString().replace('0.', '1')
		} = req;

	return p.then(() => {
		if (
			'_' == method[0]
			|| typeof api[method] != 'function'
		) {
			return Promise.reject(`vwell-pbx-srv: метод "${method}" не существует`);
		}

		return api[method]({
			ws,
			wss,
			method: 'POST',
			body: {
				method,
				argument: req.argument
			}
		});

	}).then(res => {
		ws.send(
			JSON.stringify(
				Object.assign({
					err: null,
					reqId
				}, res)
			)
		);

	}).catch(err => {
		console.log(err);

		ws.send(
			JSON.stringify({
				err: err + '',
				reqId
			})
		);
	});
};