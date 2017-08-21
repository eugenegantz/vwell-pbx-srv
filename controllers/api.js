'use strict';

const
	reqUtils    = require('./../modules/utils/req.js'),
	API   = require('./../modules/api/api.js');


function Controller(req, res) {
	let route = Controller.prototype._routeConfig;

	// ------------------------------------------------------------
	// Установка CORS
	// Возвращает false если нет в списке разрешенных доменов
	// Возвращает true если самого списка разрешенных доменов нет
	// Возвращает строку с доменом если он найден в белом списке (route.cors)
	// ------------------------------------------------------------
	let cors = reqUtils.detectCORS(route, req);

	// Только для белого списка доменов
	if (!cors)
		return res.status(403).send('Forbidden');

	res.set({
		'Access-Control-Allow-Origin': reqUtils.getReqOrigin(req),
		'Access-Control-Allow-Credentials': true,
		'P3P': 'CP="ALL IND DSP COR ADM CONo CUR CUSo IVAo IVDo PSA PSD TAI TELo OUR SAMo CNT COM INT NAV ONL PHY PRE PUR UNI"'
	});

	// ------------------------------------------------------------

	let params = reqUtils.getParams(req),
		method = params.method;

	// ------------------------------------------------------------
	// Если метод не назначен, обрывать выполнение, отвечать ошибку
	// ------------------------------------------------------------
	if (!method) {
		return res.send(
			JSON.stringify({
				err: 'Отсутствует ключ request.method'
			})
		);
	}

	let api = API.getInstance();

	// ------------------------------------------------------------
	// Проверка существования метода API
	// ------------------------------------------------------------
	if (typeof api[method] !== 'function' || method[0] === '_') {
		return res.send(
			JSON.stringify({
				err: `Метод "${method}" не существует`
			})
		);
	}

	// ------------------------------------------------------------
	// Тип данных в ответе
	// ------------------------------------------------------------
	res.append('Content-type', 'application/json');

	api[method](req, res).then(obj => {
		res.send(
			JSON.stringify(
				Object.assign(
					{ err: null },
					obj
				)
			)
		)

	}).catch(err => {
		res.send(
			JSON.stringify({
				err: err + ''
			})
		)
	});
}


module.exports = Controller;