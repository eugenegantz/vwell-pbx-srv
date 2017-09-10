'use strict';

const
	EgPBX = require('eg-pbx');


module.exports = {

	_instances: [],


	_intervals: {
		instance: null
	},


	getInstance({ port, host, usr, pwd }) {
		let pbx = this._instances[0];

		clearTimeout(this._intervals.instance);

		this._intervals.instance = setTimeout(() => this._instances = [], 1000 * 60);

		if (pbx)
			return Promise.resolve(pbx);

		pbx = new EgPBX();

		pbx.debug = 1;

		return pbx
			.connect({ port, host })
			.login({ usr, pwd })
			.then(() => {
				this._instances.push(pbx);

				return pbx;
			});
	}

};