"use client";
import { useEffect, useRef } from "react";

const Page = () => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const socket = new WebSocket("ws://localhost:3000");
        console.log("Connecting to WebSocket server at ws://localhost:3000");
        socket.onopen = () => {
            console.log("WebSocket connection opened");
            socket.send(JSON.stringify({ type: "identify-as-receiver" }));
        };
        let rtc: RTCPeerConnection;
        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message from server:", message);
            if (message.type === "offer") {
                rtc = new RTCPeerConnection();
                rtc.setRemoteDescription(
                    new RTCSessionDescription(message.offer)
                );
                rtc.onicecandidate = (event) => {
                    console.log("ICE candidate generated:", event.candidate);
                    if (event.candidate) {
                        socket.send(
                            JSON.stringify({
                                type: "ice-candidate",
                                candidate: event.candidate,
                            })
                        );
                        console.log("Sent ICE candidate to sender");
                    }
                };

                rtc.ontrack = (event) => {
                    console.log("Received track from sender", event.track);
                    if (videoRef.current) {
                        // Prefer full stream if available (contains all tracks)
                        if (event.streams && event.streams[0]) {
                            videoRef.current.srcObject = event.streams[0];
                        } else {
                            videoRef.current.srcObject = new MediaStream([
                                event.track,
                            ]);
                        }

                        // Try to play; browsers block autoplay with sound. We set muted on the element
                        // (see attributes on the element below) so this should usually succeed.
                        const playPromise = videoRef.current.play();
                        if (
                            playPromise &&
                            typeof playPromise.then === "function"
                        ) {
                            playPromise
                                .then(() =>
                                    console.log("Playing received video stream")
                                )
                                .catch((err) =>
                                    console.warn(
                                        "Autoplay prevented, user interaction required",
                                        err
                                    )
                                );
                        }
                    }
                };

                const answer = await rtc.createAnswer();
                await rtc.setLocalDescription(answer);
                socket.send(
                    JSON.stringify({
                        type: "answer",
                        answer: rtc.localDescription,
                    })
                );
                console.log("Sent answer back to sender");
            } else if (message.type === "ice-candidate") {
                rtc.addIceCandidate(new RTCIceCandidate(message.candidate));
                console.log("Added ICE candidate from sender");
            }
        };
    }, []);

    const handleStart = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
                videoRef.current.muted = false;
            } catch (err) {
                console.error("Play failed on user interaction", err);
            }
        }
    };

    return (
        <div>
            <p>receiver page</p>
            <video
                ref={videoRef}
                muted
                autoPlay
                playsInline
                style={{ width: "100%", maxWidth: 640, background: "black" }}
                className="transform -scale-x-100"
            ></video>
            <div>
                <button onClick={handleStart}>Start (unmute)</button>
            </div>
        </div>
    );
};

export default Page;
