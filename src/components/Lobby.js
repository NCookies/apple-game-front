import React, { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const Lobby = ({ guestName }) => {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    const socket = new SockJS("http://localhost:8080/ws/lobby");
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("LOBBY 웹소켓 연결 성공!");

        client.subscribe("/topic/rooms", (message) => {
          const updatedRoom = JSON.parse(message.body);
          console.log("방 정보 갱신", updatedRoom);
          setRooms((prevRooms) => {
            const roomExists = prevRooms.some((room) => room.roomId === updatedRoom.roomId);
            
            return roomExists
              ? prevRooms.map((room) =>
                  room.roomId === updatedRoom.roomId ? updatedRoom : room
                )
              : [...prevRooms, updatedRoom];
          });
        });
      },
      onDisconnect: () => {
        console.log("LOBBY 웹소켓 연결 끊김!");
      },
    });

    client.activate();
    setStompClient(client);

    // 초기 접속 시 방 목록을 가져옴
    fetchRooms();

    return () => {
      if (client) {
        client.deactivate(() => {
          console.log("LOBBY 웹소켓 연결 해제!");
        });
      }
    };
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/rooms");
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  const createRoom = async () => {
    if (stompClient) {
      console.log("방 생성 요청");
      stompClient.publish({
        destination: "/app/rooms/create",
        body: JSON.stringify({
          roomName: roomName,
          userId: guestName,
          maxPlayers: 8
        }),
      });
    }
  };

  // 방 입장 요청
  const joinRoom = async (roomId) => {
    if (stompClient) {
      console.log(`방 입장: ${roomId}`);
      stompClient.publish({
        destination: "/app/rooms/join",
        body: JSON.stringify({ 
          roomId: roomId, 
          userId: guestName 
        }),
      });
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Game Lobby</h2>
      <div>
        <input
          type="text"
          placeholder="Enter room name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <button onClick={createRoom}>Create Room</button>
      </div>

      <h3>Available Rooms</h3>
      <table border="1" cellPadding="10" style={{ margin: "auto" }}>
        <thead>
          <tr>
            <th>Room Name</th>
            <th>Host</th>
            <th>Players</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.roomId}>
              <td>{room.roomName}</td>
              <td>{room.hostUserId}</td>
              <td>{room.currentPlayers} / {room.maxPlayers}</td>
              <td>{room.isJoinable ? "Joinable" : "Full"}</td>
              <td>
                {room.isJoinable ? (
                  <button onClick={() => joinRoom(room.roomId)}>Join</button>
                ) : (
                  <button disabled>Full</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Lobby;