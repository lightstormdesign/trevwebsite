// The phone's tilt, for the press photos (PressGallery.jsx): smoothed, re-centred slowly on however the phone is
// being held, so holding it at any angle reads as flat and only the movement shows. iPhone asks for permission
// once, on the first tap anywhere (askMotion, installed by TapRipple.jsx).
const st = { x: 0, y: 0, bx: null, by: null, on: false, last: 0 };
let listening = false;
const onOrient = (e) => {
  if (e.beta == null || e.gamma == null) return;
  const b = Math.max(-60, Math.min(60, e.beta)), g = Math.max(-45, Math.min(45, e.gamma));
  if (st.bx === null) { st.bx = g; st.by = b; }
  st.bx += (g - st.bx) * 0.012; st.by += (b - st.by) * 0.012;   // the slow re-centring
  st.x = Math.max(-1, Math.min(1, (g - st.bx) / 18));
  st.y = Math.max(-1, Math.min(1, (b - st.by) / 18));
  st.on = true; st.last = performance.now();
};
export const listenMotion = () => {
  if (listening || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
  listening = true;
  window.addEventListener("deviceorientation", onOrient, { passive: true });
};
export const askMotion = () => {
  const D = typeof window !== "undefined" && window.DeviceOrientationEvent;
  if (!D) return;
  if (typeof D.requestPermission === "function") {
    D.requestPermission().then((r) => { if (r === "granted") listenMotion(); }).catch(() => {});
  } else listenMotion();
};
export const motion = st;
