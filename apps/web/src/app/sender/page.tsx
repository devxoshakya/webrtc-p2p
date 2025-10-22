"use client";
import { useEffect, useState, type MouseEvent } from "react";

const Page = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    useEffect(() => {
        const socket = new WebSocket("ws://localhost:3000");
        setSocket(socket);
        console.log("Connecting to WebSocket server at ws://localhost:3000");
        socket.onopen = () => {
            console.log("WebSocket connection opened");
            socket.send(JSON.stringify({ type: "identify-as-sender" }));
        };
    }, []);

    async function startVideoStream(
        event: MouseEvent<HTMLButtonElement>
    ): Promise<void> {
        event.preventDefault();
        console.log("Starting video stream...");
        // TODO: implement video streaming logic
        const rtc = new RTCPeerConnection();

        rtc.onnegotiationneeded = async () => {
            const offer = await rtc.createOffer();
            await rtc.setLocalDescription(offer);
            socket?.send(
                JSON.stringify({ type: "offer", offer: rtc.localDescription })
            );
        };

        rtc.onicecandidate = (event) => {
            console.log("ICE candidate generated:", event.candidate);
            if (event.candidate) {
                socket?.send(
                    JSON.stringify({
                        type: "ice-candidate",
                        candidate: event.candidate,
                    })
                );
                console.log("Sent ICE candidate to receiver");
            }
        };

        socket!.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message from server:", message);
            if (message.type === "answer") {
                await rtc.setRemoteDescription(
                    new RTCSessionDescription(message.answer)
                );
                console.log("Set remote description with answer from receiver");
            }
            if (message.type === "ice-candidate") {
                rtc.addIceCandidate(new RTCIceCandidate(message.candidate));
                console.log("Added ICE candidate from receiver");
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 }, // HD resolution
                height: { ideal: 720 },
                frameRate: { ideal: 30 }, // smooth video
            },
            audio: {
                channelCount: 2, // stereo
                sampleRate: 48000, // high-quality mic
                sampleSize: 16, // 16-bit audio
                echoCancellation: true, // remove echo
                noiseSuppression: true, // reduce background noise
                // autoGainControl: true, // normalize volume
            },
        }); // console.log("Obtained local media stream", stream.getVideoTracks());
        // rtc.addTrack(stream.getVideoTracks()[0]);
        // rtc.addTrack(stream.getAudioTracks()[0]);
        stream.getTracks().forEach((track) => rtc.addTrack(track, stream));

        console.log("Added video and audio tracks to RTCPeerConnection");
    }

    return (
        <div>
            sender page <br />
            <br />
            <button onClick={startVideoStream}>Start Video Stream</button>
        </div>
    );
};

export default Page;
