"use client";

import { ChangeEvent, useEffect, useState } from "react";
import _ from "lodash";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import Screen from "@/components/three/Screen";
import YAML from "yaml";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const tabs = [{ name: "Vertex" }, { name: "Edge" }];
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [yamlContent, setYamlContent] = useState<TopologyMapInterface>({
    vertexs: [],
    edges: [],
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === "string") {
          try {
            // 파일 내용 읽어오기
            const content = e.target.result;
            // YAML 파싱
            const parsedYaml: TopologyYamlInterface = YAML.parse(content);
            const vertexLength = parsedYaml.topology_map.vertexs.length;
            const edges = parsedYaml.topology_map.edges.reduce(
              (acc, edge, index) => {
                const rowIndex = Math.floor(index / vertexLength);
                const colIndex = index % vertexLength;

                if (edge > 0) {
                  return [
                    ...acc,
                    {
                      id: index,
                      startId: rowIndex,
                      endId: colIndex,
                      weight: edge,
                    },
                  ];
                }
                return acc;
              },
              [] as TopologyEdges[]
            );
            setYamlContent({
              vertexs: parsedYaml.topology_map.vertexs,
              edges,
            });
            console.log(parsedYaml.topology_map.edges); // 콘솔에 파싱된 내용 출력
          } catch (error) {
            console.error("Error parsing YAML file:", error);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const addVertex = (x: number, y: number) => {
    if (yamlContent) {
      const nextId = _.maxBy(yamlContent.vertexs, "id")?.id ?? -1;
      const updatedVertexs = [
        ...yamlContent.vertexs,
        {
          id: nextId + 1,
          pose: {
            x: y,
            y: x * -1,
            z: 0,
            yaw: 0,
          },
          status: "ACTIVE",
        },
      ];

      setSelectedIds([]);
      setYamlContent({
        ...yamlContent,
        vertexs: updatedVertexs,
      });
    }
  };

  const deleteVertex = (id: number) => {
    if (yamlContent) {
      // 주어진 id를 가진 vertex를 제외한 새로운 vertex 배열 생성
      const updatedVertexs = yamlContent.vertexs.filter(
        (vertex) => vertex.id !== id
      );

      // 해당 vertex와 관련된 edge를 제외한 새로운 edge 배열 생성
      const updatedEdges = yamlContent.edges.filter(
        (edge) => edge.startId !== id && edge.endId !== id
      );

      setSelectedIds([]);
      setYamlContent({
        ...yamlContent,
        vertexs: updatedVertexs,
        edges: updatedEdges,
      });
    }
  };

  const selectVertex = (id: number) => {
    setSelectedIds((prevSelectedIds) => {
      // 이미 선택된 ID인 경우 제거하고, 아니면 추가
      if (prevSelectedIds.includes(id)) {
        // ID가 이미 선택된 경우, 해당 ID를 제거
        return prevSelectedIds.filter((selectedId) => selectedId !== id);
      } else {
        // ID가 선택되지 않은 경우, 배열에 추가
        return [...prevSelectedIds, id];
      }
    });
  };

  const convertToYaml = () => {
    if (!yamlContent) return "";

    const numVertices = yamlContent.vertexs.length;
    const edgesArray = new Array(numVertices * numVertices).fill(0);

    yamlContent.edges.forEach((edge) => {
      // startId와 endId에 해당하는 vertex의 index를 찾습니다.
      const startIndex = yamlContent.vertexs.findIndex(
        (vertex) => vertex.id === edge.startId
      );
      const endIndex = yamlContent.vertexs.findIndex(
        (vertex) => vertex.id === edge.endId
      );

      // 인덱스가 유효한지 확인
      if (startIndex !== -1 && endIndex !== -1) {
        // 1차원 배열의 인덱스를 계산하여 weight 값 저장
        edgesArray[startIndex * numVertices + endIndex] = edge.weight;
      }
    });

    // TopologyYamlInterface로 변환
    const yamlFormat: TopologyYamlInterface = {
      topology_map: {
        vertexs: yamlContent.vertexs.map((vertex, index) => ({
          ...vertex,
          id: index
        })),
        edges: edgesArray,
      },
    };

    return YAML.stringify(yamlFormat);
  };

  const handleSaveToFile = () => {
    const yamlString = convertToYaml();
    const blob = new Blob([yamlString], { type: "text/yaml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "topology_map.yaml";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  useEffect(() => {
    if (selectedIds.length >= 2) {
      const nextId = _.maxBy(yamlContent.edges, "id")?.id ?? -1;
      const edge = _.find(yamlContent.edges, {
        startId: selectedIds[0],
        endId: selectedIds[1],
      });

      setYamlContent((prevYamlContent) => ({
        vertexs: prevYamlContent.vertexs,
        edges: edge
          ? prevYamlContent.edges.filter((edge_) => edge_.id !== edge.id)
          : [
              ...prevYamlContent.edges,
              {
                id: nextId + 1,
                startId: selectedIds[0],
                endId: selectedIds[1],
                weight: 1,
              },
            ],
      }));

      setSelectedIds([]);
    }
  }, [selectedIds]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-[1440px] h-[calc(100vh-40px)] bg-white shadow-lg rounded-lg grid grid-rows-9 grid-cols-3">
        <div className="row-span-9 col-span-2 bg-gray-200 relative">
          <Screen
            contents={yamlContent}
            addVertex={addVertex}
            deleteVertex={deleteVertex}
            selectVertex={selectVertex}
            selectedIds={selectedIds}
          />
          {/* <div className="absolute top-4 right-4 flex space-x-2">
            <button className="p-2 bg-gray-300 rounded-md shadow-md hover:bg-gray-400 transition-colors">
              <FaRegEdit size={20} />
            </button>
            <button className="p-2 bg-gray-300 rounded-md shadow-md hover:bg-gray-400 transition-colors">
              <FaSave size={20} />
            </button>
          </div> */}
        </div>
        <div className="row-span-9 col-span-1 px-4 py-4 flex flex-col justify-between h-full">
          <TabGroup className="flex flex-col flex-grow overflow-y-auto">
            <TabList className="flex space-x-0 mb-4">
              {tabs.map((tab) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    `flex items-center px-6 py-2 transition-colors border-b-2 ${
                      selected
                        ? "text-black font-bold border-blue-500"
                        : "bg-gray-100 text-black border-transparent"
                    }`
                  }
                >
                  {tab.name}
                </Tab>
              ))}
            </TabList>
            <TabPanels className="flex-grow overflow-y-auto">
              <TabPanel>
                {yamlContent ? (
                  <div className="space-y-4">
                    {yamlContent.vertexs.map((vertex) => (
                      <div
                        key={vertex.id}
                        className="p-4 border rounded-md shadow-sm bg-gray-50 flex flex-col space-y-2"
                      >
                        <h3 className="text-lg font-semibold text-blue-600">
                          Vertex ID: {vertex.id}
                        </h3>
                        <p>
                          Position: (X: {vertex.pose.x}, Y: {vertex.pose.y}, Z:{" "}
                          {vertex.pose.z})
                        </p>
                        <p>Yaw: {vertex.pose.yaw}</p>
                        <p>
                          Status:
                          <span
                            className={`ml-2 px-2 py-1 rounded-md text-sm ${
                              vertex.status === "ACTIVE"
                                ? "bg-green-200 text-green-800"
                                : "bg-red-200 text-red-800"
                            }`}
                          >
                            {vertex.status}
                          </span>
                        </p>
                        <button
                          className="mt-2 px-4 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                          onClick={() => {
                            // 삭제 로직을 여기에 추가
                            const updatedVertexs = yamlContent.vertexs.filter(
                              (v) => v.id !== vertex.id
                            );
                            setYamlContent({
                              ...yamlContent,
                              vertexs: updatedVertexs,
                            });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No vertex data available.</p>
                )}
              </TabPanel>
              <TabPanel className="flex-grow overflow-y-auto">
                {yamlContent ? (
                  <div className="flex flex-col gap-3">
                    {yamlContent.edges.map((edge: TopologyEdges) => {
                      const vertex1 = yamlContent.vertexs.find(
                        (v) => v.id === edge.startId
                      );
                      const vertex2 = yamlContent.vertexs.find(
                        (v) => v.id === edge.endId
                      );

                      if (vertex1 && vertex2) {
                        const handleWeightChange = (
                          e: React.ChangeEvent<HTMLInputElement>
                        ) => {
                          const updatedWeight =
                            parseInt(e.target.value, 10) || 0;
                          const updatedEdges = yamlContent.edges.map(
                            (e: TopologyEdges) =>
                              e.id === edge.id
                                ? { ...e, weight: updatedWeight }
                                : e
                          );
                          setYamlContent({
                            ...yamlContent,
                            edges: updatedEdges,
                          });
                        };

                        return (
                          <div
                            key={edge.id}
                            className="p-4 border rounded-md shadow-sm bg-gray-50 flex flex-col space-y-2"
                          >
                            <h4 className="text-md font-semibold text-blue-600">
                              Edge between Vertex {vertex1.id} and Vertex{" "}
                              {vertex2.id}
                            </h4>
                            <p>
                              Start Position: (X: {vertex1.pose.x}, Y:{" "}
                              {vertex1.pose.y}, Z: {vertex1.pose.z})
                            </p>
                            <p>
                              End Position: (X: {vertex2.pose.x}, Y:{" "}
                              {vertex2.pose.y}, Z: {vertex2.pose.z})
                            </p>
                            <label className="flex items-center space-x-2 mt-2">
                              <span>Weight:</span>
                              <input
                                type="number"
                                value={edge.weight}
                                onChange={handleWeightChange}
                                className="px-2 py-1 border rounded-md w-20"
                              />
                            </label>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                ) : (
                  <p>No edge data available.</p>
                )}
              </TabPanel>
            </TabPanels>
          </TabGroup>

          {/* Save Button */}
          <div className="flex justify-end gap-2 my-4">
            <button
              onClick={() => document.getElementById("file-input")?.click()}
              className="self-end mt-auto px-6 py-2 bg-gray-200 rounded-md shadow-md hover:bg-gray-400 transition-colors"
            >
              Load
            </button>
            <input
              type="file"
              id="file-input"
              accept=".yaml, .yml"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              onClick={() => setIsOpen(true)}
              className="self-end mt-auto px-6 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-2xl bg-white rounded-lg p-6 shadow-lg">
            <DialogTitle className="text-lg font-bold mb-4">
              YAML Preview
            </DialogTitle>
            <div className="overflow-y-auto max-h-80 border p-2 rounded">
              <SyntaxHighlighter language="yaml" style={vscDarkPlus}>
                {convertToYaml()}
              </SyntaxHighlighter>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={handleSaveToFile}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save to File
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
