import './App.css';
import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Lobby from "./components/Lobby";
import AppleGame from "./components/AppleGame";

const generateGuestName = () => {
  const randomNumber = Math.floor(10000 + Math.random() * 90000); // 5자리 랜덤 숫자
  return `GUEST_${randomNumber}`;
};

const App = () => {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    let storedGuestName = sessionStorage.getItem("guestName");
    // 브라우저에 저장된 guestName이 없으면 새로 생성
    if (!storedGuestName) {
      console.log("새로운 guestName 생성:", storedGuestName);
      storedGuestName = generateGuestName();
      sessionStorage.setItem("guestName", storedGuestName);
    }
    console.log("현재 guestName:", storedGuestName);
    setGuestName(storedGuestName);
  }, []);

  // 방 입장
  const joinRoom = (roomId) => {
    setCurrentRoom(roomId);
  };

  // 방 나가기
  const leaveRoom = () => {
    setCurrentRoom(null);
  };

  return (
    <div>
      {guestName ? (
        currentRoom ? (
          <AppleGame guestName={guestName} roomId={currentRoom} onLeaveRoom={leaveRoom} />
        ) : (
          <Lobby guestName={guestName} onJoinRoom={joinRoom} />
        )
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default App;
