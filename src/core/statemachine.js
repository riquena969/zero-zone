// Máquina de estados das telas: title ↔ howto, playing ↔ paused,
// levelclear, gameover. Cada estado: { enter(params), exit(), update(dt, snap), render() }.
// O snap de input é amostrado UMA vez por tick pelo main e repassado.

export function createStateMachine(states) {
  let current = null;
  let name = null;

  const machine = {
    get name() {
      return name;
    },
    goto(next, params) {
      if (current && current.exit) current.exit();
      name = next;
      current = states[next];
      if (current && current.enter) current.enter(params);
    },
    update(dt, snap) {
      if (current && current.update) current.update(dt, snap);
    },
    render() {
      if (current && current.render) current.render();
    },
  };
  return machine;
}
