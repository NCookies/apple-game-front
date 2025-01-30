import { useEffect, useRef, useState } from "react";

const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const CELL_SIZE = 50; // 사과 크기 및 간격 유지
const PADDING = 5;
const APPLE_RADIUS = (CELL_SIZE - PADDING * 2) / 2;

// 캔버스 크기 확장 (양쪽 100px씩 여백 추가)
const EXTRA_PADDING = 100;
const CANVAS_WIDTH = GRID_WIDTH * CELL_SIZE + EXTRA_PADDING * 2;
const CANVAS_HEIGHT = GRID_HEIGHT * CELL_SIZE + EXTRA_PADDING * 2;

const generateApples = () => {
  let apples = [];
  let total = 0;
  while (total % 10 !== 0 || total === 0) {
    apples = Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, () =>
      Math.floor(Math.random() * 9) + 1
    );
    total = apples.reduce((sum, num) => sum + num, 0);
  }
  return apples;
};

const AppleGame = () => {
  const canvasRef = useRef(null);
  const [apples, setApples] = useState(generateApples);
  const [selected, setSelected] = useState([]);
  const [score, setScore] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [dragArea, setDragArea] = useState(null);
  const [animations, setAnimations] = useState({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 전체 배경색
      ctx.fillStyle = "#f4f1de";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 사과 그리기 (위치는 그대로 유지)
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
          ctx.font = "24px Arial"; // 숫자 크기
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
    audio.play();
  };

  const animateApples = (indices) => {
    let frame = 0;
    const interval = setInterval(() => {
      setAnimations((prev) => {
        const newAnimations = { ...prev };
        indices.forEach((index) => {
          newAnimations[index] = 1 - frame / 10;
        });
        return newAnimations;
      });

      frame++;
      if (frame > 10) {
        clearInterval(interval);
        setApples((prev) => prev.map((val, idx) => (indices.includes(idx) ? 0 : val)));
        setAnimations((prev) => {
          const newAnimations = { ...prev };
          indices.forEach((index) => delete newAnimations[index]);
          return newAnimations;
        });
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
    <div>
      <p>Score: {score}</p>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH} // 캔버스 크기 증가
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
