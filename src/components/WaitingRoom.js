import React, { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WaitingRoom = ({ guestName, roomInfo, stompClient, isConnected, onLeaveRoom }) => {
    // 현재 방의 플레이어 리스트
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        console.log(stompClient);
        console.log(isConnected);

        return () => {
            // if (stompClient) {
            //     stompClient.deactivate(() => {
            //         console.log("[GAME] 웹소켓 연결 해제");
            //     });
            // }
        };
    }, [stompClient]);

    stompClient.onConnect = (frame) => {
        console.log("웹소켓 초기 작업 실시")

        stompClient.subscribe(`/topic/waitingRoom/${roomInfo.roomId}/player/update`, (message) => {
            const updatedPlayers = JSON.parse(message.body);
            console.log("[GAME] 플레이어 업데이트: ", updatedPlayers);
            setPlayers(updatedPlayers);
        });

        stompClient.publish({
            destination: `/app/waitingRoom/${roomInfo.roomId}/player/join` ,
            body: JSON.stringify({
                playerId: guestName
            })
        });
        stompClient.publish({ 
            destination: `/app/waitingRoom/${roomInfo.roomId}/player/update` 
        });
    }

    stompClient.onDisconnect = () => {
        leaveRoom();
    }

    const startGame = () => {
        if (stompClient) {
            console.log("Sending game start request...");
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

                // 방 퇴장 메시지 전송
                if (stompClient) {
                    stompClient.publish({
                        destination: `/app/waitingRoom/${roomInfo.roomId}/player/update`
                    });
                }
                onLeaveRoom(); // 로비 화면으로 이동
            }
        } catch (error) {
            // 마지막 남은 인원이 방에서 퇴장할 시 방이 삭제되기 때문에 publish 하는 코드에서 에러 발생
            // 추후 이를 처리해줘야 함
            /*
            WaitingRoom.js:82 방 퇴장 오류: TypeError: There is no underlying STOMP connection
                at Client._checkConnection (client.ts:678:1)
                at Client.publish (client.ts:671:1)
                at leaveRoom (WaitingRoom.js:75:1)
            */
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
