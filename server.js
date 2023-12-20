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
    "StartGame",
    "Roll",
    "Mouse",
    "SaveDice",
    "NextTurn",
    "AddArrow",
	"UpdatePlayers",
    "Damage",
    "Heal",
    "Gatling",
    "Waiting",
    "ChangeBomb",
    "ChangeDice"
)

var Dice = Enum(
    "Arrow",
    "Bomb",
    "Hit1",
    "Hit2",
    "Beer",
    "Gatling",
)

var Roles = Enum(
    "Sheriff",
	"Deputy",
	"Outlaw",
	"Renegade"
)

var DamageType = Enum(
    "Normal",
    "Indian",
    "Dynamite"
)

var Characters = Enum(
    "BartCassidy",
    "BlackJack",
    "CalamityJanet",
    "ElGringo",
    "JesseJones",
    "Jourdonnais",
    "KitCarlson",
    "LuckyDuke",
    "PaulRegret",
    "PedroRamirez",
    "RoseDoolan",
    "SidKetchum",
    "SlabtheKiller",
    "SuzyLafayette",
    "VultureSam",
    "WillytheKid"
)
const characterInfo = [];
characterInfo[Characters.BartCassidy] = {life : 8, skip : false};
characterInfo[Characters.BlackJack] = {life : 8, skip : false};
characterInfo[Characters.CalamityJanet] = {life : 8, skip : false};
characterInfo[Characters.ElGringo] = {life : 7, skip : false};
characterInfo[Characters.JesseJones] = {life : 9, skip : false};
characterInfo[Characters.Jourdonnais] = {life : 7, skip : false};
characterInfo[Characters.KitCarlson] = {life : 7, skip : false};
characterInfo[Characters.LuckyDuke] = {life : 8, skip : false};
characterInfo[Characters.PaulRegret] = {life : 9, skip : false};
characterInfo[Characters.PedroRamirez] = {life : 8, skip : false};
characterInfo[Characters.RoseDoolan] = {life : 9, skip : false};
characterInfo[Characters.SidKetchum] = {life : 8, skip : false};
characterInfo[Characters.SlabtheKiller] = {life : 8, skip : false};
characterInfo[Characters.SuzyLafayette] = {life : 8, skip : false};
characterInfo[Characters.VultureSam] = {life : 9, skip : false};
characterInfo[Characters.WillytheKid] = {life : 8, skip : false};

