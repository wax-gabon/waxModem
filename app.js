//_________________________________________________________________ HTTP
var express = require('express');
var app = express();
var connect = require('connect');
var server = require('http').Server(app);
var sys = require('sys');
var exec = require('child_process').exec;
var fs = require('fs');

app.get('/', function (req, res)
{
    res.sendFile(__dirname + '/HTML/index.html');
});

app.get('/app.js', function (req, res)
{
    res.send(404, 'Sorry, we cannot find that!');
});

app.use(express.static(__dirname + '/HTML'));

server.listen(8181, function (req, res)
{
    console.log('WAX Modem écoute sur http://localhost:8181');
});

//_________________________________________________________________ MongoDB
var Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    BSON = require('mongodb').pure().BSON,
    assert = require('assert');

var db = new Db('waxModem', new Server('localhost', 27017, {
    w: 'majority',
    j: 1,
    auto_reconnect: true
}), {
    safe: true
});

db.open(function (err, db)
{
    console.log("et s'est connecté à MongoDB !! ENJOY ツ﻿");
});

var SMS = db.collection('SMS');
var PARAM = db.collection('PARAM');
var USER = db.collection('USER');
var SCRIPT = db.collection('SCRIPT');


//_________________________________________________________________ Socket.io & Modem & SMTP & POP3
var io = require('socket.io')(server);

var Modem = require('modem');
var modem = Modem.Modem();
var session = Modem.Ussd_Session();
var nodemailer = require('nodemailer');

