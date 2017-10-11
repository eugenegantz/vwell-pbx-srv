vwell-bpx-srv
---
API сервер для АТС

#### Запуск ####
Для CMD
```
start server.bat
```

Для BASH
```
bash server.sh
```

#### Настройки ####
Настройки сервера: ```./config/app-config.js```

Пример настроек сервера с комментариями: ```./config/app-config.example.js```

## Работа с API ##
Сервер принимает GET, POST запросы или запросы внутри webSockets канала.
Структура запроса для всех одинакова.

#### Запросы webSocket ####
Пример запроса на АТС.
```javascript
// Создать и открыть сокет
var ws = new WebSocket('ws://127.0.0.1:8931/api');

// Слушать сообщения на сокете
ws.addEventListener('message', function(res) {
	console.log(res.data);
});

// Отправить запрос в канал
ws.send(
	JSON.stringify({
        // Метод API
        method: 'send',
        
        // Аргументы метода
        // Ниже перечислены типовые для всех запросов аргументы
        // * - обязательные поля
        argument: {
            // *Логин1
            login: 'Agent',
            
            // *Логин2
            login2: 'Иванов И.И.',
            
            // *Пароль пользователя закодированный в SHA1 (формат фабулы)
            sha1: 'a9de7c...',
            
            // Код запроса.
            // Необходим для идентификации ответа в общем потоке сообщений
            reqId: Math.random() + ''
            
            // ... другие аргументы
        }
    })
);
```

#### Запросы AJAX ####
```javascript
// jQuery
$.post('http://localhost:8930/api', {
    // Метод API
    method: 'send',
    
    // Аргументы метода
    // Ниже перечислены типовые для всех запросов аргументы
    // * - обязательные поля
    argument: {
        // *Логин1
        login: 'Agent',
        
        // *Логин2
        login2: 'Иванов И.И.',
        
        // *Пароль пользователя закодированный в SHA1 (формат фабулы)
        sha1: 'a9de7c...',
        
        // Код запроса.
        // Необходим для идентификации ответа в общем потоке сообщений
        reqId: Math.random() + ''
        
        // ... другие аргументы
    }
}, function(res) {
    console.log(res);
});
```


```javascript
// VanillaJS в формате jFabula
var req = new XMLHttpRequest();
var args = Base64.encode(
 JSON.stringify({
    // Метод API
    method: 'send',
    
    // Аргументы метода
    // Ниже перечислены типовые для всех запросов аргументы
    // * - обязательные поля
    argument: {
        // *Логин1
        login: 'Agent',
        
        // *Логин2
        login2: 'Иванов И.И.',
        
        // *Пароль пользователя закодированный в SHA1 (формат фабулы)
        sha1: 'a9de7c...',
        
        // ... другие аргументы
        
        // Код запроса.
        // Необходим для идентификации ответа в общем потоке сообщений
        reqId: Math.random() + ''
    }
 })
);
req.open('GET', 'http://localhost:8930/api?fb64json=' + args, true);
req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
req.send();
```

#### Ответ от сервера ####
Ответ для всех форм запросов типовой
```javascript
res = {
    // Ошибка.
    // null - ошибок нет
    "err": null
    
    // здесь могут быть доп. поля ответа
    // Специфичные для разных методов API
}
```

## Методы ##

#### send ####
Низкоуровневый метод. Отправляет сообщение в АТС

Подробней о действиях: https://wiki.asterisk.org/wiki/display/AST/Asterisk+13+AMI+Actions<br />
Подробней о командах: https://wiki.asterisk.org/wiki/display/AST/Asterisk+13+AGI+Commands

```javascript
ws.send(
    JSON.stringify({
        method: 'send',
        
        // * - обязательные поля
        argument: {
            // *Логин1
            login: 'Agent',
            
            // *Логин2
            login2: 'Иванов И.И.',
            
            // *Пароль пользователя закодированный в SHA1 (формат фабулы)
            sha1: 'a9de7c...',
            
            // Ожидать ответа от АТС или возвращать ответ сразу
            // Либо можно указать fields.actionId
            callbackAwait: 1,
            
            // *Строки сообщения передаваемые в АТС
            fields: {
                action: 'ping',
                
                // Если указан actionId, то callbackAwait = 1 автоматически
                actionId: Math.random()
            }
        }
    })
);
```
Если передан callbackAwait или fields.actionId, вместе с ответом прийдет объект события из АТС


#### gsmSendSMS ####
Отправить sms-сообщение

```javascript
ws.send(
    JSON.stringify({
        method: 'gsmSendSMS',
        
        // * - обязательные поля
        argument: {
            // *Логин1
            login: 'Agent',
            
            // *Логин2
            login2: 'Иванов И.И.',
            
            // *Пароль пользователя закодированный в SHA1 (формат фабулы)
            sha1: 'a9de7c...',
            
            // Сообщение
            msg: 'lorem ipsum',
            
            // *Номер телефона
            tel: '+7 100 200 30 40'
        }
    })
);
```


