'use strict';

!global.__root__ && (global.__root__ = __dirname);
!global.__root && (global.__root = __dirname);

process.on('uncaughtException', (err) => {
	console.log(err);

}).on('unhandledRejection', (err) => {
	console.log(err);
});

let express             = require('express'),
	bodyParser          = require('body-parser'),
	_                   = require('lodash'),
	moment              = require('moment'),
	modWs               = require('ws'),
	modPath             = require('path'),
	FabMod              = require('fabula-object-model'),
	appConfig           = require('./config/app-config.js'),
	dbCfg               = require('./config/db-config-awws.js'),
	fab                 = FabMod.getInstance(dbCfg.dbconfigs[0]),
	ObjectA             = FabMod.getModule('ObjectA'),
	fabAgents           = fab.create('AgentsDataModel'),
	fabUsers            = require('./modules/fab-users/fab-users.js').getInstance(),
	app                 = express();

// Парсер тела POST
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Статика
app.use('/static/', express.static(modPath.join(__root, './static/')));

require('./modules/polyfills/fab/db-model.js');
require('./modules/polyfills/fab/m-agents.js');

// --------------------------------------------------------
// Контроллеры
// --------------------------------------------------------
require('./config/routes.js').forEach(route => {
	let { method, pattern, type } = route,

		Controller = require('./controllers/' + route.controller);

	if (!method)
		method = '*';

	if (typeof pattern !== 'string' || !pattern)
		throw new Error('Ошибка: ключ pattern в ./config/routes.js должен быть непустой строкой');

	Controller.prototype._routeConfig = route;

	if ('post' === method) {
		app.post(pattern, Controller);

	} else if ('get' === method) {
		app.get(pattern, Controller);

	} else if ('*' === method) {
		app.all(pattern, Controller);
	}
});


// --------------------------------------------------------
// Инициализация моделей
// --------------------------------------------------------
function loadFabAgents() {
	return fabAgents
		.loadWithRef()
		.then(() => {
			console.log(`[OK] ${moment().format('YYYY.MM.DD HH:mm')} / AGENTS ${fabAgents.data.length}`);
		});
}

function loadFabUsers() {
	return fabUsers
		.load()
		.then(() => {
			console.log(`[OK] ${moment().format('YYYY.MM.DD HH:mm')} / USERS ${fabUsers.data.length}`);
		});
}

setTimeout(() => {
	loadFabAgents();
	loadFabUsers();
}, 1000 * 60 * 60); // 1 час

// --------------------------------------------------------
// Запуск сервера
// --------------------------------------------------------
Promise.all([
	loadFabAgents(),
	loadFabUsers()
]).then(() => {
	let httpPort,
		wsPort;

	if (!(httpPort = appConfig.http_server_port))
		throw new Error('./config/app-config.js не указан "http_server_port"');

	app.listen(httpPort, () => {
		console.log(`[OK] ${moment().format('YYYY.MM.DD HH:mm')} / http-cервер на порту ${httpPort} Запущен`);
	});

	// ---------------

	let wss = new modWs.Server({ port: wsPort = appConfig.ws_server_port }, () => {
		if (!modWs.Server.instances)
			modWs.Server.instances = [];

		modWs.Server.instances.push(wss);

		wss.on('connection', ws => {
			if (!ws.listenerCount('message')) {
				ws.on('message', req => {
					require('./controllers/ws-api.js')(wss, ws, req);
				});
			}

			if (!ws.listenerCount('error')) {
				ws.on('error', err => {
					console.error(err);
				});
			}
		});

		wss.on('error', err => {
			console.error(err);
		});

		console.log(`[OK] ${moment().format('YYYY.MM.DD HH:mm')} / ws-cервер на порту ${wsPort} Запущен`);
	});

	// Прослушивать события из АТС
	require('./modules/events/events.js');

}).catch(err => {
	console.log(`[FAIL] ${err + ''}`);
});