'use strict';

const
	voidFn = () => {},
	FabMod = require('fabula-object-model'),
	MAgents = FabMod.getModule('AgentsDataModel'),
	ObjectA = FabMod.getModule('ObjectA'),
	load = MAgents.prototype.load;

MAgents.prototype.load = function(arg = {}) {
	let callback = arg.callback || voidFn;

	return new Promise((resolve, reject) => {
		load.call(
			this,
			Object.assign(arg, {
				callback(err) {
					if (err)
						return reject(err);

					resolve(this.data);
				}
			})
		);

	}).then(() => {
		callback(null, this, this.data);

	}).catch(err => {
		callback(err, this);
	});
};


MAgents.prototype.loadWithRef = function() {
	return this.load().then(() => {
		if (!this.data.length)
			return Promise.reject('Список агентов пуст');

		let c,
			data = this.data;

		this.dataRefByAgentId = ObjectA.create({});
		this.dataRefByLogin2 = ObjectA.create({});

		for (c = 0; c < data.length; c++) {
			this.dataRefByAgentId.set(data[c].AgentID, data[c]);
			this.dataRefByLogin2.set(
				(
					(data[c].FIO || '').trim()          // фамилия
					+ ' '
					+ (data[c].NameShort || '').trim()  // инициалы
				).trim(),
				data[c]
			);
		}
	});
};