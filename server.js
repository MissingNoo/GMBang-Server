const {
    time
} = require("console");
var dgram = require("dgram");

users = 0;
usertime = [];
maxusers = 0;
const {
    send,
    disconnect
} = require("process");
const {
    isArray
} = require("util");
require("simple-enum");
rooms = [];
var server = dgram.createSocket("udp4");
var Network = Enum(
    "KeepAlive",
    "Connection",
    "Disconnect",
    "CreateRoom",
    "JoinRoom",
    "StartGame"
)

var Dice = Enum(
    "Arrow",
    "Bomb",
    "Hit1",
    "Hit2",
    "Beer",
    "Gatling",
)

function between(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }

function sendMessage(data, rinfo) {
    var response = JSON.stringify(data);
    server.send(response, rinfo.port, rinfo.address);
}

function sendMessageRoom(message, sendersocket, room) {
    for (var i = 0; i < rooms.length; ++i) {
        if (rooms[i]['name'] == room) {
            for (var j = 0; j < rooms[i]['players'].length; ++j) {
                if (sendersocket != rooms[i]['players'][j]['port']) {
                    sendMessage(message, {
                        address: rooms[i]['players'][j]['address'],
                        port: rooms[i]['players'][j]['port']
                    });
                }
            }
        }
    }
}

