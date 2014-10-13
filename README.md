waxModem
========

sms2web2mail en client/serveur sous Node.js, MongoDB, Socket.io ... smtp, pop3, telnet et modem !!

1_Installer Node.js : http://nodejs.org/

2_Installer MongoDB : http://docs.mongodb.org/manual/installation/

3_Commandes shell pour lancer MongoDB et waxModemServeur :

    $ mongod
    $ node chemin/de/waxModem/app.js

4_Installer Node-WebKit : https://github.com/rogerwang/node-webkit

    .Coller le contenu de waxModemClient dans ~/node-webkit.app/Contents/Resources/
    .ou lancer http://localhost:8181 (browser)

5_Fonctionnalités :

    - Gestion des utilisateurs
        .Option raccrochage automatique avec retour mail
        .Option accusé de reception par mail des sms reçus

    - Paramétrage du modem, smtp et pop3

    - Appel numéro court (solde, rechargement de credit...)

    - Execution de scripts à la réception sms/mail d'un mot clef

    - Envoi de sms

    - Historique des sms envoyés et recus

NB : mail2sms : Envoi SMS des mails reçus (pop3) ayant pour sujet : numero@message#

I stay tuned ツ