io.on('connection', function (socket)
{

    //_________________________________________________________________ Sur gestion des erreurs
    process.on('uncaughtException', function (err)
    {
        console.log('Erreur: ', err);
        if (err.message.indexOf('Serialport not open.') != -1)
        {
            socket.emit('alerte', err.message, 'Modem déconnecté !!');
        }
        else
        {
            socket.emit('alerte', err.message, '');
        }
    });

    //_________________________________________________________________ Sur ouverture HTML
    socket.on('upModem', function ()
    {

        upSendSMS(0, 10);
        upReceiveSMS(0, 10);
        socket.emit('upSMS', '', '');

        USER.findOne(
        {}, function (err, item)
        {
            if (item == null)
            {
                socket.emit('upUser', '', '', '', '', '', '');
            }
            else
            {
                socket.emit('upUser', item.user, item.pw, item.mailSMS, item.mailAR, item.textOQP, item.occuper);

            }
        });

        function puts(error, stdout, stderr)
        {
            socket.emit('paramSMS', 'Modem déconnecté !!');
            deviceOb = stdout.toString().split("\n");
            PARAM.findOne(
            {
                actif: 1
            }, function (err, item)
            {
                if (item == null)
                {
                    socket.emit('upModem', deviceOb, '', '', '', '', '', '');
                }
                else
                {
                    socket.emit('upModem', deviceOb, item.device, item.sender, item.pop3, item.smtp, item.mailUser, item.mailPw);
                   // modem.open(item.device, function ()
                   // {
                        //socket.emit('paramSMS', 'Modem ' + item.device + ' connecté !!');
                   // });
                }
            });
        }
        exec("ls /dev/tty.*", puts);

        function putsSrc(error, stdout, stderr)
        {
            popScript = stdout.toString().split("\n");

            SCRIPT.findOne(
            {}, function (err, item)
            {
                if (item == null)
                {
                    socket.emit('popScript', popScript, '', '');
                }
                else
                {
                    socket.emit('popScript', popScript, item.motClef, item.script);
                }
            });
        }
        exec("ls ./HTML/scriptModem/", putsSrc);
    });

    //_________________________________________________________________ upUser
    socket.on('upUser', function (user, pw, mailSMS, mailAR, textOQP, occuper)
    {
        if (user != '' & pw != '')
        {
            USER.update(
            {}, {
                $set: {
                    user: user,
                    pw: pw,
                    mailSMS: mailSMS,
                    mailAR: mailAR,
                    textOQP: textOQP,
                    occuper: occuper
                }
            }, {
                upsert: true,
                w: 1
            }, function (err, updated)
            {
                if (updated == 1)
                {}
            });
        }
    });

    //_________________________________________________________________ selectModem
    socket.on('selectModem', function (device)
    {
        PARAM.findOne(
        {
            device: device
        }, function (err, item)
        {
            if (item == null)
            {
                socket.emit('selectModem', '', '', '', '', '');
            }
            else
            {
                socket.emit('selectModem', item.sender, item.pop3, item.smtp, item.mailUser, item.mailPw);
            }
        });
    });

    //_________________________________________________________________ paramSMS
    socket.on('paramSMS', function (device, sender, pop3, smtp, mailUser, mailPw)
    {
        PARAM.update(
        {
            actif: 1
        }, {
            $set: {
                actif: 0
            }
        }, function (err, updated)
        {

        });

        PARAM.update(
        {
            device: device
        }, {
            actif: 1,
            device: device,
            sender: sender,
            pop3: pop3,
            smtp: smtp,
            mailUser: mailUser,
            mailPw: mailPw
        }, {
            upsert: true,
            w: 1
        }, function (err, updated)
        {
            if (updated == 1)
            {
                openDevice(device, sender, pop3, smtp, mailUser, mailPw);

               // modem.open(device, function ()
                //{
                  //  socket.emit('paramSMS', 'Modem ' + device + ' connecté !!');
                //});
            }
        });
    });

    //_________________________________________________________________ popScript
    socket.on('popScript', function (motClef)
    {
        SCRIPT.findOne(
        {
            motClef: motClef
        }, function (err, item)
        {
            if (item == null)
            {
                socket.emit('scriptSMS', '', '');
            }
            else
            {
                socket.emit('scriptSMS', item.motClef, item.script);
            }
        });
    });

    //_________________________________________________________________ supScriptSMS
    socket.on('supScriptSMS', function (motClef)
    {
        SCRIPT.findAndRemove(
        {
            motClef: motClef
        }, function (err, deleted)
        {
            if (deleted != null)
            {

                fs.unlink('./HTML/scriptModem/' + motClef + '.js', function (err)
                {
                    if (err == null)
                    {

                        SCRIPT.findOne(
                        {}, function (err, item)
                        {
                            function putsSrc(error, stdout, stderr)
                            {
                                popScript = stdout.toString().split("\n");
                                socket.emit('popScript', popScript, item.motClef, item.script);
                            }
                            exec("ls ./HTML/scriptModem/", putsSrc);
                        });
                    }
                });
            }
        });
    });

    //_________________________________________________________________ scriptSMS
    socket.on('scriptSMS', function (motClef, script)
    {
        SCRIPT.update(
        {
            motClef: motClef
        }, {
            $set: {
                motClef: motClef,
                script: script
            }
        }, {
            upsert: true,
            w: 1
        }, function (err, updated)
        {
            if (updated == 1)
            {
                fs.writeFile("./HTML/scriptModem/" + motClef + ".js", script, function (err)
                {
                    if (err != null)
                    {
                        socket.emit('alerte', 'Erreur d\'ecriture', '');
                    }
                    else
                    {
                        function putsSrc(error, stdout, stderr)
                        {
                            popScript = stdout.toString().split("\n");
                            socket.emit('popScript', popScript, motClef, script);
                        }
                        exec("ls ./HTML/scriptModem/", putsSrc);
                    }
                });
            }
        });
    });

    //_________________________________________________________________ Session
    socket.on('Session', function (code)
    {
        PARAM.findOne(
        {
            actif: 1
        }, function (err, item)
        {
            if (item == null)
            {
                socket.emit('alerte', 'Erreur de modem !!', '');
            }
            else
            {
                var gotResponse = function ()
                    {
                        socket.emit('alerte', arguments[1], '');
                    }

                session.execute = function ()
                {
                    session.query(code, gotResponse);
                    session.on('close', function ()
                    {});
                }

              //  modem.open(item.device, function ()
               // {
                    modem.ussd_pdu = false;
                    session.modem = modem;
                    session.start();
               // });
            }
        });
    });

    //_________________________________________________________________ upSendSMS

    function upSendSMS(x, y)
    {
        SMS.find(
        {
            type: 'SND'
        }, {
            sort: {
                date: -1
            },
            limit: y,
            skip: x
        }).toArray(function (err, docs)
        {
            if  (docs!=null){
            for (var i = docs.length - 1; i >= 0; i--)
            {
                socket.emit('sendSMS', docs[i].user, docs[i].sender, docs[i].receiver, docs[i].text, docs[i].statut, docs[i].date);
                socket.broadcast.emit('sendSMS', docs[i].user, docs[i].sender, docs[i].receiver, docs[i].text, docs[i].statut, docs[i].date);
            }
        }
        });
    }

    //_________________________________________________________________ upReceiveSMS

    function upReceiveSMS(x, y)
    {
        SMS.find(
        {
            type: 'RCV'
        }, {
            sort: {
                date: -1
            },
            limit: y,
            skip: x
        }).toArray(function (err, docs)
        {
            if  (docs!=null){
            for (var i = docs.length - 1; i >= 0; i--)
            {
                socket.emit('receiveSMS', docs[i].user, docs[i].sender, docs[i].receiver, docs[i].text, docs[i].statut, docs[i].date);
                socket.broadcast.emit('receiveSMS', docs[i].user, docs[i].sender, docs[i].receiver, docs[i].text, docs[i].statut, docs[i].date);
            }
            }
        });
    }

    //_________________________________________________________________ sendSMS
    socket.on('sndSMS', function (device, sender, receiver, text, user)
    {
        sendSMS(device, sender, receiver, text, user);
    });

    function sendSMS(device, sender, receiver, text, user)
    {
        PARAM.findOne(
        {
            actif: 1
        }, function (err, item)
        {
            if (item == null)
            {
                socket.emit('alerte', 'Erreur de modem !!', '');
            }
            else
            {
               // modem.open(device, function ()
                //{
                    modem.sms(
                    {
                        receiver: receiver,
                        text: text,
                        encoding: '16bit'
                    }, function (err, sent_ids)
                    {
                        if (err)
                        {
                            socket.emit('alerte', 'Erreur d\'emmission SMS !!', '');
                        }
                        else
                        {
                            var date = new Date();
                            var statut = 'Envoyé';
                            //socket.emit('sendSMS', user, sender, receiver, text, statut, date);
                            socket.emit('upSMS', '', '');
                            SMS.save(
                            {
                                type: 'SND',
                                device: device,
                                sender: sender,
                                receiver: receiver,
                                text: text,
                                user: user,
                                date: date,
                                statut: statut
                            }, function (err, saved)
                            {
                            upSendSMS(0,10);
                            });
                        }
                    });
               // });
            }
        });
    }

    //_________________________________________________________________ Sur Connexion Modem RCV

    function openDevice(device, sender, pop3, smtp, mailUser, mailPw)
    {
        
        modem.open(device, function ()
        {
            socket.emit('paramSMS', 'Modem ' + device + ' connecté !!');
            
            
            //_________________________________________________________________ Sur OQP
            modem.on('ring', function (ring)
            {
                modem.execute('AT+CHUP', function (err, response)
                {
                    console.log('USSD Response:', response)
                },true);
                var receiver = ring;
                USER.findOne(
                {
                    occuper: true
                }, function (err, item)
                {
                    if (item != null)
                    {
                        var textOQP = item.textOQP;
                        //_________________________________________________________________ sendSMS
                        modem.sms(
                        {
                            receiver: receiver,
                            text: textOQP,
                            encoding: '16bit'
                        }, function (err, sent_ids)
                        {
                            if (err)
                            {
                                socket.emit('alerte', 'Erreur d\'emmission APPEL2SMS !!', '');
                            }
                            else
                            {
                                PARAM.findOne(
                                {
                                    actif: 1,
                                    device: device
                                }, function (err, item)
                                {
                                    if (item == null)
                                    {
                                        socket.emit('alerte', 'Erreur de modem !!', '');
                                    }
                                    else
                                    {
                                        var user = 'MODEM';
                                        var sender = item.sender;
                                        var statut = 'Envoyé';
                                        var text = textOQP;
                                        var date = new Date();
                                        //socket.emit('sendSMS', user, sender, receiver, text, statut, date);
                                        SMS.save(
                                        {
                                            type: 'SND',
                                            device: device,
                                            sender: sender,
                                            receiver: receiver,
                                            text: text,
                                            user: user,
                                            date: date,
                                            statut: statut
                                        }, function (err, saved)
                                        {
                            			upSendSMS(0,10);});
                                    }
                                });
                            }
                        });
                    }
                });
            });
            
           
            
       // });
            
       // modem.open(device, function ()
       // {
            //_________________________________________________________________ Sur reception SMS
            modem.on('sms received', function (sms)
            {
                
                PARAM.findOne(
                {
                    actif: 1
                }, function (err, item)
                {
                    if (item == null)
                    {
                        socket.emit('alerte', 'Erreur de modem !!', '');
                    }
                    else
                    {
                        var receiver = item.sender;
                        //_____convertir text !! et filtrer sms invalide !!
                        //   sms.indexes[0]
                        
                        var user = 'MODEM';
                        var sender = sms.sender;
                        var text = sms.text;
                        var statut = 'Reçu';
                        var date = new Date();
                        //socket.emit('receiveSMS', user, sender, receiver, text, statut, date);
                        SMS.save(
                        {
                            type: 'RCV',
                            device: device,
                            sender: sender,
                            receiver: receiver,
                            text: text,
                            user: user,
                            date: date,
                            statut: statut,
                        }, function (err, saved)
                        {
                        upReceiveSMS(0, 10);});

                        //_________________________________________________________________ Sur Script
                        SCRIPT.findOne(
                        {
                            motClef: {
                                $regex: ".*" + text + ".*"
                            }
                        }, function (err, item)
                        {
                            if (item != null)
                            {
                                var script = require('./HTML/scriptModem/' + item.motClef + '.js')(socket, SMS, PARAM, USER, SCRIPT);
                            }
                        });

                        //_________________________________________________________________ Sur envoi eMail
                        USER.findOne(
                        {
                            mailAR: true
                        }, function (err, item)
                        {
                            if (item.user != '')
                            {
                                var transporter = nodemailer.createTransport(
                                {
                                    host: smtp,
                                    port: 25,
                                    auth: {
                                        user: mailUser,
                                        pass: mailPw
                                    }
                                });
                                var mailOptions = {
                                    from: mailUser,
                                    to: item.mailSMS,
                                    subject: sender,
                                    text: text
                                };

                                transporter.sendMail(mailOptions, function (err, info)
                                {
                                    if (err)
                                    {
                                        socket.emit('alerte', 'Erreur d\'envoi de mail !!', '');
                                    }
                                    else
                                    {
                                        var sender = mailOptions.subject;
                                        var receiver = mailOptions.to;
                                        var text = mailOptions.text;
                                        SMS.save(
                                        {
                                            type: 'MAIL',
                                            device: device,
                                            sender: sender,
                                            receiver: receiver,
                                            text: text,
                                            user: user,
                                            date: date,
                                            statut: statut
                                        }, function (err, saved)
                                        {
                        upReceiveSMS(0, 10);});
                                    }
                                });
                            }
                        });
                    }
                });
            });
        });
    }

    //_________________________________________________________________ Sur reception eMail

    function rcvMail(device, sender, pop3, smtp, mailUser, mailPw)
    {
        var net = require('net'),
            irc = {},
            config = {
                server: {
                    addr: pop3,
                    port: 110
                }
            };
        irc.socket = new net.Socket();
        var data = '';
        irc.socket.setEncoding('ascii');
        irc.socket.on('data', function (chunk)
        {
            data += chunk;
        });
        irc.socket.on('end', function ()
        {
            var smsDeb = data.indexOf('From: ');
            if (smsDeb != -1)
            {
                var dataString = data.substring(smsDeb + 6);
                var smsFin = dataString.indexOf('>') + 1;
                var sender = dataString.substring(0, smsFin);
                var smsDeb = data.indexOf('Subject: ');
                if (smsDeb != -1)
                {
                    var dataString = data.substring(smsDeb + 9);
                    var dataString = dataString.substring(0, dataString.indexOf('#'));
                    var receiver = dataString.substring(0, dataString.indexOf('@'));
                    var text = dataString.substring(dataString.indexOf('@') + 1);

                    //_________________________________________________________________ sendSMS
                   // modem.open(device, function ()
                   // {

                        modem.sms(
                        {
                            receiver: receiver,
                            text: text,
                            encoding: '16bit'
                        }, function (err, sent_ids)
                        {
                            if (err)
                            {
                                //socket.emit('alerte', 'Erreur d\'emmission MAIL2SMS !!', '');
                            }
                            else
                            {
                                var date = new Date();
                                var statut = 'Envoyé';
                                var user = 'MAIL';
                                //socket.emit('sendSMS', user, sender, receiver, text, statut, date);
                                SMS.save(
                                {
                                    type: 'SND',
                                    device: device,
                                    sender: sender,
                                    receiver: receiver,
                                    text: text,
                                    user: user,
                                    date: date,
                                    statut: statut
                                }, function (err, saved)
                                {
                            	upSendSMS(0,10);});
                            }
                        });
                    //});
                }
            }
        });

        //_________________________________________________________________ TELNET
        irc.socket.on('connect', function ()
        {
            setTimeout(function ()
            {
                irc.raw('USER ' + mailUser);
            }, 1000);
            setTimeout(function ()
            {
                irc.raw('PASS ' + mailPw);
            }, 1000);
            setTimeout(function ()
            {
                irc.raw('RETR 1');
            }, 1000);
            setTimeout(function ()
            {
                irc.raw('DELE 1');
            }, 1000);
            setTimeout(function ()
            {
                irc.raw('QUIT');
            }, 1000);
        });
        irc.socket.connect(config.server.port, config.server.addr);
        irc.raw = function (data)
        {
            irc.socket.write(data + '\n', 'ascii')
        }
    }
    
    PARAM.findOne(
    {
        actif: 1
    }, function (err, item)
    {
        if (item == null)
        {
            socket.emit('alerte', 'Erreur de modem !!', '');
        }
        else
        {
            var waxInterval = setInterval(function ()
            {
                rcvMail(item.device, item.sender, item.pop3, item.smtp, item.mailUser, item.mailPw)
            }, 1000 * 30);

            openDevice(item.device, item.sender, item.pop3, item.smtp, item.mailUser, item.mailPw);
        }
    });
});