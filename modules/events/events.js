'use strict';

const
	modWs = require('ws'),
	appCfg = require('./../../config/app-config.js'),
	EgPBXPool = require('./../pbx/m-pbx-pool.js'),
	api = require('./../api/api.js').getInstance();

EgPBXPool
	.getInstance(appCfg.external_services.pbx)
	.then(pbx => {
		pbx.on('event', (e) => {
			let { fields } = e;

			fields.name = e.type;

			api.dispatchEvent({
				method: 'POST',
				wss: modWs.Server.instances[0],
				body: {
					method: 'dispatchEvent',
					argument: {
						secret: appCfg.secret,
						event: fields
					}
				}
			})
		})
	});