var socket = io.connect('http://localhost:3000');

while (!pseudo) {
    var pseudo = prompt('Bienvenue ! Veuillez entrer un pseudo s\'il vous plait')
}

const bot = 'TruityBot';

socket.emit('pseudo', pseudo);
socket.emit('oldWhispers', pseudo);
document.title = 'Hello '+ pseudo + ' - ' + document.title;

// submit msg :
document.getElementById('chatForm').addEventListener('submit', (e)=> {
    e.preventDefault();

    const textInput = document.getElementById('msgInput').value;
    
    document.getElementById('msgInput').value = '';

    //On récupère le destinataire du message
    const receiver = document.getElementById('receiverInput').value;

    if (textInput.length > 0) {
        socket.emit('newMessage', textInput, receiver);
            if (receiver === "all") {
            createElementFunction('newMessageMe', textInput);
            //console.log(textInput);
            }
    } else {
        return false;
    }
});


// Events :

socket.on('newUser', (pseudo) => {
    createElementFunction('newUser', pseudo);
});

socket.on('quitUser', (pseudo) => {
    createElementFunction('quitUser', pseudo);
});

socket.on('newMessageAll', (content) => {
    createElementFunction('newMessageAll', content);
});

socket.on('writting', (pseudo) => {
    document.getElementById('isWritting').textContent = pseudo + ' est en train d\'écrire...';
});

socket.on('notWritting', () => {
    document.getElementById('isWritting').textContent = '';
});

socket.on('oldMessages', (messages) => {
    messages.forEach(message => {
        //Si le pseudo est le mm que celui de la dernière fois alors on crée l'element
        if(message.sender === pseudo) {
            createElementFunction('oldMessagesMe', message);
        } else {
            // Si c'est qqun d'autre 
            createElementFunction('oldMessages', message);
        }
    })
})

socket.on('whisper', (content) => {
    createElementFunction('whisper', content);
});

socket.on('oldWhispers', (messages) => {
    messages.forEach(message => {
        createElementFunction('oldWhispers', message);
    });
})
socket.on('iChangeChan', (channels) => {
    if(channels.previousChannel) {
        document.getElementById(channels.previousChannel).classList.remove('inChannel');
    }
    document.getElementById(channels.newChannel).classList.add('inChannel');
});



// Events pour ROOMS :
socket.on('newChannel', (newChannel) => {
    createChannel(newChannel);
})

// Function création rooms :
function createChannel(newChannel) {
    const newChannelItem = document.createElement('li');

    newChannelItem.classList.add('elementList');
    newChannelItem.id = newChannel;

    newChannelItem.setAttribute('onclick', "_joinRoom('"+ newChannel + "')");

    document.getElementById('roomList').insertBefore(newChannelItem, document.getElementById('newChanBtn'))
}


function _joinRoom(channel) {
    // A la création du chan on efface tous les msg visibles
    document.getElementById('msgContainer').innerHTML = '';
    // changer de chan :
    socket.emit('changeChannel', channel);
}

// function createChannel du btn <li>
function _createChannel() {
    while(!newChannel) {
        var newChannel = prompt('Comment s\'appelera ce nouveau channel ?');
    }

    createChannel(newChannel);
    _joinRoom(newChannel);
}


// Functions :

function writting() {
    socket.emit('writting', pseudo);
}

function notWritting() {
    socket.emit('notWritting');
}

// Heure
var moment = new Date();
var D = moment.getDay();
var M = moment.getMonth();
var H = moment.getHours();
var Mn = moment.getMinutes();

console.log(D +'/'+ M + ' - ' + H + ':' + Mn);
const time = '<p id="hour">'+D +'/'+ M + ' - ' + H + ':' + Mn+'<p>';


function createElementFunction(element, content) {
    const newElement = document.createElement("div");

    switch(element) {

        case 'newUser':
            newElement.classList.add(element, 'message');
            newElement.innerHTML = bot + ' : Hey ! ' + content + ' a rejoint le chat !';
            document.getElementById('msgContainer').appendChild(newElement);
        break;

        case 'quitUser':
            newElement.classList.add(element, 'message');
            newElement.textContent = bot + ' : ' + content + ' a quitté le chat.';
            document.getElementById('msgContainer').appendChild(newElement);
        break;

        case 'newMessageMe':
            newElement.classList.add(element, 'message');
            newElement.innerHTML = time+'<span style="color:white; font-size:17px; font-weight:bold;">' + pseudo + '</span> : ' + content;
            document.getElementById('msgContainer').appendChild(newElement);
        break;

        case 'newMessageAll':
            newElement.classList.add(element, 'message');
            newElement.innerHTML =time+ '<span style="color:white; font-size:17px; font-weight:bold;">' + content.pseudo + '</span> : ' + content.message;
            document.getElementById('msgContainer').appendChild(newElement);
        break;

        case 'oldMessages':
            newElement.classList.add(element, 'message');
            newElement.innerHTML = time+'<span style="color:white; font-size:17px; font-weight:bold;">' + content.sender + '</span> : ' + content.content;
            document.getElementById('msgContainer').appendChild(newElement);
        break;

        case 'oldMessagesMe':
            newElement.classList.add('newMessageMe', 'message');
            newElement.innerHTML = time+'<span style="color:white; font-size:17px; font-weight:bold;">' + content.sender + '</span> : ' + content.content;
            document.getElementById('msgContainer').appendChild(newElement);
        break;

        case 'whisper':
            newElement.classList.add(element, 'message');
            newElement.innerHTML = time+'<span style="color:rgba(255, 255, 255, 0.63);; font-size:17px; font-weight:bold;">' + content.sender + ' vous chuchote </span> : ' + content.message;
            document.getElementById('msgContainer').appendChild(newElement);
        break;

        case 'oldWhispers':
            newElement.classList.add(element, 'message');
            newElement.innerHTML = time+ '<span style="color:rgba(255, 255, 255, 0.63);; font-size:17px; font-weight:bold;">'+content.sender + ' vous a chuchoté : </span>' + content.content;
            document.getElementById('msgContainer').appendChild(newElement);
        break;
    }
}


//Emojis

const input = document.querySelector('#msgInput')
const btn = document.querySelector('#emojiInput')
const picker = new EmojiButton({
    position: 'left-end'
})

picker.on('emoji', function (emoji){
    input.value += emoji;
})

btn.addEventListener('click', function emoji (){
    picker.pickerVisible ? picker.hidePicker() : picker.showPicker(input)
})

