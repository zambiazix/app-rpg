// src/components/BattleMap.jsx
import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const GRID_SIZE = 50;

export default function BattleMap() {
  const navigate = useNavigate();
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [tokens, setTokens] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const fileInputRef = useRef();
  const stageRef = useRef();
  const socketRef = useRef(null);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    // cria e conecta socket (evita múltiplas conexões em hot-reload)
    const s = io("http://localhost:5000", { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => console.log("socket conectado:", s.id));
    s.on("init", (data) => setTokens(data || []));
    s.on("addToken", (token) => {
      setTokens((prev) => (prev.some(t => t.id === token.id) ? prev : [...prev, token]));
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

  // upload -> envia para servidor, servidor retorna URL pública
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (!data?.url) throw new Error("Upload falhou");
      const token = { id: Date.now(), src: data.url, x: 100, y: 100, width: 100, height: 100 };
      socketRef.current?.emit("addToken", token);
      // cliente receberá via evento 'addToken' e atualiza state
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro no upload: " + (err.message || err));
    }
  };

  // throttle para updates contínuos (arraste)
  const emitUpdate = (token) => {
    const now = Date.now();
    const THROTTLE_MS = 60;
    if (now - lastEmitRef.current > THROTTLE_MS) {
      lastEmitRef.current = now;
      socketRef.current?.emit("updateToken", token);
    }
  };

  const updateTokenFinal = (token) => {
    // update final (sem throttle)
    socketRef.current?.emit("updateToken", token);
  };

  // reordenação (para frente / para trás)
  const reorderAndEmit = (newOrder) => {
    setTokens(newOrder);
    socketRef.current?.emit("reorder", newOrder);
  };

  const bringForward = () => {
    if (!selectedId) return;
    setTokens(prev => {
      const idx = prev.findIndex(t => t.id === selectedId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx + 1, 0, item);
      reorderAndEmit(arr);
      return arr;
    });
  };

  const sendBackward = () => {
    if (!selectedId) return;
    setTokens(prev => {
      const idx = prev.findIndex(t => t.id === selectedId);
      if (idx <= 0) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx - 1, 0, item);
      reorderAndEmit(arr);
      return arr;
    });
  };

  const deleteToken = () => {
    if (!selectedId) return;
    socketRef.current?.emit("deleteToken", selectedId);
    setSelectedId(null);
  };

  // zoom
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    setScale(newScale);
    const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
    setStagePos(newPos);
  };

  // pan com botão direito segurando e arrastando
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
            <button onClick={bringForward} style={{ marginLeft: 10 }}>Para Frente</button>
            <button onClick={sendBackward} style={{ marginLeft: 10 }}>Para Trás</button>
            <button onClick={deleteToken} style={{ marginLeft: 10, color: "red" }}>Excluir</button>
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
        {/* tokens layer (baixo) */}
        <Layer>
          {tokens.map(token => (
            <Token
              key={token.id}
              token={token}
              isSelected={selectedId === token.id}
              onSelect={() => setSelectedId(token.id)}
              onMoveDuring={(attrs) => {
                // atualiza localmente p/ visual imediato e emite throttled
                setTokens(prev => prev.map(p => p.id === token.id ? ({ ...p, ...attrs }) : p));
                emitUpdate({ ...token, ...attrs });
              }}
              onDragEnd={(attrs) => {
                setTokens(prev => prev.map(p => p.id === token.id ? ({ ...p, ...attrs }) : p));
                updateTokenFinal({ ...token, ...attrs });
              }}
              onTransformEnd={(attrs) => {
                setTokens(prev => prev.map(p => p.id === token.id ? ({ ...p, ...attrs }) : p));
                updateTokenFinal({ ...token, ...attrs });
              }}
            />
          ))}
        </Layer>

        {/* grid sempre no topo */}
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

/* ==========================
   Token component
   ========================== */
function Token({ token, isSelected, onSelect, onMoveDuring, onDragEnd, onTransformEnd }) {
  // crossOrigin 'anonymous' — o servidor precisa ter CORS habilitado (já está no server.js)
  const [image] = useImage(token.src, "anonymous");
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

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
        onDragMove={(e) => {
          onMoveDuring?.({ x: e.target.x(), y: e.target.y() });
        }}
        onDragEnd={(e) => {
          onDragEnd?.({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const newAttrs = {
            x: node.x(),
            y: node.y(),
            width: node.width() * node.scaleX(),
            height: node.height() * node.scaleY(),
          };
          // reset scales
          node.scaleX(1);
          node.scaleY(1);
          onTransformEnd?.(newAttrs);
        }}
      />
      {isSelected && <Transformer ref={trRef} />}
    </>
  );
}
