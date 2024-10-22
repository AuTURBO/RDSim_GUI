"use client";

import * as THREE from "three";
import React, { useEffect, useRef, useState } from "react";
import {
  Canvas,
  useLoader,
  ThreeEvent,
} from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader.js";


interface ImageMashProps {
  textureUrl: string;
  pixelSize: number;
  origin: number[];
  addVertex: (x: number, y: number) => void;
}
function ImageMesh({
  textureUrl,
  pixelSize,
  origin,
  addVertex,
}: ImageMashProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  const clickStartTime = useRef<number>(0);
  const clickDuration = useRef<number>(0);

  const handlePointerDown = () => {
    clickStartTime.current = Date.now();
  };

  const handlePointerUp = () => {
    clickDuration.current = Date.now() - clickStartTime.current;
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // 드래그가 아니고 클릭으로 간주될 때만 처리
    if (clickDuration.current <= 100) {
      const { x, y } = event.point;
      addVertex(x, y);
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={[origin[0], origin[1], -0.05]}
      rotation={[0, 0, Math.PI / 2]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      <planeGeometry
        args={[
          texture.image.width * pixelSize,
          texture.image.height * pixelSize,
        ]}
      />
      <meshBasicMaterial map={texture} transparent opacity={0.2} />
    </mesh>
  );
}

function VertexMesh({
  vertex,
  active,
  deleteVertex,
  selectVertex,
}: {
  vertex: TopologyVertex;
  active: boolean;
  deleteVertex: (id: number) => void;
  selectVertex: (id: number) => void;
}) {
  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation(); // 이벤트 전파 방지
    deleteVertex(vertex.id); // vertex 삭제
  };
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // 드래그가 아니고 클릭으로 간주될 때만 처리
    event.stopPropagation();
    selectVertex(vertex.id);
  };
  return (
    <mesh
      position={[vertex.pose.y * -1, vertex.pose.x, vertex.pose.z + 0.25]}
      rotation={[Math.PI / 2, 0, 0]}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      {/* 원기둥 형태 (반지름: 0.3, 높이: 0.5) */}
      <cylinderGeometry args={[0.6, 0.6, 0.5, 32]} />
      <meshStandardMaterial
        color="green"
        transparent
        opacity={active ? 1.0 : 0.5}
      />
    </mesh>
  );
}

function EdgeMesh({
  start,
  end,
}: {
  start: TopologyVertex;
  end: TopologyVertex;
}) {
  const edgeWidth = 0.2; // Edge의 넓이
  const offsetDistance = 0.3; // 간선의 위치를 조정하는 오프셋 거리

  const startVec = new THREE.Vector3(
    start.pose.y * -1,
    start.pose.x,
    start.pose.z
  );
  const endVec = new THREE.Vector3(end.pose.y * -1, end.pose.x, end.pose.z);
  const edgeLength = startVec.distanceTo(endVec);

  // Edge의 방향 벡터
  const direction = new THREE.Vector3()
    .subVectors(endVec, startVec)
    .normalize();
  const midPoint = new THREE.Vector3()
    .addVectors(startVec, endVec)
    .multiplyScalar(0.5);
  const angle = Math.atan2(direction.y, direction.x);

  // 간선의 위치 조정
  const perpendicularOffset = new THREE.Vector3(-direction.y, direction.x, 0).normalize().multiplyScalar(offsetDistance);
  const adjustedPosition = midPoint.clone().sub(perpendicularOffset)

  return (
    <mesh position={adjustedPosition} rotation={[0, 0, angle]}>
      <planeGeometry args={[edgeLength, edgeWidth]} />
      <meshStandardMaterial color="green" transparent opacity={0.5} />
    </mesh>
  );
}

export default function Screen({
  contents,
  addVertex,
  deleteVertex,
  selectVertex,
  selectedIds,
}: {
  contents?: TopologyMapInterface;
  addVertex: (x: number, y: number) => void;
  deleteVertex: (id: number) => void;
  selectVertex: (id: number) => void;
  selectedIds: number[];
}) {
  const [pcdObject, setPcdObject] = useState<THREE.Points | null>(null);

  const loadPCD = (url: string) => {
    const loader = new PCDLoader();
    console.log("test");
    loader.load(
      url,
      (points) => {
        const geometry = points.geometry as THREE.BufferGeometry;
        const positions = geometry.attributes.position;

        // 새로운 색상 배열을 생성합니다 (파란색으로 설정)
        const colors = new Float32Array(positions.count * 3);
        const blueColor = new THREE.Color("blueviolet");

        for (let i = 0; i < positions.count; i++) {
          colors[i * 3] = blueColor.r;
          colors[i * 3 + 1] = blueColor.g;
          colors[i * 3 + 2] = blueColor.b;
        }

        // 새로운 color attribute를 geometry에 추가합니다.
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        // Points material에 vertexColors 옵션을 설정합니다.
        const material = new THREE.PointsMaterial({
          size: 0.05,
          vertexColors: true,
        });

        // PCD 포인트 객체를 업데이트합니다.
        points.material = material;
        setPcdObject(points);
      },
      undefined,
      (error) => {
        console.error("Error loading PCD file:", error);
      }
    );
  };

  useEffect(() => {
    // 예시로 PCD 파일을 불러옵니다.
    loadPCD("/map.pcd");
  }, []);
  return (
    <Canvas>
      <ambientLight intensity={Math.PI / 2} />

      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <gridHelper
        args={[200, 200, "black", "#d3d3d3"]} // 그리드 크기 및 색상
        rotation={[Math.PI / 2, 0, 0]} // 그리드를 수평으로 배치
        position={[0, 0, -0.04]} // 그리드를 살짝 아래로 이동하여 충돌 방지
      />

      {pcdObject && (
        <primitive object={pcdObject} rotation={[0, 0, Math.PI / 2]} />
      )}
      {contents &&
        contents.vertexs.map((vertex) => (
          <VertexMesh
            deleteVertex={deleteVertex}
            selectVertex={selectVertex}
            active={selectedIds.includes(vertex.id)}
            key={vertex.id}
            vertex={vertex}
          />
        ))}

      {contents &&
        contents.edges.map((edge) => {
          const startVertex = contents.vertexs.find(
            (vertex) => vertex.id === edge.startId
          );
          const endVertex = contents.vertexs.find(
            (vertex) => vertex.id === edge.endId
          );

          if (startVertex && endVertex) {
            return (
              <EdgeMesh key={edge.id} start={startVertex} end={endVertex} />
            );
          }
          return null;
        })}
      <ImageMesh
        textureUrl="/map.png"
        pixelSize={0.1}
        origin={[0, 0]}
        addVertex={addVertex}
      />
      <OrbitControls />
    </Canvas>
  );
}
