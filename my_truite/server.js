const express = require('express');
const app = express();
const mongoose = require('mongoose');
var server = require('http').createServer(app);

//BDD
const ObjectId = mongoose.Types.ObjectId;
//connexion Mongo
mongoose.connect('mongodb://localhost/ChatSocket', { useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection
db.on('error',(error)=>console.error(error))
db.once('open',() =>console.log("Connexion MongoDB -> OK !"));

require('./models/user.model');
require('./models/room.model');
require('./models/chat.model');

// Rentrer les models en variables 
var User = mongoose.model('user');
var Room = mongoose.model('room');
var Chat = mongoose.model('chat');



// Initialisation du dossier root en var static
app.use(express.static(__dirname + "/public"));


// ROUTER of the death
app.get("/", function(req, res) {
    User.find((err, users) => {

        if(users) {

            Room.find((err, channels) => {
                if(channels) {
                  // Si users et rooms alors on envoie les deux
                    res.render('index.ejs', {users: users, channels: channels})
                } else {
                  // Si pas de room juste vue avec users
                  res.render('index.ejs', {users: users});
                }
            })

        } else {
            Room.find((err, channels) => {
                if(channels) {
                  res.render('index.ejs', {channels: channels});
                } else {
                  res.sender('index.ejs');
                }
            });
          
        }
    })
});
// PROBLÈME avec socket /!\ : Si on ne met pas toutes les conditions possibles
// EXEMPLE donne room avec users mais il n'y a pas de users -> Socket lève des erreurs


app.use(function(req, res, next) {
  res.status(404).send('page introuvable');
});

//css
app.set('view engine', 'ejs');

// IO
var io = require('socket.io').listen(server);
var connectedUsers = []

// Connexion
io.on('connection', (socket) => {

  
// Machin est connecté
  socket.on('pseudo', (pseudo) => {

    // Recherche si pseudo = pseudo ?
    User.findOne({pseudo: pseudo}, (err, user) => {

      if(user) {
        //S'il existe alors le pseudo rentre en socket + avertissement qu'il est connecté
        socket.pseudo = pseudo;

        //Fonction pour channels
        // A la connexion, rejoint le salon Général :
        _joinRoom('Général');

        connectedUsers.push(socket);
        socket.broadcast.emit('newUser', pseudo);
        
      } else {
        //Sinon on l'insert
        var newUser = new User({name: pseudo});
        newUser.pseudo = pseudo;
        
        newUser.save(function(err) {
          if(err) { 
            console.log(err);
          } else {
            console.log(pseudo);
          }
        });

        socket.pseudo = pseudo;
        // Affichage entrée user dans le chan
        socket.broadcast.emit('newUser', pseudo);

        _joinRoom('Général');

        // add personnes connectées
        connectedUsers.push(socket);

        // Garder les anciens messages :
        // add receiver:all pour msg perso       PLUS BESOIN CAR MTN ROOM
        // Chat.find({receiver:'all'},(err, messages) => {
        //   socket.emit('oldMessages', messages)
    // });
      }


      // Socket messages persos
      socket.on('oldWhispers', (pseudo) => {
        Chat.find({ receiver: pseudo }, (err, messages) => {

          if(err) {
            return false;
          } else {
            socket.emit('oldWhispers', messages)
          }

        }).limit(3); //limite les messages privés à 3

      });


    })
  });

  // Machin est déconnecté
  socket.on('disconnect', () => {
    var index = connectedUsers.indexOf(socket);
    if (index > -1){
      connectedUsers.splice(index, 1);
    }
    socket.broadcast.emit('quitUser', socket.pseudo);
  });

  //New msg
  socket.on('newMessage', (message, receiver) => {
    if(receiver === "all"){

      var chat = new Chat();
      // Récupération du chan stocké dans la socket :
      chat._id_room = socket.channel;
      //Récup pseudo :
      chat.sender = socket.pseudo;
      //Récup destinataire
      chat.receiver = receiver;
      //Récup msg
      chat.content = message;
      chat.save();

      // puis affichage //Add 'to.(socket.channel)'
      // -> pour emettre le msg aux prsn QUE dans CE channel et plus à tout le monde
      socket.broadcast.to(socket.channel).emit('newMessageAll', {message: message, pseudo: socket.pseudo});

    } else {

      User.findOne({pseudo: receiver}, (err, user) => {

        if (!user){
          return false;
        } else {

          socketReceiver = connectedUsers.find(element => element.pseudo === user.pseudo);

          if (socketReceiver) {
            socketReceiver.emit('whisper', {sender: socket.pseudo, message: message});
          }

          var chat = new Chat();

          chat.sender = socket.pseudo;
          chat.receiver = receiver;
          chat.content = message;
          chat.save();
        }
      });


    }

  });

// Machin est en train d'écrire
  socket.on('writting', (pseudo) => {
    socket.broadcast.to(socket.channel).emit('writting', pseudo);
  });

// Pas en train d'écrire
  socket.on('notWritting', () => {
    socket.broadcast.to(socket.channel).emit('notWritting');
  });


// écouter d'events pour la fonction joinRoom
// socket rejoint le salon que le user veut rejoindre :
socket.on('changeChannel', (channel) => {
  _joinRoom(channel);
});

// FUNCTION CHANNELS :
function _joinRoom(channelParam) {

    var previousChannel = '';
    if(socket.channel) {
        previousChannel = socket.channel;
    }

    //Si la socket est déjà dans un channel :
    socket.leaveAll();
    socket.join(channelParam);
    // stockage du socket dans les params :
    socket.channel = channelParam;

    Room.findOne({name: socket.channel}, (err, channel) => {

        // Cibler chan, s'il existe prendre anciens msg
        if(channel) {
            // si chan existe, verif si il y avait déjà des msg
            Chat.find({_id_room: socket.channel}, (err, messages) => {
                if(!messages) {
                  return false;
                } else {
                  // si il y a des msg on prend oldMessages avec l'id de la room 
                  socket.emit('oldMessages', messages, socket.pseudo);

                  // Pour voir dans quel chan on se trouve :
                  if (previousChannel) {
                      socket.emit('iChangeChan', {previousChannel: previousChannel, newChannel: socket.channel})
                  
                    } else {
                      socket.emit('iChangeChan', {newChannel: socket.channel})
                  }
                }
            })

        } else {
            //créer new chan
            var room = new Room();
            room.name = socket.channel;
            room.save();

            // Puis annoncer cette création
            socket.broadcast.emit('newChannel', socket.channel);

            // On montre qu'on est dans ce salon
            socket.emit('iChangeChan', {previousChannel: previousChannel, newChannel: socket.channel});
        }
    });
}


});

server.listen(3000, () => console.log('Lancement du serveur localhost:3000 -> OK !'));