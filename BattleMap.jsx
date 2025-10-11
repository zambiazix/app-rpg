import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { getAuth } from "firebase/auth";

const GRID_SIZE = 50;
const MESTRE_EMAIL = "mestre@reqviemrpg.com";
const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export default function BattleMap() {
  const navigate = useNavigate();
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [tokens, setTokens] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isMaster, setIsMaster] = useState(false);
  const fileInputRef = useRef();
  const stageRef = useRef();
  const socketRef = useRef(null);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    const auth = getAuth();
    const unsub = auth.onAuthStateChanged((user) => {
      setIsMaster(user?.email === MESTRE_EMAIL);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const s = io(serverUrl, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => console.log("Socket conectado:", s.id));
    s.on("init", (data) => setTokens(data || []));
    s.on("addToken", (token) => {
      setTokens((prev) => (prev.some((t) => t.id === token.id) ? prev : [...prev, token]));
    });
    s.on("updateToken", (token) => {
      setTokens((prev) => prev.map((t) => (t.id === token.id ? token : t)));
    });
    s.on("deleteToken", (id) => {
      setTokens((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) setSelectedId(null);
    });
    s.on("reorder", (newTokens) => setTokens(newTokens));

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [selectedId]);

  const handleFileUpload = async (e) => {
    if (!isMaster) return alert("Apenas o Mestre pode adicionar tokens.");
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch(`${serverUrl}/upload`, { method: "POST", body: formData });
      const data = await resp.json();
      if (!data?.url) throw new Error("Upload falhou");
      const token = {
        id: Date.now(),
        src: data.url,
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      };
      socketRef.current?.emit("addToken", token);
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro no upload: " + (err.message || err));
    }
  };

  const emitUpdate = (token) => {
    const now = Date.now();
    const THROTTLE_MS = 60;
    if (now - lastEmitRef.current > THROTTLE_MS) {
      lastEmitRef.current = now;
      socketRef.current?.emit("updateToken", token);
    }
  };

  const updateTokenFinal = (token) => {
    socketRef.current?.emit("updateToken", token);
  };

  const reorderAndEmit = (newOrder) => {
    if (!isMaster) return;
    setTokens(newOrder);
    socketRef.current?.emit("reorder", newOrder);
  };

  const bringForward = () => {
    if (!selectedId || !isMaster) return;
    setTokens((prev) => {
      const idx = prev.findIndex((t) => t.id === selectedId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx + 1, 0, item);
      reorderAndEmit(arr);
      return arr;
    });
  };

  const sendBackward = () => {
    if (!selectedId || !isMaster) return;
    setTokens((prev) => {
      const idx = prev.findIndex((t) => t.id === selectedId);
      if (idx <= 0) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx - 1, 0, item);
      reorderAndEmit(arr);
      return arr;
    });
  };

  const deleteToken = () => {
    if (!selectedId || !isMaster) return;
    socketRef.current?.emit("deleteToken", selectedId);
    setSelectedId(null);
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    setScale(newScale);
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setStagePos(newPos);
  };

  const handleMouseDown = (e) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (e.evt.button === 2 && e.target === stage) {
      e.evt.preventDefault();
      stage.draggable(true);
      stage.startDrag();
      setSelectedId(null);
    }
    if (e.evt.button === 0 && e.target === stage) {
      setSelectedId(null);
    }
  };
  const handleMouseUp = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (stage.draggable()) {
      stage.stopDrag();
      stage.draggable(false);
      setStagePos({ x: stage.x(), y: stage.y() });
    }
  };

  return (
    <div style={{ background: "#222", height: "100vh" }} onContextMenu={(e) => e.preventDefault()}>
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}>
        <button onClick={() => navigate("/")}>Voltar</button>
        {isMaster && (
          <>
            <button onClick={() => fileInputRef.current.click()} style={{ marginLeft: 10 }}>
              Adicionar Token
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*"
              onChange={handleFileUpload}
            />
            {selectedId && (
              <>
                <button onClick={bringForward} style={{ marginLeft: 10 }}>
                  Para Frente
                </button>
                <button onClick={sendBackward} style={{ marginLeft: 10 }}>
                  Para Trás
                </button>
                <button onClick={deleteToken} style={{ marginLeft: 10, color: "red" }}>
                  Excluir
                </button>
              </>
            )}
          </>
        )}
      </div>

      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        draggable={false}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <Layer>
          {tokens.map((token) => (
            <Token
              key={token.id}
              token={token}
              isSelected={isMaster && selectedId === token.id}
              onSelect={() => isMaster && setSelectedId(token.id)}
              canResize={isMaster}
              onMoveDuring={(attrs) => emitUpdate({ ...token, ...attrs })}
              onDragEnd={(attrs) => updateTokenFinal({ ...token, ...attrs })}
              onTransformEnd={(attrs) =>
                isMaster && updateTokenFinal({ ...token, ...attrs })
              }
            />
          ))}
        </Layer>

        <Layer>
          {Array.from({ length: 200 }).map((_, i) => (
            <Line
              key={`v-${i}`}
              points={[i * GRID_SIZE - 5000, -5000, i * GRID_SIZE - 5000, 5000]}
              stroke="#555"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 200 }).map((_, i) => (
            <Line
              key={`h-${i}`}
              points={[-5000, i * GRID_SIZE - 5000, 5000, i * GRID_SIZE - 5000]}
              stroke="#555"
              strokeWidth={1}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function Token({ token, isSelected, onSelect, onMoveDuring, onDragEnd, onTransformEnd, canResize }) {
  const [image] = useImage(token.src, "anonymous");
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current && canResize) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, canResize]);

  if (!image) return null;

  return (
    <>
      <KonvaImage
        image={image}
        x={token.x}
        y={token.y}
        width={token.width}
        height={token.height}
        draggable
        onClick={onSelect}
        ref={shapeRef}
        onDragMove={(e) => onMoveDuring?.({ x: e.target.x(), y: e.target.y() })}
        onDragEnd={(e) => onDragEnd?.({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          if (!canResize) return;
          const node = shapeRef.current;
          const newAttrs = {
            x: node.x(),
            y: node.y(),
            width: node.width() * node.scaleX(),
            height: node.height() * node.scaleY(),
          };
          node.scaleX(1);
          node.scaleY(1);
          onTransformEnd?.(newAttrs);
        }}
      />
      {isSelected && canResize && <Transformer ref={trRef} />}
    </>
  );
}
