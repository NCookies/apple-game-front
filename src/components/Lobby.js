import React, { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const Lobby = ({ guestName, onJoinRoom }) => {
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

        // 방 리스트 갱신
        client.subscribe("/topic/rooms", (message) => {
          const updatedRoom = JSON.parse(message.body);
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

    // 로비 화면에서 다른 화면으로 이동 시 웹소켓 연결 해제
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
      if (data) {
        setRooms(data);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  // 방 생성 요청
  const createRoom = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomName,
          userId: guestName,
          maxPlayers: 8
        }),
      });

      if (!response.ok) {
        throw new Error("방 생성 실패");
      }

      const data = await response.json();
      joinRoom(data.roomId);  // 생성한 방에 바로 입장
    } catch (error) {
      console.error("방 생성 오류:", error);
    }
  };

  // 방 입장 요청
  const joinRoom = async (roomId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/rooms/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          roomId: roomId, 
          userId: guestName 
        }),
      });

      if (!response.ok) {
        alert("방 입장 실패! 방이 가득 찼거나 존재하지 않습니다.");
      } else {
        onJoinRoom(roomId); // 방 입장 성공 시 게임 화면으로 이동
      }
    } catch (error) {
      console.error("방 입장 오류:", error);
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