import './App.css';
import React, { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import Lobby from "./components/Lobby";
import WaitingRoom from "./components/WaitingRoom";
import AppleGame from "./components/AppleGame";

const generateGuestName = () => {
	const randomNumber = Math.floor(10000 + Math.random() * 90000); // 5자리 랜덤 숫자
	return `GUEST_${randomNumber}`;
};

const App = () => {
	// 현재 상태 관리
	const [currentRoom, setCurrentRoom] = useState(null);
	const [currentScreen, setCurrentScreen] = useState("Lobby");

	// 랜덤 UUID 닉네임
	const [guestName, setGuestName] = useState("");

	// 대기실 & 인게임 웹소켓 객체
	const [stompClient, setStompClient] = useState(null);
	// 웹소켓 연결 여부 확인용 변수
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		// 브라우저에 저장된 guestName이 없으면 새로 생성
		let storedGuestName = sessionStorage.getItem("guestName");

		if (!storedGuestName) {
			console.log("새로운 guestName 생성:", storedGuestName);
			storedGuestName = generateGuestName();
			sessionStorage.setItem("guestName", storedGuestName);
		}
		console.log("현재 guestName:", storedGuestName);
		setGuestName(storedGuestName);

		const client = new Client({
			webSocketFactory: () => new SockJS("http://localhost:8080/ws/game"),
			reconnectDelay: 5000,
			onConnect: () => {
				console.log("[GAME] 웹소켓 연결 성공");
				setIsConnected(true);
			},
			onDisconnect: () => {
				console.log("[GAME] 웹소켓 연결 끊김");
				setIsConnected(false);
			},
			onStompError: (frame) => {
				console.log("[GAME] 웹소켓 에러 발생", frame);
				setIsConnected(false);
			}
		});

		setStompClient(client);
	}, []);

	// 방 입장
	const joinRoom = (room) => {
		stompClient.activate();
		setCurrentRoom(room);
		setCurrentScreen("WaitingRoom");
	};

	// 방 나가기
	const leaveRoom = () => {
		stompClient.deactivate();
		setCurrentRoom(null);
		setCurrentScreen("Lobby");
	};

	return (
		<div>
			{guestName ? (
				<>
					{/* 로비 화면 */}
					{currentScreen === "Lobby" && (
						<Lobby guestName={guestName} onJoinRoom={joinRoom} />
					)}

					{/* 대기실 화면 */}
					{currentScreen === "WaitingRoom" && (
						<WaitingRoom
							guestName={guestName}
							roomInfo={currentRoom}
							stompClient={stompClient}
							isConnected={isConnected}
							onLeaveRoom={leaveRoom}
						/>
					)}

					{/* 게임 화면 */}
					{currentScreen === "AppleGame" && (
						<AppleGame 
						guestName={guestName} 
						onJoinRoom={joinRoom} />
					)}
				</>
			) : (
				<p>Loading...</p>
			)}
		</div>
	);
};

export default App;