server.on("message", function (msg, rinfo) {
    var _json = JSON.parse(msg);
    //console.log(rinfo);
    switch (_json['command']) {
        case Network.CreateRoom:
            var room_number = rooms.length;
            var password = between(1, 10);
            console.log("Creating room" + String(room_number));            
            rooms[room_number] = {
                name : room_number,
                password : password,
                totalplayers: 0,
                players: []
            };
            sendMessage({
                command: Network.CreateRoom,
                roomname: room_number,
                password: password
            }, rinfo);
            break;
        //case Network.KeepAlive:
            //console.log("Keepalive from " + _json['username']);
        //    break;

        case Network.JoinRoom:
            var _username = _json['username'];
            var password = _json['password'];
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if ((rooms[i]['name'] == _room || rooms[i]['password'] == password) && rooms[i]['totalplayers'] < 2) {
                    rooms[i]['players'][rooms[i]['totalplayers']] = {
                        address: rinfo['address'],
                        port: rinfo['port'],
                        username: _username,
                    };
                    rooms[i]['totalplayers'] += 1;
                    //console.log(String(rooms[i]['players']['socket']));
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        var ishost = false;
                        if (rooms[i]['players'][j]['port'] == rooms[i]['players'][0]['port']) {
                            _ishost = true;
                        } else {
                            _ishost = false;
                        }
                        sendMessage({
                            command: Network.JoinRoom,
                            roomname: rooms[i]['name'],
                            players: JSON.stringify(rooms[i]['players']),
                            isHost: _ishost
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                        sendMessage({
                            command: Network.ListRooms,
                            rooms: rooms
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;

        case Network.StartGame:
            var _room = _json['roomname'];
            console.log("Starting game on room:" + _room);
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.StartGame
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;

        case Network.PlayerConnect:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rinfo['port'] != rooms[i]['players'][j]['port']) {
                            sendMessage({
                                command: Network.PlayerJoined,
                                socket: rooms[i]['players'][j]['port']
                            }, {
                                address: rooms[i]['players'][j]['address'],
                                port: rooms[i]['players'][j]['port']
                            });
                        }
                    }
                }
            }
            break;

        case Network.Move:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rinfo['port'] != rooms[i]['players'][j]['port']) {
                            sendMessage({
                                command: Network.PlayerMoved,
                                x: _json['x'],
                                y: _json['y'],
                                sprite: _json['sprite'],
                                spd : _json['spd'],
                                image_xscale: _json['image_xscale'],
                                socket: rooms[i]['players'][j]['port']
                            }, {
                                address: rooms[i]['players'][j]['address'],
                                port: rooms[i]['players'][j]['port']
                            });
                        }
                    }
                }
            }
            break;

        case Network.SpawnUpgrade:
            sendMessageRoom({
                command: Network.SpawnUpgrade,
                socket: _json['socket'],
                x: _json['x'],
                y: _json['y'],
                sprite_index: _json['sprite_index'],
                direction: _json['direction'],
                image_angle: _json['image_angle'],
                //speed : _json['speed'],
                //sendvars : _json['sendvars'],
                //upg : _json['upg'],
                upgID: _json['upgID'],
                //haveafterimage: _json['haveafterimage'],
                extraInfo : _json['extraInfo']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.Spawn:
            sendMessageRoom({
                command: Network.Spawn,
                x: _json['x'],
                y: _json['y'],
                sendvars: _json['sendvars']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.Destroy:
            sendMessageRoom({
                command: Network.Destroy,
                enemyID: _json['enemyID'],
                //drop : _json['drop']
                owner: rinfo['port']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.UpdateUpgrade:
            sendMessageRoom({
                command: Network.UpdateUpgrade,
                upgID: _json['upgID'],
                socket: _json['socket'],
                x: _json['x'],
                y: _json['y'],
                sprite_index: _json['sprite_index'],
                direction: _json['direction'],
                image_angle: _json['image_angle'],
                image_alpha: _json['image_alpha'],
                image_xscale: _json['image_xscale'],
                image_yscale: _json['image_yscale'],
                afterimg: _json['afterimg'],
                extraInfo: _json['extrainfo']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.DestroyUpgrade:
            sendMessageRoom({
                command: Network.DestroyUpgrade,
                upgID: _json['upgID'],
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.Disconnect:
            DisconnectPlayer(_json, rinfo);
            break;

        case Network.Connection:
            usertime[usertime.length] = {
                username: _json['username'],
                user: rinfo['port'],
                roomname: _json['roomname'],
                lastaction: Math.floor(new Date().getTime() / 1000)
            }
            users++;
            if (maxusers < users) {
                maxusers = users;
            }
            console.log("User " + String(_json['username']) + " connected, " + String(users) + "/" + String(maxusers) + " total users online");
            break;

        case Network.UpdateRoom:

            break;

        case Network.KeepAlive:
            //console.log("KeepAlive from " + rinfo['port']);
            for (let index = 0; index < usertime.length; index++) {
                if (usertime[index]['user'] == rinfo['port']) {
                    usertime[index]['lastaction'] = Math.floor(new Date().getTime() / 1000);
                    usertime[index]['roomname'] = _json['roomname'];
                }

            }
            break;

        case Network.UpdateOptions:
            sendMessageRoom({
                command: Network.UpdateOptions,
                option: _json['option'],
                value: _json['value'],
                roomname: _json['roomname']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.ShareXP:
            sendMessageRoom({
                command: Network.ShareXP,
                xp: _json['xp'],
                roomname: _json['roomname']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.ChatMessage:
            sendMessageRoom({
                command: Network.ChatMessage,
                text: _json['text'],
                username: _json['username']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.SpawnAnvil:
            sendMessageRoom({
                command: Network.SpawnAnvil,
                owner: rinfo['port'],
                x: _json['x'],
                y: _json['y'],
                anvilid: _json['anvilid'],
                maxuses: _json['maxuses']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.UpdateAnvil:
            sendMessageRoom({
                command: Network.UpdateAnvil,
                anvilid: _json['anvilid'],
                maxuses: _json['maxuses']
            }, rinfo['port'], _json['roomname']);
            break;

        case Network.AddItem:
            sendMessageRoom({
                command: Network.AddItem,
                type: _json['type'],
                id: _json['id'],
                level: _json['level'],
                pos: _json['pos']
            }, rinfo['port'], _json['roomname']);
            break;       

        case Network.InfectMob:
            sendMessageRoom({
                command: Network.InfectMob,
                id: _json['id'],
                target : _json['target'],
                hp : _json['hp'], 
                baseSPD : _json['baseSPD']
            }, rinfo['port'], _json['roomname']);
            break;

        default:
            break;
    }

});

function DisconnectPlayer(_json, rinfo) {
    for (var i = 0; i < rooms.length; ++i) {
        for (var j = 0; j < rooms[i]['players'].length; ++j) {
            if (rooms[i]['players'][j]['port'] == rinfo['port']) {
                //users--;
                rooms[i]['players'].splice(j, 1);
                rooms[i]['totalplayers'] -= 1;
                if (rooms[i]['totalplayers'] == 0) {
                    if (rooms.length == 1) {
                        rooms = [];
                    } else {
                        rooms.splice(i, 1);
                    }
                    break;
                }
            }
        }
    }
    //if (_json['roomname'] == '') {
    //users--;
    //}
    for (var i = 0; i < rooms.length; ++i) {
        if (rooms[i]['name'] == _json['roomname']) {
            for (var j = 0; j < rooms[i]['players'].length; ++j) {
                var ishost = false;
                if (rooms[i]['players'][j]['port'] == rooms[i]['players'][0]['port']) {
                    _ishost = true;
                } else {
                    _ishost = false;
                }
                sendMessage({
                    command: Network.UpdateRoom,
                    roomname: rooms[i]['name'],
                    players: JSON.stringify(rooms[i]['players']),
                    isHost: _ishost
                }, {
                    address: rooms[i]['players'][j]['address'],
                    port: rooms[i]['players'][j]['port']
                });
            }
        }
    }
    for (let index = 0; index < usertime.length; index++) {
        if (usertime[index]['user'] == rinfo['port']) {
            users--;
            if (users < 0) {
                users = 0;
            }
            console.log("User " + String(usertime[index]['username']) + " disconnected, " + String(users) + "/" + String(maxusers) + " total users online");
            usertime.splice(index, 1);
        }
    }
}

function timeout() {
    for (let index = 0; index < usertime.length; index++) {
        let now = Math.floor(new Date().getTime() / 1000);
        let last = usertime[index]['lastaction'];
        //console.log(now - last);
        if (now - last > 30) {
            DisconnectPlayer({
                roomname: usertime[index]['roomname']
            }, {
                port: usertime[index]['user']
            });
            //TODO: return player to start screen
        }
        //else{console.log(now - usertime[index]['lastaction']);}

    }
}

setInterval(function () {
    timeout()
}, 30000)

server.bind(8888);
console.log("Server Online!");
timeout();

var keypress = require('keypress');

// make `process.stdin` begin emitting "keypress" events
keypress(process.stdin);

// listen for the "keypress" event
process.stdin.on('keypress', function (ch, key) {
    if (key && key.name == 'u') {
        console.log(usertime);
    }
    //console.log('got "keypress"', key);
    if (key && key.ctrl && key.name == 'c') {
        process.kill(process.pid, 'SIGHUP');
    }
});

process.stdin.setRawMode(true);
process.stdin.resume();