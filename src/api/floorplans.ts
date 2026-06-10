import { authHeaders, getStoredToken } from "./auth";
import type {
  FloorplanAiAnalysis,
  FloorplanAnalysis,
  InternalLayoutDerivationResponse,
  InternalLayoutManualOverrides,
  FloorplanSource,
  MarkerPrimitive,
  MarkerType,
  Primitive,
  RoomPrimitive,
  RoomType,
  SegmentPrimitive
} from "../types/fengshui";

interface PointPayload {
  x: number;
  y: number;
}

interface RoomAnnotationPayload {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: PointPayload[];
  label?: string;
  roomType: RoomType;
}

interface SegmentAnnotationPayload {
  id: string;
  kind: "wall" | "door" | "window";
  start: PointPayload;
  end: PointPayload;
  role?: SegmentPrimitive["role"];
  roomId?: string;
}

interface MarkerAnnotationPayload {
  id: string;
  markerType: MarkerType;
  x: number;
  y: number;
  roomId?: string;
  directionDeg?: number;
  label?: string;
}

export interface FloorplanAnnotationsPayload {
  rooms: RoomAnnotationPayload[];
  segments: SegmentAnnotationPayload[];
  markers: MarkerAnnotationPayload[];
  northAngleDeg: number;
  manualOverrides: InternalLayoutManualOverrides;
}

export interface FloorplanAssetResponse {
  id: string;
  house_id: string | null;
  content_type: string;
  storage_key: string;
  width: number;
  height: number;
  analysis: FloorplanAnalysis;
  ai_analysis: FloorplanAiAnalysis | null;
  annotations: FloorplanAnnotationsPayload;
  derived_internal_layout: Record<string, unknown>;
  image_url: string;
  created_at: string;
  updated_at: string;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    if (body.detail) return body.detail;
  } catch {
    // keep default below
  }
  return `HTTP ${response.status}`;
}

export async function uploadPersistedFloorplan(file: File, token = getStoredToken() ?? ""): Promise<FloorplanAssetResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/v1/floorplans", {
    method: "POST",
    headers: authHeaders(token),
    body: formData
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as FloorplanAssetResponse;
}

export async function saveFloorplanAnnotations(
  floorplanId: string,
  annotations: FloorplanAnnotationsPayload,
  token = getStoredToken() ?? ""
): Promise<FloorplanAssetResponse> {
  const response = await fetch(`/api/v1/floorplans/${floorplanId}/annotations`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify(annotations)
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as FloorplanAssetResponse;
}

export async function attachFloorplanToHouse(
  houseId: string,
  floorplanId: string,
  token = getStoredToken() ?? ""
): Promise<FloorplanAssetResponse> {
  const response = await fetch(`/api/v1/houses/${houseId}/floorplan/${floorplanId}`, {
    method: "PUT",
    headers: authHeaders(token)
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as FloorplanAssetResponse;
}

export async function analyzeFloorplanWithAi(
  floorplanId: string,
  token = getStoredToken() ?? ""
): Promise<FloorplanAssetResponse> {
  const response = await fetch(`/api/v1/floorplans/${floorplanId}/ai-analysis`, {
    method: "POST",
    headers: authHeaders(token)
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as FloorplanAssetResponse;
}

export async function deriveInternalLayout(
  annotations: FloorplanAnnotationsPayload
): Promise<InternalLayoutDerivationResponse> {
  const response = await fetch("/api/v1/floorplan/derive-internal-layout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(getStoredToken() ?? "")
    },
    body: JSON.stringify(annotations)
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const body = (await response.json()) as InternalLayoutDerivationResponse;
  return {
    internal_layout: {
      flags: body.internal_layout?.flags ?? {},
      measurements: body.internal_layout?.measurements ?? {},
      counts: body.internal_layout?.counts ?? {}
    },
    evidence: (body.evidence ?? []).map((item) => ({
      ...item,
      related_ids: item.related_ids ?? [],
      formula_ids: item.formula_ids ?? []
    }))
  };
}

export async function fetchFloorplanImageDataUrl(
  asset: FloorplanAssetResponse,
  token = getStoredToken() ?? ""
): Promise<string> {
  const response = await fetch(asset.image_url, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read floorplan image"));
    reader.readAsDataURL(blob);
  });
}

export function floorplanSourceFromAsset(
  asset: FloorplanAssetResponse,
  imageDataUrl?: string
): FloorplanSource {
  return {
    id: asset.id,
    imageUrl: asset.image_url,
    storageKey: asset.storage_key,
    ...(imageDataUrl ? { imageDataUrl } : {}),
    imageWidth: asset.width,
    imageHeight: asset.height,
    contentType: asset.content_type,
    analysis: asset.analysis,
    aiAnalysis: asset.ai_analysis
  };
}

export function annotationsFromPrimitives(
  primitives: Primitive[],
  northAngleDeg: number,
  manualOverrides: InternalLayoutManualOverrides = {
    flags: {},
    measurements: {},
    counts: {}
  }
): FloorplanAnnotationsPayload {
  return {
    rooms: primitives.filter((item): item is RoomPrimitive => item.kind === "room").map((room) => ({
      id: room.id,
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
      ...(room.points ? { points: room.points } : {}),
      ...(room.label ? { label: room.label } : {}),
      roomType: room.roomType ?? "unknown"
    })),
    segments: primitives
      .filter((item): item is SegmentPrimitive => item.kind === "wall" || item.kind === "door" || item.kind === "window")
      .map((segment) => ({
        id: segment.id,
        kind: segment.kind,
        start: segment.start,
        end: segment.end,
        ...(segment.role ? { role: segment.role } : {}),
        ...(segment.roomId ? { roomId: segment.roomId } : {})
      })),
    markers: primitives.filter((item): item is MarkerPrimitive => item.kind === "marker").map((marker) => ({
      id: marker.id,
      markerType: marker.markerType,
      x: marker.x,
      y: marker.y,
      ...(marker.roomId ? { roomId: marker.roomId } : {}),
      ...(marker.directionDeg !== undefined ? { directionDeg: marker.directionDeg } : {}),
      ...(marker.label ? { label: marker.label } : {})
    })),
    northAngleDeg,
    manualOverrides
  };
}

export function primitivesFromAnnotations(asset: FloorplanAssetResponse): Primitive[] {
  const annotations = asset.annotations;
  return [
    ...annotations.rooms.map((room): RoomPrimitive => ({
      id: room.id,
      kind: "room",
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
      ...(room.points ? { points: room.points } : {}),
      ...(room.label ? { label: room.label } : {}),
      roomType: room.roomType
    })),
    ...annotations.segments.map((segment): SegmentPrimitive => ({
      id: segment.id,
      kind: segment.kind,
      start: segment.start,
      end: segment.end,
      ...(segment.role ? { role: segment.role } : {}),
      ...(segment.roomId ? { roomId: segment.roomId } : {})
    })),
    ...annotations.markers.map((marker): MarkerPrimitive => ({
      id: marker.id,
      kind: "marker",
      markerType: marker.markerType,
      x: marker.x,
      y: marker.y,
      ...(marker.roomId ? { roomId: marker.roomId } : {}),
      ...(marker.directionDeg !== undefined ? { directionDeg: marker.directionDeg } : {}),
      ...(marker.label ? { label: marker.label } : {})
    }))
  ];
}
