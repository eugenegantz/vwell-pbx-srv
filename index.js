'use strict';

!global.__root__ && (global.__root__ = __dirname);
!global.__root && (global.__root = __dirname);

process.on('uncaughtException', (err) => {
	console.log(err);

}).on('unhandledRejection', (err) => {
	console.log(err);
});

let express             = require('express'),
	modPath             = require('path'),
	FabMod              = require('fabula-object-model'),
	appConfig           = require('./config/app-config.js'),
	dbCfg               = require('./config/db-config-awws.js'),
	fab                 = FabMod.getInstance(dbCfg.dbconfigs[0]),
	app                 = express();

app.use('/static/', express.static(modPath.join(__root, './static/')));

// --------------------------------------------------------
// Контроллеры
// --------------------------------------------------------
require('./config/routes.js').forEach(route => {
	let { method, pattern } = route,

		Controller = require('./controllers/' + route.controller);

	if (!method)
		method = '*';

	if (typeof pattern != 'string' || !pattern)
		throw new Error('Ошибка: ключ pattern в ./config/routes.js должен быть непустой строкой');

	Controller.prototype._routeConfig = route;

	if ('post' == method) {
		app.post(pattern, Controller);

	} else if ('get' == method) {
		app.get(pattern, Controller);

	} else if ('*' == method) {
		app.all(pattern, Controller);
	}
});


// --------------------------------------------------------
// Запуск сервера
// --------------------------------------------------------
let p;

if (!(p = appConfig.http_server_port))
	throw new Error('./config/app-config.js не указан "http_server_port"');

app.listen(p, () => console.log(`Сервер на порту ${p} Запущен. ${new Date()}`));