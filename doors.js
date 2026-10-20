/**
 * doors: an OSCE clinical exam corridor with three station doors.
 * The pointer opens a door to reveal its clinical station room,
 * with distance falloff to neighbors and a running total toward 10/20 pass.
 */
const {
  Cam, clamp, disposer, facing, fit, hull, mk, open, place, pointer, poly,
  prism, proj, rad, register, ringAt, rings, rrect, run, seg, solid, put,
  tdone, tset, tval, tween,
} = HL;

const STATIONS = [
  { name: "anamnèse", w: 35, pts: "7.0", x: -56 },
  { name: "examen", w: 35, pts: "7.0", x: 0 },
  { name: "urgence", w: 30, pts: "6.0", x: 56 },
];
const N = 3, DW = 24, DH = 46, DT = 1.4;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let intensity = value;

  const C = Cam(45, 0.5, 1.85);
  fit(C, [[-88, 30, 0], [88, -30, 0], [-88, -32, 54], [88, 30, 54], [0, 0, 0]], 200, 166);
  const P = proj(C), front = facing(C);
  const addPrism = (p, r, inr, z0, z1) => { const s = solid(p); put(s, prism(P, front, r, inr, z0, z1)); };

  const g = mk("g", {}, svg);
  mk("path", { d: seg(P(-84, 0, 0), P(84, 0, 0)), class: "lo" }, g);
  mk("path", { d: seg(P(-82, 0, 23), P(82, 0, 23)), class: "dash" }, g);

  const stations = [], restCenters = [];

  for (let i = 0; i < N; i++) {
    const st = STATIONS[i], grp = mk("g", {}, g), roomGrp = mk("g", { class: "lo" }, grp);
    const x0 = st.x - DW / 2, x1 = st.x + DW / 2;
    mk("path", { d: poly([P(x0, 0, 0), P(x1, 0, 0), P(x1, -26, 0), P(x0, -26, 0)]), class: "nf lo" }, roomGrp);

    if (i === 0) {
      addPrism(roomGrp, ...rings(st.x - 6, -20, st.x + 6, -10, 2, 0.8), 0, 9);
      addPrism(roomGrp, ...rings(st.x - 6, -21, st.x + 6, -18, 1.5, 0.6), 9, 21);
      addPrism(roomGrp, ...rings(st.x - 4, -18, st.x + 4, -13, 2, 0.6), 24, 30);
    } else if (i === 1) {
      addPrism(roomGrp, ...rings(st.x - 8, -23, st.x + 8, -9, 2.5, 0.8), 0, 11);
      addPrism(roomGrp, ...rings(st.x - 8, -23, st.x - 1, -9, 2, 0.6), 11, 15);
      place(mk("circle", { r: 2.2, class: "dot m" }, roomGrp), P(st.x + 3, -16, 12.5));
    } else {
      addPrism(roomGrp, ...rings(st.x - 7, -21, st.x + 7, -11, 2, 0.7), 3, 17);
      addPrism(roomGrp, ...rings(st.x - 4, -19, st.x + 4, -13, 1.5, 0.5), 17, 26);
      mk("path", { d: seg(P(st.x - 7, -11, 16), P(st.x - 7, -7, 16)), class: "nf lo" }, roomGrp);
    }

    mk("path", { d: open([P(x0, 0, 0), P(x0, 0, DH), P(x1, 0, DH), P(x1, 0, 0)]), class: "sil" }, grp);
    const doorLeaf = mk("path", { class: "sil" }, grp), doorCrease = mk("path", { class: "nf lo" }, grp);
    const handle = mk("circle", { r: 1.5, class: "dot m" }, grp);

    for (let k = 0; k <= i; k++) {
      place(mk("circle", { r: 1.2, class: "dot off" }, grp), P(st.x + (k - i / 2) * 3.5, 0, DH + 4));
    }

    restCenters.push(P(st.x, 0, DH / 2));
    stations.push({ ...st, x0, roomGrp, doorLeaf, doorCrease, handle, angle: tween(0) });
  }

  const restDot = mk("circle", { r: 1.8, class: "dot" }, g);
  place(restDot, P(STATIONS[0].x + DW / 2 - 3, 0, DH * 0.48));

  function hit([x, y]) {
    let best = -1, minD = 48;
    for (let i = 0; i < N; i++) {
      const d = Math.hypot(x - restCenters[i][0], y - restCenters[i][1]);
      if (d < minD) { minD = d; best = i; }
    }
    return best;
  }

  function drawDoor(st, th) {
    const radTh = rad(th), cosT = Math.cos(radTh), sinT = Math.sin(radTh), xh = st.x0;
    const p0 = [xh, 0], p1 = [xh + DW * cosT, -DW * sinT];
    const p2 = [xh + DW * cosT + DT * sinT, -DW * sinT + DT * cosT], p3 = [xh + DT * sinT, DT * cosT];
    const ptsB = [p0, p1, p2, p3].map(([x, y]) => P(x, y, 0));
    const ptsT = [p0, p1, p2, p3].map(([x, y]) => P(x, y, DH));
    st.doorLeaf.setAttribute("d", poly(hull(ptsT.concat(ptsB))));
    st.doorCrease.setAttribute("d", open([ptsT[0], ptsT[1], ptsT[2]]));
    place(st.handle, P(xh + (DW - 3) * cosT + DT * sinT, -(DW - 3) * sinT + DT * cosT, DH * 0.48));
  }

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    for (let i = 0; i < N; i++) {
      const st = stations[i];
      drawDoor(st, tval(st.angle, now));
      if (!tdone(st.angle, now)) moving = true;
    }
    return moving;
  });
  bag.add(loop.unregister);

  let activeDoor = -1;

  function setActive(picked) {
    if (picked === activeDoor) return;
    const now = performance.now();
    activeDoor = picked;

    if (picked < 0) {
      read.textContent = "rest";
      restDot.setAttribute("class", "dot");
    } else {
      const st = stations[picked];
      read.textContent = `${st.name} ${st.w}% · +${st.pts}/20 · pass 10/20`;
      restDot.setAttribute("class", "dot off");
    }

    for (let i = 0; i < N; i++) {
      const st = stations[i], isPick = i === picked;
      const dist = picked < 0 ? 0 : Math.abs(i - picked);
      const targetDeg = picked < 0 ? 0 : (isPick ? 78 : Math.max(0, 24 - dist * 14)) * (intensity / 50);
      tset(st.angle, targetDeg, now, picked < 0 ? (N - 1 - i) * 30 : dist * 60);

      st.doorLeaf.classList.toggle("hi", isPick);
      st.roomGrp.classList.toggle("hi", isPick);
      st.roomGrp.classList.toggle("lo", !isPick);
      st.handle.setAttribute("class", isPick ? "dot" : "dot m");
    }
    loop.wake();
  }

  bag.add(pointer(stage, { move: (pt) => setActive(hit(pt)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  for (let i = 0; i < N; i++) drawDoor(stations[i], 0);
  read.textContent = "rest";

  return {
    set: (v) => { intensity = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "doors",
  means: "Three OSCE station doors along a clinical corridor: the picked door swings open to reveal its room, neighbors cracking in turn.",
  rules: [1, 2, 4, 8, 9, 10],
  range: [20, 50, 80],
  tour: [[105, 166], [200, 166], [295, 166], null],
  mount,
});
