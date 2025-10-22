
// global state for sender and receiver sockets

let senderSocket:   Bun.ServerWebSocket | null = null;
let receiverSocket:  Bun.ServerWebSocket | null = null;


Bun.serve({
    port : 3000,
	fetch(req, server) {
		// upgrade the request to a WebSocket
		if (server.upgrade(req)) {
            console.log("WebSocket connection established");
			return; // do not return a Response
		}
		return new Response('Upgrade failed', {status: 500});
	},
	websocket: {
        
		message(ws, message : any) {
            
            if (typeof message === "string") {
                try {
                    console.log("Received string message:", message);
                    message = JSON.parse(message);
                } catch (e) {
                    console.error("Failed to parse message as JSON:", e);
                    return;
                }
            }

            if(message.type === "identify-as-sender") {
                senderSocket = ws;
                console.log("Socket identified as sender");
                return;
            }
            else if(message.type === "identify-as-receiver") {
                receiverSocket = ws;
                console.log("Socket identified as receiver");
                return;
            }
            else if(message.type === "offer" && receiverSocket) {
                receiverSocket.send(JSON.stringify(message));
                console.log("Forwarded offer to receiver");
                return;
            }
            else if(message.type === "answer" && senderSocket) {
                senderSocket.send(JSON.stringify(message));
                console.log("Forwarded answer to sender");
                return;
            }
            else if(message.type === "ice-candidate") {
                if(ws === senderSocket && receiverSocket) {
                    receiverSocket.send(JSON.stringify(message));
                    console.log("Forwarded ICE candidate from sender to receiver");
                    return;
                }
                else if(ws === receiverSocket && senderSocket) {
                    senderSocket.send(JSON.stringify(message));
                    console.log("Forwarded ICE candidate from receiver to sender");
                    return;
                }
            }
		}, 

	},
});