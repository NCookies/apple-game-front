import React, { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WaitingRoom = ({ guestName, roomInfo, onLeaveRoom }) => {
    const [players, setPlayers] = useState([]);
    const [stompClient, setStompClient] = useState(null);

    useEffect(() => {
        const socket = new SockJS("http://localhost:8080/ws/game");
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                console.log("[WAITING_ROOM] 웹소켓 연결 성공");

                client.subscribe(`/topic/waitingRoom/${roomInfo.roomId}/player/update`, (message) => {
                    const updatedPlayers = JSON.parse(message.body);
                    console.log("👥 Players updated:", updatedPlayers);
                    setPlayers(updatedPlayers);
                });

                console.log("푸시!!!!");
                client.publish({ destination: `/app/waitingRoom/${roomInfo.roomId}/player/update` });
            },
            onDisconnect: () => {
                console.log("[WAITING_ROOM] 웹소켓 연결 끊김");
            },
        });

        client.activate();
        setStompClient(client);

        return () => {
            if (client) {
                client.deactivate(() => {
                    console.log("[WAITING_ROOM] 웹소켓 연결 해제");
                });
            }
        };
    }, []);

    const startGame = () => {
        if (stompClient) {
            console.log("🚀 Sending game start request...");
            stompClient.publish({ destination: "/app/game/start" });
        }
    };

    const leaveRoom = async () => {
        try {
            const response = await fetch(`http://localhost:8080/api/rooms/leave`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomId: roomInfo.roomId,
                    userId: guestName
                }),
            });

            if (!response.ok) {
                alert("방 퇴장 실패");
            } else {
                console.log(`방 퇴장 성공: ${roomInfo.roomId}`);
                stompClient.publish({ destination: `/app/waitingRoom/${roomInfo.roomId}/player/update` });
                onLeaveRoom(); // 로비 화면으로 이동
            }
        } catch (error) {
            console.error("방 퇴장 오류:", error);
        }
    };

    return (
        <div style={{ textAlign: "center" }}>
            <h2>Apple Game</h2>

            <h2>Room: {roomInfo.roomName}</h2>
            <p>👤 Your Nickname: <strong>{guestName}</strong></p>

            {/* 방 나가기 버튼 */}
            <button onClick={leaveRoom} style={{ marginBottom: "10px" }}>
                Leave Room
            </button>

            <h2>현재 방 인원</h2>
            <ul>
                {players.map((player) => (
                    <li key={player}>{player}</li>
                ))}
            </ul>

            <button onClick={startGame} style={{ marginBottom: "10px", padding: "10px" }}>
                Start Game
            </button>
        </div>
    );
};

export default WaitingRoom;
