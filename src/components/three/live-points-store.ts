import type { ColorPoint } from "./mesh-gradient";

type Listener = () => void;

let _points: ColorPoint[] = [];
const _listeners = new Set<Listener>();

export const livePointsStore = {
  set(points: ColorPoint[]) {
    _points = points;
    _listeners.forEach((l) => l());
  },
  subscribe(listener: Listener) {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
  getSnapshot() {
    return _points;
  },
};