#### dial ####
Автодозвон с номера "FROM" на номер "TO"

```javascript
ws.send(
    JSON.stringify({
        method: 'dial',
        
        // * - обязательные поля
        argument: {
            // *Логин1
            login: 'Agent',
            
            // *Логин2
            login2: 'Иванов И.И.',
            
            // *Пароль пользователя закодированный в SHA1 (формат фабулы)
            sha1: 'a9de7c...',
            
            // *локальный телефон (на который сначала звонит АТС)
            from: '',
            
            // *удаленный телефон (на который переводит звонок, после подъема трубки)
            to: '',
            
            // время ожидания
            timeout: ''
        }
    })
);
```


#### redirect ####
Перевод звонка на другой телефон

```javascript
ws.send(
    JSON.stringify({
        method: 'redirect',
        
        // * - обязательные поля
        argument: {
            // *Логин1
            login: 'Agent',
            
            // *Логин2
            login2: 'Иванов И.И.',
            
            // *Пароль пользователя закодированный в SHA1 (формат фабулы)
            sha1: 'a9de7c...',
            
            // *Канал на который поступил звонок
            // Его можно получить из события "NewChannel"
            channel: 'YSGSM/11-1',
            
            // *Телефон на который необходимо перевести звонок в канале "channel"
            toTel: '269',
        }
    })
);
```


## События ##

#### onEvent ####
Подписаться на событие в АТС

```javascript
// Простой вариант
ws.send(
    JSON.stringify({
        method: 'onEvent',
        argument: {
            // *Логин1
            login: 'Agent',
            
            // *Логин2
            login2: 'Иванов И.И.',
            
            // *Пароль пользователя закодированный в SHA1 (формат фабулы)
            sha1: 'a9de7c...',
            
            name: 'NewChannel' // новый канал (поступил звонок)
        }
    })
);

// Или точней
ws.send(
    JSON.stringify({
        method: 'onEvent',
        argument: {
            // *Логин1
            login: 'Agent',
            
            // *Логин2
            login2: 'Иванов И.И.',
            
            // *Пароль пользователя закодированный в SHA1 (формат фабулы)
            sha1: 'a9de7c...',
            
            event: {
                // Событие "новый канал"
                name: 'Newchannel',
                
                // событие выстрелит только если event.CallerIDNum == "+71002003040"
                CallerIDNum: '+71002003040'
            }
        }
    })
);
```
 

#### rmEvent ####
Отписаться от события в АТС

```javascript
// Простой вариант
ws.send(
    JSON.stringify({
        method: 'rmEvent',
        argument: {
            // *Логин1
            login: 'Agent',
            
            // *Логин2
            login2: 'Иванов И.И.',
            
            // *Пароль пользователя закодированный в SHA1 (формат фабулы)
            sha1: 'a9de7c...',
            
            name: 'NewChannel'
        }
    })
);
```


## Примеры событий в канале ##
Подробней: https://wiki.asterisk.org/wiki/display/AST/Asterisk+13+AMI+Events

```
Event: Newchannel
Privilege: call,all
Channel: SIP/269-0000153c
ChannelState: 0
ChannelStateDesc: Down
CallerIDNum: 269
CallerIDName: 269
AccountCode: 
Exten: 267
Context: DLPN_DialPlan269
Uniqueid: 1505296320.6111


Event: Newchannel
Privilege: call,all
Channel: YSGSM/11-1
ChannelState: 1
ChannelStateDesc: Rsrvd
CallerIDNum: +79787342741
CallerIDName: +79787342741
AccountCode: 
Exten: s
Context: DID_trunk_11
Uniqueid: 1505301523.6253


Event: Dial
Privilege: call,all
SubEvent: Begin
Channel: SIP/269-0000153c
Destination: SIP/267-0000153d
CallerIDNum: 269
CallerIDName: 269
UniqueID: 1505296320.6111
DestUniqueID: 1505296320.6112
Dialstring: 267


Event: Dial
Privilege: call,all
SubEvent: Begin
Channel: YSGSM/11-1
Destination: SIP/269-000015bf
CallerIDNum: +79787342741
CallerIDName: +79787342741
UniqueID: 1505301525.6254
DestUniqueID: 1505301525.6255
Dialstring: 269


Event: NewCallerid
Privilege: call,all
Channel: YSGSM/11-1
CallerIDNum: +79787342741
CallerIDName: +79787342741
Uniqueid: 1505301525.6254
CID-CallingPres: 0 (Presentation Allowed, Not Screened)
```

 