function between(min, max) {
    return Math.floor(
        Math.random() * (max - min) + min
    )
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
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
                players: [],
                currentTurn : 0,
                arrows : 9
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
                if ((rooms[i]['name'] == _room || rooms[i]['password'] == password) && rooms[i]['totalplayers'] < 8) {
                    rooms[i]['players'][rooms[i]['totalplayers']] = {
                        address: rinfo['address'],
                        port: rinfo['port'],
                        username: _username,
                        rolls: 3,
                        arrows: 0,
                        life: 0,
                        maxlife: 0,
                        bombs: 0,
                        character: -1,
                        job : -1,
                        lastdamage: -1
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
                    const roomchars = [...characterInfo];
                    var roomjobs = [];
                    switch (rooms[i]['players'].length) {
                        case 4:
                            roomjobs = [Roles.Sheriff, Roles.Renegade, Roles.Outlaw, Roles.Outlaw];
                            break;
                        case 5:
                            roomjobs = [Roles.Sheriff, Roles.Renegade, Roles.Outlaw, Roles.Outlaw, Roles.Deputy];
                            break;
                        case 6:
                            roomjobs = [Roles.Sheriff, Roles.Renegade, Roles.Outlaw, Roles.Outlaw, Roles.Outlaw, Roles.Deputy];
                            break;
                        case 7:
                            roomjobs = [Roles.Sheriff, Roles.Renegade, Roles.Outlaw, Roles.Outlaw, Roles.Outlaw, Roles.Deputy, Roles.Deputy];
                            break;
                        case 8:
                            roomjobs = [Roles.Sheriff, Roles.Renegade, Roles.Renegade, Roles.Outlaw, Roles.Outlaw, Roles.Outlaw, Roles.Deputy, Roles.Deputy];
                            break;
                    }
                    for (let k = 0; k < roomchars.length; k++) {
                        roomchars[k]['skip'] = false;
                    }
                    shuffle(roomjobs);
                    shuffle(rooms[i]['players']);
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        var _job = roomjobs.shift();
                        var _char = between(0, roomchars.length);
                        do {
                            _char += 1;
                            if (_char >= roomchars.length) {
                                _char = 0;
                            }
                            //console.log(roomchars[_char]['skip']);
                        } while (roomchars[_char]['skip']);
                        rooms[i]['players'][j]['job'] = _job;
                        rooms[i]['players'][j]['character'] = _char;
                        if (j == 1) {
                            rooms[i]['players'][j]['character'] = Characters.JesseJones;
                        }
                        if (j == 0) {
                            //rooms[i]['players'][j]['character'] = Characters.CalamityJanet;
                        }
                        rooms[i]['players'][j]['life'] = roomchars[_char]['life'];
                        rooms[i]['players'][j]['maxlife'] = roomchars[_char]['life'];
                        roomchars[_char]['skip'] = true;
                        sendMessage({
                            command: Network.StartGame,
                            socket: rooms[i]['players'][j]['port']
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.UpdatePlayers,
                            players : JSON.stringify(rooms[i]['players'])
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;
        case Network.Waiting:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.Waiting,
                            player: _json['player'],
                            waiting : _json['waiting']
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                        sendMessage({
                            command: Network.UpdatePlayers,
                            players : JSON.stringify(rooms[i]['players'])
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;
        case Network.Roll:
            var _saved = JSON.parse(_json['saved']);
            //var dices = [between(0, 6), between(0, 6), between(0, 6), between(0, 6), between(0, 6)];
            var dices = [Dice.Beer, Dice.Beer, Dice.Hit1, Dice.Hit1, Dice.Hit1];
            for (let i = 0; i < dices.length; i++) {
                for (let j = 0; j < _saved.length; j++) {
                    if (_saved[j][0] == i) {
                        _isSaved = true;
                        dices[i] = _saved[j][1];
                    }
                }
            }
            var dicejson = JSON.stringify(dices);
            var _bombs = 0;
            for (let i = 0; i < dices.length; i++) {
                var _isSaved = false;
                for (let j = 0; j < _saved.length; j++) {
                    if (_saved[j][0] == i) {
                        _isSaved = true;
                    }
                }
                if (dices[i] == Dice.Bomb && !_isSaved) {
                    _bombs += 1;
                }
            }
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rooms[i]['players'][j]['port'] == rinfo.port) {
                            rooms[i]['players'][j]['rolls'] -= 1;
                            rooms[i]['players'][j]['bombs'] += _bombs;
                            if (rooms[i]['players'][j]['bombs'] >= 3) {
                                rooms[i]['players'][j]['life'] -= 1;
                                rooms[i]['players'][j]['lastdamage'] = DamageType.Dynamite;
                            }
                        }
                    }
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.Roll,
                            dicejson: dicejson,
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                        sendMessage({
                            command: Network.UpdatePlayers,
                            players : JSON.stringify(rooms[i]['players'])
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;
        case Network.Damage:
            var _room = _json['roomname'];
            //console.log(_json);
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    var _myself = -1;
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rinfo['port'] == rooms[i]['players'][j]['port']) {
                            _myself = i;
                        }
                    }
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        //console.log(rooms[i]['players'][j]['port'] + "/" + String(_json['port']));
                        if (_json['port'] == rooms[i]['players'][j]['port']) {
                            rooms[i]['players'][j]['life'] -= 1;
                            if(rooms[i]['players'][j]['character'] == Characters.ElGringo){
                                rooms[i]['players'][_myself]['arrows'] += 1;
                                rooms[i]['arrows'] -= 1;
                            }
                            rooms[i]['players'][j]['lastdamage'] = DamageType.Normal;
                        }
                    }
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.UpdatePlayers,
                            players : JSON.stringify(rooms[i]['players']),
                            arrows : rooms[i]['arrows']
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;
        case Network.Gatling:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rinfo['port'] == rooms[i]['players'][j]['port']) {
                            rooms[i]['players'][j]['arrows'] = 0;
                        }
                        else{
                            rooms[i]['players'][j]['life'] -= 1;
                            rooms[i]['players'][j]['lastdamage'] = DamageType.Normal;
                        }
                    }
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.UpdatePlayers,
                            players : JSON.stringify(rooms[i]['players'])
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;
        case Network.Heal:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        //console.log(rooms[i]['players'][j]['port'] + "/" + String(_json['port']));
                        if (_json['port'] == rooms[i]['players'][j]['port']) {
                            if (rooms[i]['players'][j]['life'] > 0 && rooms[i]['players'][j]['life'] < rooms[i]['players'][j]['maxlife']) {
                                var _healAmount = 1;
                                if(rooms[i]['players'][j]['character'] == Characters.JesseJones && _json['port'] == rinfo['port'] && rooms[i]['players'][j]['life'] <= 4){
                                    _healAmount = 2;
                                }
                                rooms[i]['players'][j]['life'] += _healAmount;
                            }
                            
                        }
                    }
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.UpdatePlayers,
                            players : JSON.stringify(rooms[i]['players'])
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;
        case Network.SaveDice:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.SaveDice,
                            number: _json['number'],
                            saved: _json['saved']
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;
        case Network.NextTurn:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rooms[i]['players'][j]['port'] == rinfo.port) {
                            rooms[i]['players'][j]['rolls'] = 3;
                            rooms[i]['players'][j]['bombs'] = 0;
                        }
                    }
                    var _turn = rooms[i]['currentTurn'] + 1;
                    if (_turn >= rooms[i]['players'].length) {
                        _turn = 0;
                    }
                    while (rooms[i]['players'][_turn]['life'] <= 0) {
                        _turn+=1;
                        if (_turn >= rooms[i]['players'].length) {
                            _turn = 0;
                        }
                    }
                    rooms[i]['currentTurn'] = _turn;
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.NextTurn,
                            turn : _turn
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
            }
            break;
        case Network.ChangeBomb:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rooms[i]['players'][j]['port'] == rinfo['port'] && rooms[i]['players'][j]['character'] == Characters.BlackJack) {
                            rooms[i]['players'][j]['bombs'] += _json['amount'];
                            console.log("player " + String(rooms[i]['players'][j]['username']) + "bombs: " + String(rooms[i]['players'][j]['bombs']));
                        }
                    }
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.UpdatePlayers,
                            players : JSON.stringify(rooms[i]['players']),
                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
                
            }
            break;
        case Network.ChangeDice:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.ChangeDice,
                            id : _json['id'], 
                            face : _json['face']

                        }, {
                            address: rooms[i]['players'][j]['address'],
                            port: rooms[i]['players'][j]['port']
                        });
                    }
                }
                
            }
            break;
        case Network.AddArrow:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    if (rooms[i]['arrows'] > 0) {
                        for (var j = 0; j < rooms[i]['players'].length; ++j) {
                            if (rooms[i]['players'][j]['port'] == rinfo['port']) {
                                rooms[i]['arrows'] -= 1;
                                rooms[i]['players'][j]['arrows'] += 1;
                            }
                        }
                    }
                    if (rooms[i]['arrows'] == 0) {
                        rooms[i]['arrows'] = 9;
                        for (var j = 0; j < rooms[i]['players'].length; ++j) {
                            rooms[i]['players'][j]['life'] -= rooms[i]['players'][j]['arrows'];
                            rooms[i]['players'][j]['lastdamage'] = DamageType.Indian;
                            rooms[i]['players'][j]['arrows'] = 0;
                        }           
                    }
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        sendMessage({
                            command: Network.UpdatePlayers,
                            players : JSON.stringify(rooms[i]['players']),
                            arrows : rooms[i]['arrows']
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

        case Network.Mouse:
            var _room = _json['roomname'];
            for (var i = 0; i < rooms.length; ++i) {
                if (rooms[i]['name'] == _room) {
                    for (var j = 0; j < rooms[i]['players'].length; ++j) {
                        if (rinfo['port'] != rooms[i]['players'][j]['port']) {
                            sendMessage({
                                command: Network.Mouse,
                                x: _json['x'],
                                y: _json['y'],
                                sprite: _json['sprite'],
                                socket: rinfo.port
                            }, {
                                address: rooms[i]['players'][j]['address'],
                                port: rooms[i]['players'][j]['port']
                            });
                        }
                    }
                }
            }
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

        case Network.KeepAlive:
            //console.log("KeepAlive from " + rinfo['port']);
            for (let index = 0; index < usertime.length; index++) {
                if (usertime[index]['user'] == rinfo['port']) {
                    usertime[index]['lastaction'] = Math.floor(new Date().getTime() / 1000);
                    usertime[index]['roomname'] = _json['roomname'];
                }

            }
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