declare module '@heroicons/*';

declare interface TopologyVertex {
  id: number;
  pose: {
    x: number;
    y: number;
    z: number;
    yaw: number;
  };
  status: string;
}
declare interface TopologyEdges {
  id: number;
  startId: number;
  endId: number;
  weight: number;
}
declare interface TopologyMapInterface {
  vertexs: TopologyVertex[];
  edges: TopologyEdges[];
}
declare interface TopologyYamlInterface {
  topology_map: {
    vertexs: TopologyVertex[];
    edges: number[];
  };
}