import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const CELL_SIZE = 50;
const PADDING = 5;
const APPLE_RADIUS = (CELL_SIZE - PADDING * 2) / 2;
const EXTRA_PADDING = 100;
const CANVAS_WIDTH = GRID_WIDTH * CELL_SIZE + EXTRA_PADDING * 2;
const CANVAS_HEIGHT = GRID_HEIGHT * CELL_SIZE + EXTRA_PADDING * 2;

const AppleGame = ({ guestName, roomInfo, stompClient, isConnected, onEndGame }) => {
	// 초기화 함수들이 최초 한 번만 실행되도록 하기 위해 사용
	// 개발 과정에서 static mode 때문에 두 번씩 useEffect()가 실행되는 문제 해결
	const hasInitialized = useRef(false);

	// 여러 구독 객체들을 하나의 배열에서 관리하기 위해 사용
	const subscriptionsRef = useRef([]);

	const [countdown, setCountdown] = useState(3);
	const [score, setScore] = useState(0);

	// 게임 동작 관련
	const canvasRef = useRef(null);
	const [apples, setApples] = useState([]);
	const [selected, setSelected] = useState([]);
	const [dragStart, setDragStart] = useState(null);
	const [dragArea, setDragArea] = useState(null);
	const [animations, setAnimations] = useState({});

	useEffect(() => {
		// 아래 코드가 최초 한 번만 실행되도록
		if (hasInitialized.current) return;
		hasInitialized.current = true;

		// 여러 구독 객체들을 하나의 배열에 저장
		subscriptionsRef.current.push(
			stompClient.subscribe(`/topic/gameRoom/${roomInfo.roomId}/game/countdown`, (message) => {
				console.log(("[GMAE] 게임 시작 카운트다운:", JSON.parse(message.body)));
				setCountdown(JSON.parse(message.body));
			})
		);

		subscriptionsRef.current.push(
			stompClient.subscribe(`/topic/gameRoom/${roomInfo.roomId}/game/start`, (message) => {
				console.log(("[GMAE] 게임 시작!!"));
				setCountdown(message.body);
			})
		);

		subscriptionsRef.current.push(
			stompClient.subscribe("/topic/gameState", (message) => {
				const gameData = JSON.parse(message.body);
				console.log("🎯 Game state received:", gameData);
				setApples(gameData.apples);
			})
		);

		subscriptionsRef.current.push(
			stompClient.subscribe("/topic/appleUpdate", (message) => {
				const { removedIndices } = JSON.parse(message.body);
				console.log("🍏 Apples removed:", removedIndices);
				setApples((prev) =>
					prev.map((val, idx) => (removedIndices.includes(idx) ? 0 : val))
				);
			})
		);


		// 호스트가 게임 시작 요청
		if (roomInfo.hostUserId === guestName) {
			console.log("[GAME] 게임 시작 카운트다운 요청");
			stompClient.publish({
				destination: `/app/gameRoom/${roomInfo.roomId}/game/start-countdown`,
			});
		}

		return () => {
			// 모든 구독 해제
			console.log("[GAME] 구독 해제");
			subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
		};
	}, []);

	// 🔥 캔버스 그리기 (사과, 선택 영역, 애니메이션)
	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");

		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			ctx.fillStyle = "#f4f1de";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			apples.forEach((value, index) => {
				if (value !== 0) {
					const x = (index % GRID_WIDTH) * CELL_SIZE + CELL_SIZE / 2 + EXTRA_PADDING;
					const y = Math.floor(index / GRID_WIDTH) * CELL_SIZE + CELL_SIZE / 2 + EXTRA_PADDING;
					const scale = animations[index] !== undefined ? animations[index] : 1;

					ctx.beginPath();
					ctx.arc(x, y, APPLE_RADIUS * scale, 0, Math.PI * 2);
					ctx.fillStyle = selected.includes(index) ? "blue" : "red";
					ctx.fill();
					ctx.strokeStyle = "black";
					ctx.stroke();

					ctx.fillStyle = "white";
					ctx.font = "24px Arial";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(value, x, y);
				}
			});

			if (dragArea) {
				ctx.fillStyle = "rgba(0, 0, 255, 0.3)";
				ctx.fillRect(dragArea.x, dragArea.y, dragArea.width, dragArea.height);
			}
		};

		draw();
	}, [apples, selected, dragArea, animations]);


	const playSound = () => {
		const audio = new Audio("/sounds/pop.mp3");
		audio.play().catch((error) => console.log("Audio playback failed:", error));
	};

	// 🔥 사과 애니메이션 (점점 작아지면서 사라짐)
	const animateApples = (indices) => {
		let frame = 0;
		const interval = setInterval(() => {
			setAnimations((prev) => {
				const newAnimations = { ...prev };
				indices.forEach((index) => {
					newAnimations[index] = 1 - frame / 10; // 1에서 0까지 줄어들면서 사라지는 효과
				});
				return newAnimations;
			});

			frame++;
			if (frame > 10) {
				clearInterval(interval);

				// 🔹 사과 실제 삭제
				setApples((prev) => prev.map((val, idx) => (indices.includes(idx) ? 0 : val)));

				// 🔹 애니메이션 정보 삭제
				setAnimations((prev) => {
					const newAnimations = { ...prev };
					indices.forEach((index) => delete newAnimations[index]);
					return newAnimations;
				});

				// 🔹 서버에 사과 제거 정보 전송
				if (stompClient) {
					stompClient.publish({
						destination: "/app/apple/remove",
						body: JSON.stringify({ removedIndices: indices }),
					});
				}
			}
		}, 30);
	};

	const handleMouseDown = (e) => {
		const rect = canvasRef.current.getBoundingClientRect();
		const startX = e.clientX - rect.left;
		const startY = e.clientY - rect.top;
		setDragStart({ x: startX, y: startY });
		setDragArea({ x: startX, y: startY, width: 0, height: 0 });
		setSelected([]);
	};

	const handleMouseMove = (e) => {
		if (dragStart) {
			const rect = canvasRef.current.getBoundingClientRect();
			const currentX = e.clientX - rect.left;
			const currentY = e.clientY - rect.top;
			const newArea = {
				x: Math.min(dragStart.x, currentX),
				y: Math.min(dragStart.y, currentY),
				width: Math.abs(currentX - dragStart.x),
				height: Math.abs(currentY - dragStart.y),
			};
			setDragArea(newArea);

			const newSelected = apples
				.map((_, index) => {
					const appleX = (index % GRID_WIDTH) * CELL_SIZE + CELL_SIZE / 2 + EXTRA_PADDING;
					const appleY = Math.floor(index / GRID_WIDTH) * CELL_SIZE + CELL_SIZE / 2 + EXTRA_PADDING;
					if (
						appleX + APPLE_RADIUS >= newArea.x &&
						appleX - APPLE_RADIUS <= newArea.x + newArea.width &&
						appleY + APPLE_RADIUS >= newArea.y &&
						appleY - APPLE_RADIUS <= newArea.y + newArea.height
					) {
						return index;
					}
					return null;
				})
				.filter((val) => val !== null);
			setSelected(newSelected);
		}
	};

	const handleMouseUp = () => {
		const sum = selected.reduce((acc, index) => acc + apples[index], 0);
		if (sum === 10) {
			playSound();
			animateApples(selected);
			setScore((prev) => prev + selected.length);
		}
		setSelected([]);
		setDragArea(null);
		setDragStart(null);
	};

	return (
		<div style={{ textAlign: "center" }}>
			<h1>방 {roomInfo.roomId} 카운트다운: {countdown}</h1>
			<h2>Apple Game</h2>

			<h2>Room: {roomInfo.roomName}</h2>
			<p>👤 Your Nickname: <strong>{guestName}</strong></p>

			<p>Score: {score}</p>

			<canvas
				ref={canvasRef}
				width={CANVAS_WIDTH}
				height={CANVAS_HEIGHT}
				className="border"
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
			/>
		</div>
	);
};

export default AppleGame;
