
const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const HTTP_PORT = 8000;
const app = express();
app.use('/static', express.static(path.join(__dirname, 'public')));
const wss = new WebSocket.Server({ port: 8885 });
const clients= new Map();
const clientnosend=new Set();

wss.on('connection', function connection(ws) {

	const clientid=Math.random().toString(36).substring(7);
	clients.set(clientid,ws);

	ws.on('message', function incoming(message) {

		if (message === 'exclude_me'){
			clientnosend.add(ws);
			console.log("ECLUIDO");
			return;
		}

		clients.forEach((client, id) => {

			if (id !== clientid && !clientnosend.has(id)) {
				// console.log(message);
				client.send(message);
			}

		});
	});

	ws.send('Welcome to the WebSocket server!');

});

app.get('/client',(_req,res)=>{ res.sendFile(path.resolve(__dirname,'./public/client.html')); });

app.listen(HTTP_PORT,()=>{ console.log(`HTTP server starting on ${HTTP_PORT}`); });


