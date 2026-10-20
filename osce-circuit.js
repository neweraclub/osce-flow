/**
 * osce-circuit: four clinical exam stations as weighted trays.
 * Picking a station lifts its score beads in turn, with neighbor falloff,
 * referenced against a 10/20 pass datum line.
 */
const {
  Cam, clamp, disposer, facing, fit, hull, mk, open, place, pointer, poly,
  prism, proj, rad, register, ringAt, rings, rrect, run, seg, solid, put,
  tdone, tset, tval, tween,
} = HL;

const STATIONS = [
  { name: "cardio", w: 6.0, h: 26, score: "+4.8" },
  { name: "neuro", w: 4.0, h: 18, score: "+3.2" },
  { name: "pneumo", w: 5.0, h: 22, score: "+3.8" },
  { name: "nephro", w: 5.0, h: 22, score: "+3.7" },
];
const N = 4;
const POS = [
  [-56, 42],
  [-19, 15],
  [19, -15],
  [56, -42],
];
const RW = 12, RL = 12, CR = 3.6, INSET = 1.4;
const BEAD_OFFSETS = [
  [-4.4, 4.4],
  [0, 0],
  [4.4, -4.4],
];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let intensity = value;

  const C = Cam(45, 0.5, 1.82);
  fit(
    C,
    [
      [-78, 62, -3],
      [78, -62, -3],
      [-78, 62, 54],
      [78, -62, 54],
      [0, 0, 0],
    ],
    200,
    166
  );
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);

  const passD = seg(P(-76, 58, 14), P(76, -58, 14));
  mk("path", { d: passD, class: "dash" }, g);

  const trackPts = POS.map(([x, y]) => P(x, y, 0));
  mk("path", { d: open(trackPts), class: "dash" }, g);

  const stations = [];
  const restCenters = [];

  for (let i = 0; i < N; i++) {
    const [cx, cy] = POS[i];
    const cfg = STATIONS[i];
    const grp = mk("g", {}, g);

    const [outer, inner] = rings(cx - RW, cy - RL, cx + RW, cy + RL, CR, INSET);
    const traySolid = solid(grp);
    const trayPaths = prism(P, front, outer, inner, 0, cfg.h);
    put(traySolid, trayPaths);

    const centerScreen = P(cx, cy, cfg.h);
    restCenters.push(centerScreen);

    const beads = [];
    for (let b = 0; b < BEAD_OFFSETS.length; b++) {
      const [ox, oy] = BEAD_OFFSETS[b];
      const dotEl = mk("circle", { r: 3.1, class: "dot m" }, grp);
      place(dotEl, P(cx + ox, cy + oy, cfg.h + 2.8));
      beads.push({
        el: dotEl,
        ox,
        oy,
        z: tween(cfg.h + 2.8),
      });
    }

    stations.push({
      ...cfg,
      cx,
      cy,
      solid: traySolid,
      beads,
    });
  }

  const restDot = mk("circle", { r: 2.0, class: "dot" }, g);
  place(restDot, P(POS[0][0], POS[0][1], STATIONS[0].h + 1.2));

  function hit([x, y]) {
    let best = -1, minD = 50;
    for (let i = 0; i < N; i++) {
      const [sx, sy] = restCenters[i];
      const d = Math.hypot(x - sx, y - sy);
      if (d < minD) {
        minD = d;
        best = i;
      }
    }
    return best;
  }

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    for (let i = 0; i < N; i++) {
      const st = stations[i];
      for (let b = 0; b < st.beads.length; b++) {
        const bd = st.beads[b];
        const curZ = tval(bd.z, now);
        place(bd.el, P(st.cx + bd.ox, st.cy + bd.oy, curZ));
        if (!tdone(bd.z, now)) moving = true;
      }
    }
    return moving;
  });
  bag.add(loop.unregister);

  let activeStation = -1;

  function setActive(picked) {
    if (picked === activeStation) return;
    const now = performance.now();
    activeStation = picked;

    if (picked < 0) {
      read.textContent = "rest";
      restDot.setAttribute("class", "dot");
    } else {
      const st = stations[picked];
      read.textContent = `${st.name} ${st.score}/${st.w} · pass 10/20`;
      restDot.setAttribute("class", "dot off");
    }

    for (let i = 0; i < N; i++) {
      const st = stations[i];
      const isPick = i === picked;
      st.solid.sil.classList.toggle("hi", isPick);

      const dist = picked < 0 ? 0 : Math.abs(i - picked);
      const stationLift = picked < 0 ? 0 : Math.max(0, 18 - dist * 7) * (intensity / 50);

      for (let b = 0; b < st.beads.length; b++) {
        const bd = st.beads[b];
        const delay = picked < 0 ? (N - 1 - i) * 35 + b * 20 : dist * 50 + b * 45;
        const targetZ = st.h + 2.8 + (isPick ? 22 + b * 4 : stationLift);
        tset(bd.z, targetZ, now, delay);
        bd.el.setAttribute("class", isPick ? "dot" : "dot m");
      }
    }
    loop.wake();
  }

  bag.add(
    pointer(stage, {
      move: (pt) => setActive(hit(pt)),
      leave: () => setActive(-1),
    })
  );

  bag.add(() => svg.replaceChildren());

  read.textContent = "rest";

  return {
    set: (v) => {
      intensity = v;
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "osce-circuit",
  means: "An OSCE clinical exam circuit: four weighted station trays lift awarded points with neighbor falloff toward a 10/20 pass.",
  rules: [1, 2, 4, 8, 10],
  range: [20, 50, 80],
  tour: [[75, 166], [152, 166], [248, 166], [325, 166], null],
  mount,
});
