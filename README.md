waxModem
========

sms2web2mail en client/serveur sous Node.js, MongoDB, Socket.io ... smtp, pop3, telnet et modem !!

1_Installer Node.js : http://nodejs.org/

2_Installer MongoDB : http://docs.mongodb.org/manual/installation/

3_Commandes shell de MongoDB et de waxModemServeur :

    $ mongod
    $ node chemin/de/waxModem/app.js

4_Ouvrir waxModemClient 1.0.0.app pour se connecter à waxModem

5_Fonctionnalités :

    - Gestion des utilisateurs
        .Option raccrochage automatique avec retour mail
        .Option accusé de reception par mail des sms reçus

    - Paramétrage du modem, smtp et pop3

    - Appel numéro court (solde, rechargement de credit...)

    - Execution de scripts à la reception sms/mail d'un mot clef

    - Envoi de sms

    - Historique des sms envoyés et recus

NB : mail2sms : Envoi SMS des mails reçus (pop3) ayant pour sujet : numero@message#

I stay tuned ツ
